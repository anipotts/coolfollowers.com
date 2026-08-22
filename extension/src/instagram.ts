import { countFromControl, extractDialogRecords, findRelationControl, findRelationDialog, scanDialog, ScannerFailure, usernameFromHref, waitForValue } from "./scanner";
import type { InternalMessage } from "./internal";
import { createFollowerRecord, type FollowerRecord, type RelationKind, type ScanError } from "../../src/lib/extension-protocol";

let activeController: AbortController | null = null;
let activeScanId: string | null = null;

interface CoachCopy { step: string; title: string; instruction: string; }

function createFocusCoach(copy: CoachCopy, control: HTMLElement) {
  document.querySelector('[data-coolfollowers-coach="true"]')?.remove();
  const host = document.createElement("div");
  host.dataset.coolfollowersCoach = "true";
  host.style.cssText = "position:fixed;inset:0;z-index:2147483647;pointer-events:none";
  const root = host.attachShadow({ mode: "open" });
  root.innerHTML = `
    <style>
      :host { all: initial; }
      .focus { position: fixed; opacity: 0; border: 3px solid #68a9ff; border-radius: 12px; box-shadow: 0 0 0 5px rgba(104,169,255,.17), 0 12px 34px rgba(23,105,236,.2); transition: opacity 180ms ease-out; animation: breathe 1800ms ease-in-out infinite; }
      .caption { position: fixed; opacity: 0; width: min(292px, calc(100vw - 32px)); border-radius: 16px; padding: 14px 16px; background: #eef7ff; color: #07183d; box-shadow: 0 18px 48px rgba(7,24,61,.24); font: 700 14px/1.42 Manrope, ui-sans-serif, system-ui, sans-serif; transition: opacity 180ms ease-out; }
      :host(.is-visible) .focus { opacity: 1; transition: opacity 180ms ease-out, transform 260ms cubic-bezier(.22,1,.36,1), width 260ms cubic-bezier(.22,1,.36,1), height 260ms cubic-bezier(.22,1,.36,1); }
      :host(.is-visible) .caption { opacity: 1; transition: opacity 180ms ease-out, transform 260ms cubic-bezier(.22,1,.36,1); }
      .step { margin: 0 0 5px; color: #1769ec; font-size: 11px; letter-spacing: .08em; text-transform: uppercase; }
      .title { margin: 0; font-size: 15px; font-weight: 850; letter-spacing: -.02em; }
      .instruction { margin: 4px 0 0; color: #405170; font-weight: 650; }
      @keyframes breathe { 0%,100% { box-shadow: 0 0 0 4px rgba(104,169,255,.13), 0 12px 34px rgba(23,105,236,.17); } 50% { box-shadow: 0 0 0 7px rgba(104,169,255,.19), 0 16px 42px rgba(23,105,236,.22); } }
      @media (prefers-reduced-motion: reduce) { .focus, .caption, :host(.is-visible) .focus, :host(.is-visible) .caption { transition: none; } .focus { animation: none; } }
    </style>
    <div class="focus"></div>
    <div class="caption" role="status" aria-live="polite">
      <p class="step"></p><p class="title"></p><p class="instruction"></p>
    </div>
  `;
  const focus = root.querySelector<HTMLElement>(".focus")!;
  const caption = root.querySelector<HTMLElement>(".caption")!;
  root.querySelector<HTMLElement>(".step")!.textContent = copy.step;
  root.querySelector<HTMLElement>(".title")!.textContent = copy.title;
  root.querySelector<HTMLElement>(".instruction")!.textContent = copy.instruction;
  document.documentElement.append(host);

  let positionFrame = 0;
  let revealFrame = 0;
  let hasPositioned = false;
  const applyPosition = () => {
    if (!control.isConnected) return;
    const rect = control.getBoundingClientRect();
    const pad = 5;
    focus.style.width = Math.max(18, rect.width + pad * 2) + "px";
    focus.style.height = Math.max(18, rect.height + pad * 2) + "px";
    focus.style.transform = `translate(${rect.left - pad}px, ${rect.top - pad}px)`;
    const captionWidth = Math.min(292, window.innerWidth - 32);
    const left = Math.min(window.innerWidth - captionWidth - 16, Math.max(16, rect.left + rect.width / 2 - captionWidth / 2));
    const estimatedHeight = 112;
    const below = rect.bottom + 16;
    const top = below + estimatedHeight < window.innerHeight ? below : Math.max(16, rect.top - estimatedHeight - 16);
    caption.style.transform = `translate(${left}px, ${top}px)`;
  };
  const position = () => {
    if (!hasPositioned) {
      applyPosition();
      hasPositioned = true;
      revealFrame = requestAnimationFrame(() => host.classList.add("is-visible"));
      return;
    }
    cancelAnimationFrame(positionFrame);
    positionFrame = requestAnimationFrame(applyPosition);
  };
  const observer = new ResizeObserver(position);
  const mutations = new MutationObserver(position);
  observer.observe(control);
  mutations.observe(document.documentElement, { childList: true, subtree: true, attributes: true });
  window.addEventListener("resize", position, { passive: true });
  window.addEventListener("scroll", position, { passive: true, capture: true });
  position();

  return () => {
    cancelAnimationFrame(positionFrame);
    cancelAnimationFrame(revealFrame);
    observer.disconnect();
    mutations.disconnect();
    window.removeEventListener("resize", position);
    window.removeEventListener("scroll", position, true);
    host.remove();
  };
}

