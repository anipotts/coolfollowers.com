import { describe, expect, it, vi } from "vitest";
import {
  advanceDialog,
  detectInstagramError,
  extractDialogRecords,
  extractRecords,
  findRelationDialog,
  findScrollable,
  observeDialog,
  parseCountLabel,
  scanDialog,
  usernameFromHref,
  waitForValue,
} from "./scanner";

function setupAnimationFrame() {
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
    callback(0);
    return 1;
  });
}

describe("Instagram DOM parsing", () => {
  it("parses exact and abbreviated totals", () => {
    expect(parseCountLabel("1,234 followers")).toEqual({ value: 1234, exact: true });
    expect(parseCountLabel("2.5K following")).toEqual({ value: 2500, exact: false });
    expect(parseCountLabel("followers")).toBeUndefined();
  });

  it("accepts profile links and rejects reserved or nested Instagram paths", () => {
    expect(usernameFromHref("/Ani.Potts/")).toBe("ani.potts");
    expect(usernameFromHref("/explore/")).toBeNull();
    expect(usernameFromHref("/p/abc/")).toBeNull();
    expect(usernameFromHref("https://example.com/ani/")).toBeNull();
  });

  it("extracts normalized, deduplicated profile records", () => {
    const root = document.createElement("div");
    root.innerHTML = '<a href="/Ani/">one</a><a href="/ani/">two</a><a href="/p/post/">post</a>';
    expect(extractRecords(root)).toEqual([
      { username: "ani", profileUrl: "https://www.instagram.com/ani/" },
    ]);
  });

  it("recognizes Instagram rate limits", () => {
    expect(detectInstagramError("Please wait a few minutes before you try again")?.code).toBe(
      "rate_limited",
    );
    expect(detectInstagramError("followers")).toBeNull();
  });

  it("grounds the requested relation dialog by its accessible heading", () => {
    document.body.innerHTML = `
      <div role="dialog"><h2>Messages</h2></div>
      <div role="dialog"><h1>Followers</h1><a href="/ani/">ani</a></div>
    `;
    const dialogs = document.querySelectorAll<HTMLElement>('[role="dialog"]');
    dialogs[0].getBoundingClientRect = () => ({
      x: 0, y: 0, left: 0, top: 0, right: 0, bottom: 0,
      width: 0, height: 0, toJSON: () => undefined,
    });
    dialogs[1].getBoundingClientRect = () => ({
      x: 100, y: 100, left: 100, top: 100, right: 600, bottom: 700,
      width: 500, height: 600, toJSON: () => undefined,
    });

    expect(findRelationDialog("followers")?.textContent).toContain("ani");
    expect(findRelationDialog("following")).toBeNull();
  });

  it("collects visible portal rows rendered beside the dialog node", () => {
    document.body.innerHTML = `
      <div role="dialog"><h1>Followers</h1></div>
      <div class="portal-row"><a href="/ani/"><span>ani</span></a></div>
    `;
    const dialog = document.querySelector<HTMLElement>('[role="dialog"]');
    const anchor = document.querySelector<HTMLAnchorElement>("a");
    if (!dialog || !anchor) throw new Error("test dialog missing");
    dialog.getBoundingClientRect = () => ({
      x: 100, y: 100, left: 100, top: 100, right: 600, bottom: 700,
      width: 500, height: 600, toJSON: () => undefined,
    });
    anchor.getBoundingClientRect = () => ({
      x: 180, y: 180, left: 180, top: 180, right: 300, bottom: 220,
      width: 120, height: 40, toJSON: () => undefined,
    });
    expect(extractDialogRecords(dialog).map((record) => record.username)).toEqual(["ani"]);
  });
});

