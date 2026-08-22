export interface ChromeDebuggerTransport {
  getTargets(): Promise<chrome.debugger.TargetInfo[]>;
  attach(target: chrome.debugger.Debuggee, requiredVersion: string): Promise<void>;
  detach(target: chrome.debugger.Debuggee): Promise<void>;
  sendCommand(
    target: chrome.debugger.Debuggee,
    method: string,
    commandParams?: object,
  ): Promise<unknown>;
}

export interface WheelInput {
  x: number;
  y: number;
  deltaY: number;
}

export interface CdpDialogObservation {
  hrefs: string[];
  target: WheelInput;
}

interface AxValue { value?: unknown }
interface AxProperty { name: string; value?: AxValue }
interface AxNode {
  nodeId: string;
  childIds?: string[];
  role?: AxValue;
  name?: AxValue;
  properties?: AxProperty[];
}

const RESERVED_NAMES = new Set([
  "about", "accounts", "direct", "explore", "p", "reel", "reels", "stories", "web",
]);

function axText(value?: AxValue) {
  return typeof value?.value === "string" ? value.value.trim() : "";
}

export function extractRelationHrefs(nodes: AxNode[], relation: "followers" | "following") {
  const byId = new Map(nodes.map((node) => [node.nodeId, node]));
  const descendants = (root: AxNode) => {
    const seen = new Set<string>();
    const queue = [...(root.childIds ?? [])];
    while (queue.length > 0) {
      const id = queue.shift();
      if (!id || seen.has(id)) continue;
      seen.add(id);
      queue.push(...(byId.get(id)?.childIds ?? []));
    }
    return [...seen].flatMap((id) => byId.get(id) ?? []);
  };
  const dialog = nodes.find((node) => {
    if (axText(node.role).toLowerCase() !== "dialog") return false;
    return descendants(node).some((child) =>
      axText(child.role).toLowerCase() === "heading" &&
      axText(child.name).toLowerCase() === relation,
    );
  });
  if (!dialog) return [];

  return [...new Set(descendants(dialog).flatMap((node) => {
    if (axText(node.role).toLowerCase() !== "link") return [];
    const url = node.properties
      ?.find((property) => property.name === "url")
      ?.value?.value;
    if (typeof url === "string") {
      try {
        const parsed = new URL(url, "https://www.instagram.com/");
        const segments = parsed.pathname.split("/").filter(Boolean);
        if (/^(www\.)?instagram\.com$/.test(parsed.hostname) && segments.length === 1) {
          return [parsed.href];
        }
      } catch { /* use the accessible name fallback */ }
    }
    const name = axText(node.name).toLowerCase();
    if (/^[a-z0-9._]{1,30}$/.test(name) && !RESERVED_NAMES.has(name)) {
      return [`https://www.instagram.com/${name}/`];
    }
    return [];
  }))];
}

const PROTOCOL_VERSION = "1.3";

export class CdpInputDriver {
  private readonly attachedTabs = new Set<number>();

  constructor(private readonly transport: ChromeDebuggerTransport) {}

  private async ensureAttached(tabId: number) {
    if (this.attachedTabs.has(tabId)) return;
    const target = { tabId };
    const existing = (await this.transport.getTargets())
      .find((candidate) => candidate.tabId === tabId && candidate.attached);
    if (existing) {
      try {
        await this.transport.sendCommand(target, "Runtime.evaluate", {
          expression: "void 0",
        });
        this.attachedTabs.add(tabId);
        return;
      } catch (error) {
        throw new Error(
          "Chrome could not start browser-level input. Close DevTools or any other debugger attached to Instagram, then try again.",
          { cause: error },
        );
      }
    }
    try {
      await this.transport.attach(target, PROTOCOL_VERSION);
      this.attachedTabs.add(tabId);
    } catch (error) {
      throw new Error(
        "Chrome could not start browser-level input. Close DevTools or any other debugger attached to Instagram, then try again.",
        { cause: error },
      );
    }
  }

  async wheel(tabId: number, input: WheelInput) {
    await this.ensureAttached(tabId);
    await this.transport.sendCommand(
      { tabId },
      "Input.dispatchMouseEvent",
      {
        type: "mouseWheel",
        x: Math.round(input.x),
        y: Math.round(input.y),
        deltaX: 0,
        deltaY: Math.round(input.deltaY),
        pointerType: "mouse",
      },
    );
  }