function send(message: InternalMessage) {
  return chrome.runtime.sendMessage(message).catch(() => undefined);
}

async function sendWithin<T>(message: InternalMessage, timeoutMs: number) {
  let timeout = 0;
  try {
    return await Promise.race([
      send(message) as Promise<T | undefined>,
      new Promise<never>((_, reject) => {
        timeout = window.setTimeout(
          () => reject(new Error("Browser input timed out.")),
          timeoutMs,
        );
      }),
    ]);
  } finally {
    clearTimeout(timeout);
  }
}

async function driveWheel(scanId: string, phase: RelationKind, recoveryLevel: number) {
  let lastError = "Browser-level input did not respond.";
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const response = await sendWithin<{ ok?: boolean; error?: string; hrefs?: string[] }>({
        type: "SCANNER_WHEEL",
        scanId,
        phase,
        recoveryLevel,
      }, 4_000);
      if (response?.ok) {
        return (response.hrefs ?? []).flatMap((href) => {
          const username = usernameFromHref(href);
          const record = username ? createFollowerRecord(username) : null;
          return record ? [record] : [];
        });
      }
      lastError = response?.error ?? lastError;
    } catch (error) {
      lastError = error instanceof Error ? error.message : lastError;
    }
    if (attempt === 0) {
      await sendWithin(
        { type: "SCANNER_RELEASE_INPUT", scanId },
        1_500,
      ).catch(() => undefined);
      await new Promise((resolve) => setTimeout(resolve, 150));
    }
  }
  throw new ScannerFailure({
    code: "page_changed",
    message: lastError + " Keep the Instagram list open and try again.",
    retryable: true,
  });
}

function currentProfilePath() {
  const followersLink = document.querySelector<HTMLAnchorElement>('a[href*="/followers/"]');
  const href = followersLink?.getAttribute("href");
  if (!href) return null;
  const parts = href.split("/").filter(Boolean);
  return parts.length >= 2 ? "/" + parts[0] + "/" : null;
}

function findProfilePath() {
  const profileImage = document.querySelector<HTMLImageElement>('nav img[alt*="profile picture" i], a img[alt*="profile picture" i]');
  const href = profileImage?.closest<HTMLAnchorElement>('a[href^="/"]')?.getAttribute("href");
  if (href) {
    const parts = href.split("/").filter(Boolean);
    if (parts.length === 1) return "/" + parts[0] + "/";
  }
  return currentProfilePath();
}

function findCloseControl() {
  const dialog = document.querySelector<HTMLElement>('[role="dialog"]');
  if (!dialog) return null;
  return [...dialog.querySelectorAll<HTMLElement>("button")].find((button) => {
    const label = [button.getAttribute("aria-label"), button.textContent, button.querySelector("svg")?.getAttribute("aria-label")].filter(Boolean).join(" ").toLowerCase();
    return label.includes("close");
  }) ?? null;
}

async function openDialog(kind: RelationKind, scanId: string, signal: AbortSignal) {
  const control = await waitForValue(() => findRelationControl(kind), signal);
  const expected = countFromControl(control);
  await send({ type: "SCANNER_AWAITING_USER", scanId, phase: kind });
  const hideCoach = createFocusCoach(
    kind === "followers"
      ? { step: "step 2 of 4", title: "open followers", instruction: "click your followers count. keep the list open while we read it." }
      : { step: "step 3 of 4", title: "open following", instruction: "click your following count. keep the list open until it verifies." },
    control,
  );
  try {
    const dialog = await waitForValue(() => findRelationDialog(kind), signal, 60_000);
    return { dialog, expected };
  } finally {
    hideCoach();
  }
}

async function waitForDialogClose(signal: AbortSignal) {
  const closeControl = await waitForValue(findCloseControl, signal, 4_000).catch(() => null);
  const target = closeControl ?? document.querySelector<HTMLElement>('[role="dialog"]');
  if (!target) return;
  const hideCoach = createFocusCoach(
    { step: "step 2 of 4", title: "followers verified", instruction: "close this list, then we’ll move to following." },
    target,
  );
  try {
    await waitForValue(() => document.querySelector('[role="dialog"]') ? null : true, signal, 60_000);
  } finally {
    hideCoach();
  }
}

