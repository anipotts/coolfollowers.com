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
  initialRecords?: FollowerRecord[];
  signal: AbortSignal;
  onProgress: (records: FollowerRecord[]) => void;
  stableRounds?: number;
  terminalShortfallLimit?: number;
  waitMs?: number;
  drive?: (target: ScrollTarget, recoveryLevel: number) => Promise<FollowerRecord[] | void>;
  excludedUsernames?: string[];
}

export interface ScrollTarget {
  x: number;
  y: number;
  deltaY: number;
}

export interface DialogObservation {
  fingerprint: string;
  target: ScrollTarget;
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

export function findRelationControl(kind: "followers" | "following") {
  const main = document.querySelector("main");
  if (!main) return null;
  return (
    [...main.querySelectorAll<HTMLElement>("a, button")].find((element) => {
      const text = element.textContent?.trim().toLowerCase() ?? "";
      return new RegExp("(?:^|\\s)" + kind + "(?:$|\\s)").test(text);
    }) ?? null
  );
}

export function findRelationDialog(kind: "followers" | "following") {
  return [...document.querySelectorAll<HTMLElement>('[role="dialog"]')]
    .find((dialog) => {
      const rect = dialog.getBoundingClientRect();
      const style = getComputedStyle(dialog);
      if (
        rect.width < 40 ||
        rect.height < 40 ||
        style.display === "none" ||
        style.visibility === "hidden"
      ) return false;
      const heading = dialog.querySelector<HTMLElement>(
        'h1, h2, h3, [role="heading"]',
      );
      return heading?.textContent?.trim().toLowerCase() === kind;
    }) ?? null;
}

export function countFromControl(control: HTMLElement) {
  const labels = [
    control.getAttribute("title"),
    control.getAttribute("aria-label"),
    ...[...control.querySelectorAll<HTMLElement>("[title], [aria-label]")].flatMap(
      (element) => [
        element.getAttribute("title"),
        element.getAttribute("aria-label"),
      ],
    ),
    control.textContent,
  ].filter((value): value is string => Boolean(value));
  for (const label of labels) {
    const count = parseCountLabel(label);
    if (count) return count;
  }
  return undefined;
}

export function findScrollable(root: HTMLElement): HTMLElement | null {
  const candidates = [root, ...root.querySelectorAll<HTMLElement>("*")];
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

function profileAnchors(dialog: HTMLElement) {
  const direct = [...dialog.querySelectorAll<HTMLAnchorElement>("a[href]")];
  const dialogRect = dialog.getBoundingClientRect();
  const spatial = dialogRect.width > 40 && dialogRect.height > 40
    ? [...document.querySelectorAll<HTMLAnchorElement>("a[href]")].filter((anchor) => {
        const rect = anchor.getBoundingClientRect();
        if (rect.width < 2 || rect.height < 2) return false;
        const x = rect.left + rect.width / 2;
        const y = rect.top + rect.height / 2;
        if (
          x < dialogRect.left ||
          x > dialogRect.right ||
          y < dialogRect.top ||
          y > dialogRect.bottom
        ) return false;
        return true;
      })
    : [];

  const candidates = spatial.length > 0 ? spatial : direct;

  return candidates
    .filter((anchor) => usernameFromHref(anchor.getAttribute("href") ?? ""));
}

export function extractDialogRecords(dialog: HTMLElement) {
  return dedupeRecords(
    profileAnchors(dialog).flatMap((anchor) => {
      const username = usernameFromHref(anchor.getAttribute("href") ?? "");
      const record = username ? createFollowerRecord(username) : null;
      return record ? [record] : [];
    }),
  );
}

export function observeDialog(dialog: HTMLElement): DialogObservation {
  const anchors = profileAnchors(dialog);
  const scroller = findScrollable(dialog);
  const candidateRect = scroller?.getBoundingClientRect();
  const dialogRect = dialog.getBoundingClientRect();
  const rect = candidateRect && candidateRect.width > 20 && candidateRect.height > 20
    ? candidateRect
    : dialogRect.width > 20 && dialogRect.height > 20
      ? dialogRect
      : null;
  const x = rect
    ? Math.min(window.innerWidth - 2, Math.max(2, rect.left + rect.width / 2))
    : window.innerWidth / 2;
  const y = rect
    ? Math.min(window.innerHeight - 2, Math.max(2, rect.top + rect.height * 0.72))
    : window.innerHeight / 2;
  const usernames = anchors
    .map((anchor) => usernameFromHref(anchor.getAttribute("href") ?? ""))
    .filter((username): username is string => Boolean(username));

  return {
    fingerprint: [
      usernames.at(0) ?? "",
      usernames.at(-1) ?? "",
      usernames.length,
      Math.round(scroller?.scrollTop ?? 0),
    ].join(":"),
    target: {
      x,
      y,
      deltaY: Math.round(Math.max(360, Math.min(720, (rect?.height ?? 520) * 0.82))),
    },
  };
}

export function advanceDialog(dialog: HTMLElement) {
  const scroller = findScrollable(dialog);
  const beforeTop = scroller?.scrollTop ?? 0;

  if (scroller) {
    const maxTop = Math.max(0, scroller.scrollHeight - scroller.clientHeight);
    const nextTop = Math.min(
      maxTop,
      beforeTop + Math.max(scroller.clientHeight * 0.86, 420),
    );
    if (typeof scroller.scrollTo === "function") {
      scroller.scrollTo({ top: nextTop, behavior: "instant" });
    }
    if (scroller.scrollTop === beforeTop && nextTop > beforeTop) {
      scroller.scrollTop = nextTop;
    }
    scroller.dispatchEvent(new Event("scroll", { bubbles: true }));
  }

  // Instagram changes the element that owns scrolling as its virtualized list
  // mounts. Keeping the last visible profile in view advances the real owner
  // even when the earlier geometry snapshot pointed at a wrapper.
  const lastProfile = profileAnchors(dialog).at(-1);
  if (lastProfile && typeof lastProfile.scrollIntoView === "function") {
    lastProfile.scrollIntoView({ block: "end", inline: "nearest" });
  }

  return Boolean(scroller && scroller.scrollTop > beforeTop);
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

function nextFrameOrTimeout(signal: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    if (signal.aborted) {
      reject(signal.reason);
      return;
    }
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      signal.removeEventListener("abort", abort);
      resolve();
    };
    const abort = () => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      reject(signal.reason);
    };
    const timeout = window.setTimeout(finish, 120);
    requestAnimationFrame(finish);
    signal.addEventListener("abort", abort, { once: true });
  });
}

