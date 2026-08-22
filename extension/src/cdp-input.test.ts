import { describe, expect, it, vi } from "vitest";
import { CdpInputDriver, extractRelationHrefs, type ChromeDebuggerTransport } from "./cdp-input";

function transport(): ChromeDebuggerTransport {
  return {
    getTargets: vi.fn().mockResolvedValue([]),
    attach: vi.fn().mockResolvedValue(undefined),
    detach: vi.fn().mockResolvedValue(undefined),
    sendCommand: vi.fn().mockResolvedValue(undefined),
  };
}

describe("CDP input driver", () => {
  it("scopes accessible profile links to the requested dialog", () => {
    const nodes = [
      { nodeId: "1", role: { value: "dialog" }, childIds: ["2", "3"] },
      { nodeId: "2", role: { value: "heading" }, name: { value: "Followers" } },
      { nodeId: "3", role: { value: "link" }, name: { value: "ani" } },
      { nodeId: "4", role: { value: "link" }, name: { value: "outside" } },
    ];

    expect(extractRelationHrefs(nodes, "followers")).toEqual([
      "https://www.instagram.com/ani/",
    ]);
  });

  it("attaches once and dispatches browser-level wheel input", async () => {
    const api = transport();
    const driver = new CdpInputDriver(api);

    await driver.wheel(42, { x: 120.4, y: 340.6, deltaY: 481.2 });
    await driver.wheel(42, { x: 120, y: 340, deltaY: 300 });

    expect(api.attach).toHaveBeenCalledOnce();
    expect(api.sendCommand).toHaveBeenNthCalledWith(
      1,
      { tabId: 42 },
      "Input.dispatchMouseEvent",
      {
        type: "mouseWheel",
        x: 120,
        y: 341,
        deltaX: 0,
        deltaY: 481,
        pointerType: "mouse",
      },
    );
  });

  it("detaches after a scan and can attach again", async () => {
    const api = transport();
    const driver = new CdpInputDriver(api);

    await driver.wheel(42, { x: 1, y: 2, deltaY: 3 });
    await driver.detach(42);
    await driver.wheel(42, { x: 1, y: 2, deltaY: 3 });

    expect(api.detach).toHaveBeenCalledWith({ tabId: 42 });
    expect(api.attach).toHaveBeenCalledTimes(2);
  });

  it("recovers an owned attachment after service-worker suspension", async () => {
    const api = transport();
    vi.mocked(api.getTargets).mockResolvedValueOnce([
      { id: "target", type: "page", title: "Instagram", url: "https://www.instagram.com/", attached: true, tabId: 42 },
    ]);
    const driver = new CdpInputDriver(api);

    await driver.wheel(42, { x: 1, y: 2, deltaY: 3 });

    expect(api.attach).not.toHaveBeenCalled();
    expect(api.sendCommand).toHaveBeenNthCalledWith(
      1,
      { tabId: 42 },
      "Runtime.evaluate",
      { expression: "void 0" },
    );
  });

  it("grounds a relation in the main world before scrolling", async () => {
    const api = transport();
    vi.mocked(api.sendCommand)
      .mockResolvedValueOnce({
        result: {
          value: {
            hrefs: ["https://www.instagram.com/ani/"],
            target: { x: 300, y: 500, deltaY: 420 },
          },
        },
      })
      .mockResolvedValueOnce({
        nodes: [
          { nodeId: "1", role: { value: "dialog" }, childIds: ["2", "3"] },
          { nodeId: "2", role: { value: "heading" }, name: { value: "Followers" } },
          { nodeId: "3", role: { value: "link" }, name: { value: "mira" } },
        ],
      })
      .mockResolvedValueOnce(undefined);
    const driver = new CdpInputDriver(api);

    const observation = await driver.step(42, "followers");

    expect(observation.hrefs).toEqual([
      "https://www.instagram.com/ani/",
      "https://www.instagram.com/mira/",
    ]);
    expect(api.sendCommand).toHaveBeenNthCalledWith(
      3,
      { tabId: 42 },
      "Input.dispatchMouseEvent",
      expect.objectContaining({ type: "mouseWheel", deltaY: 420 }),
    );
  });

  it("nudges the scroll owner during bounded recovery", async () => {
    const api = transport();
    vi.mocked(api.sendCommand)
      .mockResolvedValueOnce({
        result: {
          value: {
            hrefs: [],
            target: { x: 300, y: 500, deltaY: 400 },
          },
        },
      })
      .mockResolvedValueOnce({ nodes: [] })
      .mockResolvedValueOnce({ result: { value: true } })
      .mockResolvedValue(undefined);
    const driver = new CdpInputDriver(api);

    await driver.step(42, "followers", 2);

    expect(api.sendCommand).toHaveBeenCalledTimes(5);
    expect(api.sendCommand).toHaveBeenNthCalledWith(
      3,
      { tabId: 42 },
      "Runtime.evaluate",
      expect.objectContaining({ returnByValue: true }),
    );
    expect(api.sendCommand).toHaveBeenNthCalledWith(
      4,
      { tabId: 42 },
      "Input.dispatchMouseEvent",
      expect.objectContaining({ deltaY: 540 }),
    );
  });

  it("explains debugger attachment conflicts", async () => {
    const api = transport();
    vi.mocked(api.attach).mockRejectedValueOnce(new Error("already attached"));
    const driver = new CdpInputDriver(api);

    await expect(
      driver.wheel(42, { x: 1, y: 2, deltaY: 3 }),
    ).rejects.toThrow("Close DevTools or any other debugger");
  });
});
