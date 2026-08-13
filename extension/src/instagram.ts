import {
  parseCountLabel,
  scanDialog,
  ScannerFailure,
  waitForValue,
} from "./scanner";
import type { InternalMessage } from "./internal";
import type {
  FollowerRecord,
  ScanError,
} from "../../src/lib/extension-protocol";

let activeController: AbortController | null = null;

function send(message: InternalMessage) {
  return chrome.runtime.sendMessage(message).catch(() => undefined);
}

function currentProfilePath() {
  const followersLink = document.querySelector<HTMLAnchorElement>(
    'a[href*="/followers/"]',
  );
  const href = followersLink?.getAttribute("href");
  if (!href) return null;
  const parts = href.split("/").filter(Boolean);
  return parts.length >= 2 ? "/" + parts[0] + "/" : null;
}

function findProfilePath() {
  const current = currentProfilePath();
  if (current) return current;

  const profileImage = document.querySelector<HTMLImageElement>(
    'nav img[alt*="profile picture" i], a img[alt*="profile picture" i]',
  );
  const profileLink = profileImage?.closest<HTMLAnchorElement>('a[href^="/"]');
  const href = profileLink?.getAttribute("href");
  if (!href) return null;
  const parts = href.split("/").filter(Boolean);
  return parts.length === 1 ? "/" + parts[0] + "/" : null;
}

function relationLink(kind: "followers" | "following") {
  return document.querySelector<HTMLAnchorElement>(
    'a[href*="/' + kind + '/"]',
  );
}

function countFromLink(link: HTMLAnchorElement) {
  const labels = [
    link.getAttribute("title"),
    link.getAttribute("aria-label"),
    link.textContent,
  ].filter((value): value is string => Boolean(value));
  for (const label of labels) {
    const count = parseCountLabel(label);
    if (count) return count;
  }
  return undefined;
}

async function openDialog(
  kind: "followers" | "following",
  signal: AbortSignal,
) {
  const link = await waitForValue(() => relationLink(kind), signal);
  const expected = countFromLink(link);
  link.click();
  const dialog = await waitForValue(
    () => document.querySelector<HTMLElement>('[role="dialog"]'),
    signal,
  );
  return { dialog, expected };
}

async function closeDialog(signal: AbortSignal) {
  document.dispatchEvent(
    new KeyboardEvent("keydown", { key: "Escape", code: "Escape", bubbles: true }),
  );

  const closeButton = document.querySelector<HTMLElement>(
    '[role="dialog"] button[aria-label*="close" i]',
  );
  closeButton?.click();

  const started = Date.now();
  while (document.querySelector('[role="dialog"]')) {
    if (signal.aborted) throw signal.reason;
    if (Date.now() - started > 4_000) {
      throw new ScannerFailure({
        code: "page_changed",
        message: "Instagram did not close the follower list. Reload Instagram and try again.",
        retryable: true,
      });
    }
    await new Promise((resolve) => window.setTimeout(resolve, 100));
  }
}

async function scanRelation(
  kind: "followers" | "following",
  signal: AbortSignal,
): Promise<FollowerRecord[]> {
  const { dialog, expected } = await openDialog(kind, signal);
  if (!expected?.exact) {
    throw new ScannerFailure({
      code: "incomplete_scan",
      message:
        "Instagram did not expose an exact " +
        kind +
        " total, so the scan cannot be verified. Reload Instagram and try again.",
      retryable: true,
    });
  }
  const records = await scanDialog(dialog, {
    expected,
    signal,
    onProgress: (nextRecords) => {
      send({
        type: "SCANNER_PROGRESS",
        phase: kind,
        records: nextRecords,
        expected: expected?.value,
        expectedIsExact: expected?.exact,
      });
    },
  });
  await closeDialog(signal);
  return records;
}

function normalizeFailure(error: unknown): ScanError {
  if (error instanceof ScannerFailure) return error.detail;
  if (error instanceof DOMException && error.name === "AbortError") {
    return {
      code: "interrupted",
      message: "The scan was cancelled.",
      retryable: true,
    };
  }
  return {
    code: "unknown",
    message: "The scan stopped unexpectedly. Reload Instagram and try again.",
    retryable: true,
  };
}

async function startScanner() {
  activeController?.abort(new DOMException("Replaced", "AbortError"));
  const controller = new AbortController();
  activeController = controller;

  try {
    if (
      (document.body.innerText ?? document.body.textContent ?? "")
        .toLowerCase()
        .includes("log in") &&
      !findProfilePath()
    ) {
      throw new ScannerFailure({
        code: "login_required",
        message: "Log into Instagram in this tab, then try again.",
        retryable: true,
      });
    }

    const profilePath = await waitForValue(findProfilePath, controller.signal);
    if (window.location.pathname !== profilePath) {
      window.location.assign(profilePath);
      return;
    }

    const username = profilePath.split("/").filter(Boolean)[0];
    const followers = await scanRelation("followers", controller.signal);
    const following = await scanRelation("following", controller.signal);
    await send({
      type: "SCANNER_COMPLETE",
      username,
      followers,
      following,
    });
  } catch (error) {
    if (controller.signal.aborted) return;
    await send({ type: "SCANNER_ERROR", error: normalizeFailure(error) });
  } finally {
    if (activeController === controller) activeController = null;
  }
}

chrome.runtime.onMessage.addListener((message: InternalMessage) => {
  if (message.type === "SCANNER_START") void startScanner();
  if (message.type === "SCANNER_CANCEL") {
    activeController?.abort(new DOMException("Cancelled", "AbortError"));
    activeController = null;
  }
});

void send({ type: "SCANNER_READY" });