async function scanRelation(kind: RelationKind, scanId: string, signal: AbortSignal, profileUsername: string, initialRecords: FollowerRecord[] = []) {
  const { dialog, expected } = await openDialog(kind, scanId, signal);
  if (!expected?.exact) {
    throw new ScannerFailure({ code: "incomplete_scan", message: "Instagram did not expose an exact " + kind + " total. Reload Instagram and try again.", retryable: true });
  }
  if (initialRecords.length === 0) {
    await waitForValue(
      () => extractDialogRecords(dialog).length > 0 ? true : null,
      signal,
      20_000,
    ).catch(() => {
      throw new ScannerFailure({
        code: "page_changed",
        message: "Instagram opened the " + kind + " list but did not load any accounts. Close it, then try again.",
        retryable: true,
      });
    });
  }
  return scanDialog(dialog, {
    expected,
    initialRecords,
    signal,
    terminalShortfallLimit: kind === "following" ? 1 : 0,
    drive: (target, recoveryLevel) => {
      void target;
      return driveWheel(scanId, kind, recoveryLevel);
    },
    excludedUsernames: [profileUsername],
    onProgress: (records) => void send({ type: "SCANNER_PROGRESS", scanId, phase: kind, records, expected: expected.value, expectedIsExact: true }),
  });
}

function normalizeFailure(error: unknown): ScanError {
  if (error instanceof ScannerFailure) return error.detail;
  if (error instanceof DOMException && error.name === "AbortError") return { code: "interrupted", message: "The scan was cancelled.", retryable: true };
  return { code: "unknown", message: "The scan stopped unexpectedly. Reload Instagram and try again.", retryable: true };
}

async function startScanner(message: Extract<InternalMessage, { type: "SCANNER_START" }>) {
  if (activeScanId === message.scanId && activeController) return;
  activeController?.abort(new DOMException("Replaced", "AbortError"));
  const controller = new AbortController();
  activeController = controller;
  activeScanId = message.scanId;

  try {
    const pageText = (document.body.innerText ?? document.body.textContent ?? "").toLowerCase();
    if (pageText.includes("log in") && !findProfilePath()) throw new ScannerFailure({ code: "login_required", message: "Log into Instagram in this tab, then try again.", retryable: true });
    const profilePath = await waitForValue(findProfilePath, controller.signal);
    if (window.location.pathname !== profilePath) {
      window.location.assign(profilePath);
      return;
    }
    const username = profilePath.split("/").filter(Boolean)[0];
    if (message.resume.username && message.resume.username !== username) throw new ScannerFailure({ code: "account_changed", message: "The Instagram account changed during the scan. Clear the scan and start again.", retryable: false });
    const followerControl = await waitForValue(() => findRelationControl("followers"), controller.signal);
    const followingControl = await waitForValue(() => findRelationControl("following"), controller.signal);
    const followerExpected = countFromControl(followerControl);
    const followingExpected = countFromControl(followingControl);
    if (!followerExpected?.exact || !followingExpected?.exact) throw new ScannerFailure({ code: "incomplete_scan", message: "Instagram did not expose exact account totals. Reload Instagram and try again.", retryable: true });
    await send({ type: "SCANNER_IDENTIFIED", scanId: message.scanId, username, followerExpected: followerExpected.value, followingExpected: followingExpected.value });

    let followers = message.resume.followers ?? [];
    if (followers.length !== followerExpected.value) {
      followers = await scanRelation("followers", message.scanId, controller.signal, username, followers);
      await waitForDialogClose(controller.signal);
    } else if (document.querySelector('[role="dialog"]')) {
      await waitForDialogClose(controller.signal);
    }

    let following = message.resume.following ?? [];
    if (following.length !== followingExpected.value) following = await scanRelation("following", message.scanId, controller.signal, username, following);
    await send({ type: "SCANNER_COMPLETE", scanId: message.scanId, username, followers, following });
  } catch (error) {
    if (!controller.signal.aborted) await send({ type: "SCANNER_ERROR", scanId: message.scanId, error: normalizeFailure(error) });
  } finally {
    document.querySelector('[data-coolfollowers-coach="true"]')?.remove();
    if (activeController === controller) activeController = null;
    if (activeScanId === message.scanId) activeScanId = null;
  }
}

chrome.runtime.onMessage.addListener((message: InternalMessage) => {
  if (message.type === "SCANNER_START") void startScanner(message);
  if (message.type === "SCANNER_CANCEL" && (!message.scanId || message.scanId === activeScanId)) {
    activeController?.abort(new DOMException("Cancelled", "AbortError"));
    activeController = null;
    activeScanId = null;
    document.querySelector('[data-coolfollowers-coach="true"]')?.remove();
  }
});

document.documentElement.dataset.coolfollowersScanner = "ready";
void send({ type: "SCANNER_READY" });