describe("dialog scanning", () => {
  it("grounds wheel input inside the visible dialog", () => {
    document.body.innerHTML = '<div role="dialog"><a href="/ani/">ani</a></div>';
    const dialog = document.querySelector<HTMLElement>('[role="dialog"]');
    if (!dialog) throw new Error("test dialog missing");
    dialog.getBoundingClientRect = () => ({
      x: 100,
      y: 80,
      left: 100,
      top: 80,
      right: 600,
      bottom: 680,
      width: 500,
      height: 600,
      toJSON: () => undefined,
    });

    expect(observeDialog(dialog).target).toEqual({
      x: 350,
      y: 512,
      deltaY: 492,
    });
  });

  it("collects recycled rows after browser-level wheel input", async () => {
    setupAnimationFrame();
    document.body.innerHTML = '<div role="dialog"><a href="/ani/">ani</a></div>';
    const dialog = document.querySelector<HTMLElement>('[role="dialog"]');
    if (!dialog) throw new Error("test dialog missing");
    const drive = vi.fn(async () => {
      dialog.innerHTML = '<a href="/mira/">mira</a>';
    });

    const records = await scanDialog(dialog, {
      expected: { value: 2, exact: true },
      signal: new AbortController().signal,
      onProgress: vi.fn(),
      drive,
      waitMs: 1,
    });

    expect(records.map((record) => record.username)).toEqual(["ani", "mira"]);
    expect(drive).toHaveBeenCalledOnce();
  });

  it("finds a non-div virtualized list owner", () => {
    document.body.innerHTML = '<div role="dialog"><section class="list" style="overflow-y:auto"><a href="/ani/">ani</a></section></div>';
    const dialog = document.querySelector<HTMLElement>('[role="dialog"]');
    const list = document.querySelector<HTMLElement>(".list");
    if (!dialog || !list) throw new Error("test dialog missing");
    Object.defineProperties(list, {
      clientHeight: { value: 100 },
      scrollHeight: { value: 1_000 },
    });

    expect(findScrollable(dialog)).toBe(list);
  });

  it("keeps the last visible profile in view while advancing", () => {
    document.body.innerHTML = '<div role="dialog"><div class="list" style="overflow-y:auto"><a href="/ani/">ani</a><a href="/mira/">mira</a></div></div>';
    const dialog = document.querySelector<HTMLElement>('[role="dialog"]');
    const list = document.querySelector<HTMLElement>(".list");
    const last = document.querySelectorAll<HTMLAnchorElement>("a")[1];
    if (!dialog || !list || !last) throw new Error("test dialog missing");
    let scrollTop = 0;
    Object.defineProperties(list, {
      clientHeight: { value: 100 },
      scrollHeight: { value: 1_000 },
      scrollTop: { get: () => scrollTop, set: (value: number) => { scrollTop = value; } },
      scrollTo: { value: ({ top }: ScrollToOptions) => { scrollTop = Number(top); } },
    });
    const scrollIntoView = vi.fn();
    last.scrollIntoView = scrollIntoView;

    expect(advanceDialog(dialog)).toBe(true);
    expect(scrollTop).toBe(420);
    expect(scrollIntoView).toHaveBeenCalledWith({ block: "end", inline: "nearest" });
  });

  it("completes only when an exact total is collected", async () => {
    setupAnimationFrame();
    document.body.innerHTML = '<div role="dialog"><a href="/ani/">ani</a></div>';
    const dialog = document.querySelector<HTMLElement>('[role="dialog"]');
    if (!dialog) throw new Error("test dialog missing");
    const progress = vi.fn();

    const records = await scanDialog(dialog, {
      expected: { value: 1, exact: true },
      signal: new AbortController().signal,
      onProgress: progress,
      stableRounds: 1,
      waitMs: 1,
    });

    expect(records).toHaveLength(1);
    expect(progress).toHaveBeenCalledOnce();
  });

  it("reports incomplete exact totals after a virtualized list stops changing", async () => {
    setupAnimationFrame();
    document.body.innerHTML = '<div role="dialog"><a href="/ani/">ani</a></div>';
    const dialog = document.querySelector<HTMLElement>('[role="dialog"]');
    if (!dialog) throw new Error("test dialog missing");

    await expect(
      scanDialog(dialog, {
        expected: { value: 2, exact: true },
        signal: new AbortController().signal,
        onProgress: vi.fn(),
        stableRounds: 1,
        waitMs: 1,
      }),
    ).rejects.toMatchObject({
      detail: { code: "incomplete_scan" },
    });
  });

  it("recognizes the real bottom of a browser-clamped scroll container", async () => {
    setupAnimationFrame();
    document.body.innerHTML = '<div role="dialog"><div class="list" style="overflow-y:scroll"><a href="/ani/">ani</a></div></div>';
    const dialog = document.querySelector<HTMLElement>('[role="dialog"]');
    const list = document.querySelector<HTMLElement>(".list");
    if (!dialog || !list) throw new Error("test dialog missing");
    Object.defineProperties(list, {
      clientHeight: { value: 100 },
      scrollHeight: { value: 1_000 },
      scrollTop: { get: () => 900, set: () => undefined },
    });

    await expect(
      scanDialog(dialog, {
        expected: { value: 3, exact: true },
        signal: new AbortController().signal,
        onProgress: vi.fn(),
        stableRounds: 1,
        waitMs: 1,
      }),
    ).rejects.toMatchObject({ detail: { code: "incomplete_scan" } });
  });

  it("can finish when Instagram withholds one following profile", async () => {
    setupAnimationFrame();
    document.body.innerHTML = '<div role="dialog"><a href="/ani/">ani</a></div>';
    const dialog = document.querySelector<HTMLElement>('[role="dialog"]');
    if (!dialog) throw new Error("test dialog missing");

    const records = await scanDialog(dialog, {
      expected: { value: 2, exact: true },
      signal: new AbortController().signal,
      onProgress: vi.fn(),
      stableRounds: 1,
      terminalShortfallLimit: 1,
      waitMs: 1,
    });

    expect(records.map((record) => record.username)).toEqual(["ani"]);
  });

  it("deduplicates restored checkpoints while a resumed dialog catches up", async () => {
    setupAnimationFrame();
    document.body.innerHTML = '<div role="dialog"><a href="/ani/">ani</a><a href="/mira/">mira</a></div>';
    const dialog = document.querySelector<HTMLElement>('[role="dialog"]');
    if (!dialog) throw new Error("test dialog missing");

    const records = await scanDialog(dialog, {
      expected: { value: 2, exact: true },
      initialRecords: [
        { username: "ani", profileUrl: "https://www.instagram.com/ani/" },
      ],
      signal: new AbortController().signal,
      onProgress: vi.fn(),
      stableRounds: 1,
      waitMs: 1,
    });

    expect(records.map((record) => record.username)).toEqual(["ani", "mira"]);
  });

  it("stops when an interrupted scan is aborted", async () => {
    setupAnimationFrame();
    document.body.innerHTML = '<div role="dialog"></div>';
    const dialog = document.querySelector<HTMLElement>('[role="dialog"]');
    if (!dialog) throw new Error("test dialog missing");
    const controller = new AbortController();
    const reason = new DOMException("cancelled", "AbortError");
    controller.abort(reason);

    await expect(
      scanDialog(dialog, {
        signal: controller.signal,
        onProgress: vi.fn(),
      }),
    ).rejects.toBe(reason);
  });

  it("times out when Instagram structure is unsupported", async () => {
    document.body.innerHTML = "<main></main>";
    await expect(
      waitForValue(() => document.querySelector("[role=dialog]"), new AbortController().signal, 1),
    ).rejects.toMatchObject({
      detail: { code: "page_changed" },
    });
  });
});