  async step(
    tabId: number,
    relation: "followers" | "following",
    recoveryLevel = 0,
  ) {
    await this.ensureAttached(tabId);
    const expression = `(() => {
      const relation = ${JSON.stringify(relation)};
      const dialogs = [...document.querySelectorAll('[role="dialog"]')];
      const dialog = dialogs.find((candidate) => {
        const rect = candidate.getBoundingClientRect();
        const heading = candidate.querySelector('h1,h2,h3,[role="heading"]');
        return rect.width >= 40 && rect.height >= 40 &&
          heading?.textContent?.trim().toLowerCase() === relation;
      });
      if (!dialog) return null;
      const rect = dialog.getBoundingClientRect();
      const hrefs = [...document.querySelectorAll('a[href]')].flatMap((anchor) => {
        const anchorRect = anchor.getBoundingClientRect();
        if (anchorRect.width < 2 || anchorRect.height < 2) return [];
        const x = anchorRect.left + anchorRect.width / 2;
        const y = anchorRect.top + anchorRect.height / 2;
        if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) return [];
        try {
          const url = new URL(anchor.href, location.href);
          const segments = url.pathname.split('/').filter(Boolean);
          if (!/^(www\\.)?instagram\\.com$/.test(url.hostname) || segments.length !== 1) return [];
          return [url.href];
        } catch { return []; }
      });
      return {
        hrefs: [...new Set(hrefs)],
        target: {
          x: Math.min(innerWidth - 2, Math.max(2, rect.left + rect.width / 2)),
          y: Math.min(innerHeight - 2, Math.max(2, rect.top + rect.height * 0.72)),
          deltaY: Math.round(Math.max(360, Math.min(720, rect.height * 0.82))),
        },
      };
    })()`;
    const response = await this.transport.sendCommand(
      { tabId },
      "Runtime.evaluate",
      { expression, returnByValue: true },
    ) as { result?: { value?: CdpDialogObservation | null } };
    const observation = response.result?.value;
    if (!observation) {
      throw new Error("Chrome could not ground the visible Instagram relation dialog.");
    }
    const axResponse = await this.transport.sendCommand(
      { tabId },
      "Accessibility.getFullAXTree",
    ) as { nodes?: AxNode[] };
    const hrefs = [
      ...new Set([
        ...observation.hrefs,
        ...extractRelationHrefs(axResponse.nodes ?? [], relation),
      ]),
    ];
    if (recoveryLevel >= 2) {
      await this.transport.sendCommand(
        { tabId },
        "Runtime.evaluate",
        {
          expression: `(() => {
            const dialog = [...document.querySelectorAll('[role="dialog"]')]
              .find((candidate) => candidate.getBoundingClientRect().width >= 40 &&
                candidate.querySelector('h1,h2,h3,[role="heading"]')
                  ?.textContent?.trim().toLowerCase() === ${JSON.stringify(relation)});
            if (!dialog) return false;
            const candidates = [dialog, ...dialog.querySelectorAll('*')];
            const scroller = candidates.sort((a, b) =>
              (b.scrollHeight - b.clientHeight) - (a.scrollHeight - a.clientHeight),
            )[0];
            const before = scroller.scrollTop;
            scroller.scrollTop = Math.min(
              scroller.scrollHeight - scroller.clientHeight,
              before + Math.max(scroller.clientHeight * 0.9, 480),
            );
            scroller.dispatchEvent(new Event('scroll', { bubbles: true }));
            return scroller.scrollTop > before;
          })()`,
          returnByValue: true,
        },
      );
    }
    const wheelCount = recoveryLevel === 0 ? 1 : recoveryLevel >= 3 ? 3 : 2;
    const deltaScale = recoveryLevel === 0 ? 1 : 1.35;
    for (let index = 0; index < wheelCount; index += 1) {
      await this.wheel(tabId, {
        ...observation.target,
        deltaY: observation.target.deltaY * deltaScale,
      });
    }
    return { ...observation, hrefs };
  }

  async detach(tabId: number) {
    this.attachedTabs.delete(tabId);
    await this.transport.detach({ tabId }).catch(() => undefined);
  }

  markDetached(tabId: number) {
    this.attachedTabs.delete(tabId);
  }
}
