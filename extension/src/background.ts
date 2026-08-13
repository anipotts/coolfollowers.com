import {
  PROTOCOL_VERSION,
  applyScanProgress,
  classifyRelationships,
  emptyScanState,
  isActiveScanPhase,
  type ScanState,
  type WebRequest,
} from "../../src/lib/extension-protocol";
import type { InternalMessage } from "./internal";

const STORAGE_KEY = "coolfollowersScanState";
const SITE_URLS = [
  "https://coolfollowers.com/*",
  "http://localhost/*",
  "http://127.0.0.1/*",
];

type BackgroundMessage =
  | WebRequest
  | InternalMessage
  | { type: "COOLFOLLOWERS_BRIDGE_READY" };

async function getState(): Promise<ScanState> {
  const stored = await chrome.storage.session.get(STORAGE_KEY);
  const state = stored[STORAGE_KEY] as ScanState | undefined;
  return state?.version === PROTOCOL_VERSION ? state : emptyScanState();
}

async function setState(state: ScanState) {
  await chrome.storage.session.set({ [STORAGE_KEY]: state });
  const tabs = await chrome.tabs.query({ url: SITE_URLS });
  await Promise.allSettled(
    tabs
      .filter((tab) => tab.id !== undefined)
      .map((tab) =>
        chrome.tabs.sendMessage(tab.id as number, {
          type: "COOLFOLLOWERS_STATE_UPDATE",
          state,
        }),
      ),
  );
  return state;
}

async function findInstagramTab() {
  const tabs = await chrome.tabs.query({ url: "https://www.instagram.com/*" });
  return tabs.find((tab) => tab.id !== undefined) ?? null;
}

async function waitForTab(tabId: number) {
  const current = await chrome.tabs.get(tabId);
  if (current.status === "complete") return;
  await new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => {
      chrome.tabs.onUpdated.removeListener(listener);
      reject(new Error("Instagram took too long to load"));
    }, 20_000);
    const listener = (updatedId: number, info: { status?: string }) => {
      if (updatedId !== tabId || info.status !== "complete") return;
      clearTimeout(timeout);
      chrome.tabs.onUpdated.removeListener(listener);
      resolve();
    };
    chrome.tabs.onUpdated.addListener(listener);
  });
}

async function sendScannerStart(tabId: number) {
  for (let attempt = 0; attempt < 6; attempt += 1) {
    try {
      await chrome.tabs.sendMessage(tabId, { type: "SCANNER_START" } satisfies InternalMessage);
      return;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 300));
    }
  }
  throw new Error("The Instagram scanner did not start");
}

async function startScan() {
  const state = await setState({
    ...emptyScanState(),
    phase: "starting",
    updatedAt: Date.now(),
  });

  try {
    const existing = await findInstagramTab();
    const tab = existing ?? (await chrome.tabs.create({ url: "https://www.instagram.com/" }));
    if (tab.id === undefined) throw new Error("Instagram tab was not created");
    await chrome.tabs.update(tab.id, { active: true });
    await waitForTab(tab.id);
    await sendScannerStart(tab.id);
    return state;
  } catch {
    return setState({
      ...state,
      phase: "error",
      error: {
        code: "interrupted",
        message: "Instagram did not open correctly. Open Instagram in Chrome, then try again.",
        retryable: true,
      },
      updatedAt: Date.now(),
    });
  }
}

async function cancelScan() {
  const tabs = await chrome.tabs.query({ url: "https://www.instagram.com/*" });
  await Promise.allSettled(
    tabs
      .filter((tab) => tab.id !== undefined)
      .map((tab) =>
        chrome.tabs.sendMessage(tab.id as number, {
          type: "SCANNER_CANCEL",
        } satisfies InternalMessage),
      ),
  );
  return setState({
    ...emptyScanState(),
    phase: "cancelled",
    updatedAt: Date.now(),
  });
}

chrome.runtime.onMessage.addListener(
  (message: BackgroundMessage, _sender, sendResponse) => {
    void (async () => {
      if (message.type === "COOLFOLLOWERS_BRIDGE_READY") {
        sendResponse(await getState());
        return;
      }

      if (message.type === "COOLFOLLOWERS_GET_STATE") {
        sendResponse(await getState());
        return;
      }

      if (message.type === "COOLFOLLOWERS_START_SCAN") {
        sendResponse(await startScan());
        return;
      }

      if (message.type === "COOLFOLLOWERS_CANCEL_SCAN") {
        sendResponse(await cancelScan());
        return;
      }

      if (message.type === "COOLFOLLOWERS_CLEAR") {
        await chrome.storage.session.remove(STORAGE_KEY);
        sendResponse(await setState(emptyScanState()));
        return;
      }

      if (message.type === "SCANNER_READY") {
        const state = await getState();
        if (isActiveScanPhase(state.phase) && _sender.tab?.id !== undefined) {
          await sendScannerStart(_sender.tab.id);
        }
        sendResponse(state);
        return;
      }

      if (message.type === "SCANNER_PROGRESS") {
        const state = await getState();
        const nextState = applyScanProgress(state, message);
        sendResponse(await setState(nextState));
        return;
      }

      if (message.type === "SCANNER_COMPLETE") {
        const { cools, fools } = classifyRelationships(
          message.followers,
          message.following,
        );
        sendResponse(
          await setState({
            version: PROTOCOL_VERSION,
            phase: "complete",
            username: message.username,
            collected: message.followers.length + message.following.length,
            followers: undefined,
            following: undefined,
            cools,
            fools,
            updatedAt: Date.now(),
          }),
        );
        return;
      }

      if (message.type === "SCANNER_ERROR") {
        const state = await getState();
        sendResponse(
          await setState({
            ...state,
            phase: "error",
            error: message.error,
            updatedAt: Date.now(),
          }),
        );
      }
    })();
    return true;
  },
);

chrome.runtime.onInstalled.addListener(() => {
  void chrome.storage.session.setAccessLevel({
    accessLevel: "TRUSTED_CONTEXTS",
  });
});
