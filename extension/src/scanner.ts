import {
  createFollowerRecord,
  dedupeRecords,
  normalizeUsername,
  type FollowerRecord,
  type ScanError,
} from "../../src/lib/extension-protocol";

const RESERVED_PATHS = new Set([
  "about",
  "accounts",
  "challenge",
  "developer",
  "direct",
  "directory",
  "emails",
  "explore",
  "legal",
  "p",
  "privacy",
  "reel",
  "reels",
  "stories",
  "terms",
  "web",
]);

export interface CountInfo {
  value: number;
  exact: boolean;
}

export interface DialogScanOptions {
  expected?: CountInfo;
  signal: AbortSignal;
  onProgress: (records: FollowerRecord[]) => void;
  stableRounds?: number;
  waitMs?: number;
}

export class ScannerFailure extends Error {
  constructor(public readonly detail: ScanError) {
    super(detail.message);
  }
}

export function parseCountLabel(value: string): CountInfo | undefined {
  const match = value
    .trim()
    .replace(/,/g, "")
    .match(/([0-9]+(?:\.[0-9]+)?)\s*([kmb])?/i);
  if (!match) return undefined;

  const amount = Number(match[1]);
  const suffix = match[2]?.toLowerCase();
  const multiplier =
    suffix === "k" ? 1_000 : suffix === "m" ? 1_000_000 : suffix === "b" ? 1_000_000_000 : 1;
  return {
    value: Math.round(amount * multiplier),
    exact: !suffix,
  };
}

export function usernameFromHref(href: string, base = "https://www.instagram.com/") {
  try {
    const url = new URL(href, base);
    if (url.hostname !== "www.instagram.com" && url.hostname !== "instagram.com")
      return null;
    const segments = url.pathname.split("/").filter(Boolean);
    if (segments.length !== 1) return null;
    const username = normalizeUsername(segments[0]);
    if (!username || RESERVED_PATHS.has(username)) return null;
    return username;
  } catch {
    return null;
  }
}

export function extractRecords(root: ParentNode): FollowerRecord[] {
  const records: FollowerRecord[] = [];
  for (const anchor of root.querySelectorAll<HTMLAnchorElement>("a[href]")) {
    const username = usernameFromHref(anchor.getAttribute("href") ?? "");
    const record = username ? createFollowerRecord(username) : null;
    if (record) records.push(record);
  }
  return dedupeRecords(records);
}

export function findScrollable(root: HTMLElement): HTMLElement | null {
  const candidates = [root, ...root.querySelectorAll<HTMLElement>("div")];
  let best: HTMLElement | null = null;
  let bestRange = 0;

  for (const candidate of candidates) {
    const range = candidate.scrollHeight - candidate.clientHeight;
    const overflow = getComputedStyle(candidate).overflowY;
    if (range > bestRange && (overflow === "auto" || overflow === "scroll")) {
      best = candidate;
      bestRange = range;
    }
  }

  if (best) return best;
  return candidates.reduce<HTMLElement | null>((current, candidate) => {
    const candidateRange = candidate.scrollHeight - candidate.clientHeight;
    const currentRange = current
      ? current.scrollHeight - current.clientHeight
      : 0;
    return candidateRange > currentRange ? candidate : current;
  }, null);
}

export function detectInstagramError(text: string): ScanError | null {
  const normalized = text.toLowerCase();
  if (
    normalized.includes("try again later") ||
    normalized.includes("please wait a few minutes") ||
    normalized.includes("we restrict certain activity")
  ) {
    return {
      code: "rate_limited",
      message: "Instagram asked us to slow down. Wait a little, then try again.",
      retryable: true,
    };
  }
  return null;
}

function waitForMutation(root: Node, waitMs: number, signal: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    if (signal.aborted) {
      reject(signal.reason);
      return;
    }

    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      observer.disconnect();
      clearTimeout(timeout);
      signal.removeEventListener("abort", abort);
      resolve();
    };
    const abort = () => {
      if (settled) return;
      settled = true;
      observer.disconnect();
      clearTimeout(timeout);
      reject(signal.reason);
    };
    const observer = new MutationObserver(finish);
    const timeout = window.setTimeout(finish, waitMs);
    observer.observe(root, { childList: true, subtree: true });
    signal.addEventListener("abort", abort, { once: true });
  });
}

export async function scanDialog(
  dialog: HTMLElement,
  options: DialogScanOptions,
): Promise<FollowerRecord[]> {
  const records = new Map<string, FollowerRecord>();
  const roundsToStop = options.stableRounds ?? 5;
  const waitMs = options.waitMs ?? 650;
  let stableRounds = 0;
  let lastReportedSize = -1;

  while (!options.signal.aborted) {
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

    const error = detectInstagramError(
      document.body.innerText ?? document.body.textContent ?? "",
    );
    if (error) throw new ScannerFailure(error);

    const before = records.size;
    for (const record of extractRecords(dialog)) records.set(record.username, record);

    if (records.size !== lastReportedSize) {
      lastReportedSize = records.size;
      options.onProgress([...records.values()]);
    }

    if (options.expected?.exact && records.size >= options.expected.value) break;
    stableRounds = records.size === before ? stableRounds + 1 : 0;
    if (stableRounds >= roundsToStop) break;

    const scroller = findScrollable(dialog);
    if (scroller) {
      scroller.scrollTop = scroller.scrollHeight;
      scroller.dispatchEvent(new Event("scroll", { bubbles: true }));
    }
    await waitForMutation(dialog, waitMs, options.signal);
  }

  if (options.signal.aborted) throw options.signal.reason;

  const result = [...records.values()];
  if (options.expected?.exact && result.length !== options.expected.value) {
    throw new ScannerFailure({
      code: "incomplete_scan",
      message:
        "Instagram showed " +
        options.expected.value.toLocaleString() +
        " accounts, but only " +
        result.length.toLocaleString() +
        " loaded. Keep Instagram open and try again.",
      retryable: true,
    });
  }

  return result;
}

export async function waitForValue<T>(
  find: () => T | null,
  signal: AbortSignal,
  timeoutMs = 12_000,
): Promise<T> {
  const existing = find();
  if (existing) return existing;

  return new Promise<T>((resolve, reject) => {
    let settled = false;
    const finish = (value: T) => {
      if (settled) return;
      settled = true;
      observer.disconnect();
      clearTimeout(timeout);
      signal.removeEventListener("abort", abort);
      resolve(value);
    };
    const abort = () => {
      if (settled) return;
      settled = true;
      observer.disconnect();
      clearTimeout(timeout);
      reject(signal.reason);
    };
    const observer = new MutationObserver(() => {
      const value = find();
      if (value) finish(value);
    });
    const timeout = window.setTimeout(() => {
      if (settled) return;
      settled = true;
      observer.disconnect();
      signal.removeEventListener("abort", abort);
      reject(
        new ScannerFailure({
          code: "page_changed",
          message: "Instagram’s page looks different right now. Reload Instagram and try again.",
          retryable: true,
        }),
      );
    }, timeoutMs);
    observer.observe(document.documentElement, { childList: true, subtree: true });
    signal.addEventListener("abort", abort, { once: true });
  });
}