export async function scanDialog(
  dialog: HTMLElement,
  options: DialogScanOptions,
): Promise<FollowerRecord[]> {
  const records = new Map(
    (options.initialRecords ?? []).map((record) => [record.username, record]),
  );
  const roundsToStop = options.stableRounds ?? 8;
  const waitMs = options.waitMs ?? 520;
  let stableRounds = 0;
  let lastReportedSize = -1;
  const excluded = new Set(options.excludedUsernames ?? []);

  const collect = () => {
    for (const record of extractDialogRecords(dialog)) {
      if (!excluded.has(record.username)) records.set(record.username, record);
    }
    if (records.size !== lastReportedSize) {
      lastReportedSize = records.size;
      options.onProgress([...records.values()]);
    }
  };

  while (!options.signal.aborted) {
    const error = detectInstagramError(
      document.body.innerText ?? document.body.textContent ?? "",
    );
    if (error) throw new ScannerFailure(error);

    collect();

    if (options.expected?.exact && records.size >= options.expected.value) break;
    const beforeSize = records.size;
    const beforeObservation = observeDialog(dialog);
    if (options.drive) {
      const observed = await options.drive(beforeObservation.target, stableRounds);
      for (const record of observed ?? []) {
        if (!excluded.has(record.username)) records.set(record.username, record);
      }
    } else advanceDialog(dialog);
    await Promise.all([
      waitForMutation(dialog, waitMs, options.signal),
      nextFrameOrTimeout(options.signal),
    ]);
    collect();
    const afterObservation = observeDialog(dialog);
    const environmentChanged = options.drive
      ? records.size > beforeSize
      : afterObservation.fingerprint !== beforeObservation.fingerprint;
    stableRounds = records.size === beforeSize && !environmentChanged
      ? stableRounds + 1
      : 0;
    if (stableRounds >= roundsToStop) break;
  }

  if (options.signal.aborted) throw options.signal.reason;

  const result = [...records.values()];
  if (options.expected?.exact && result.length !== options.expected.value) {
    const shortfall = options.expected.value - result.length;
    if (shortfall > 0 && shortfall <= (options.terminalShortfallLimit ?? 0)) {
      return result;
    }
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
