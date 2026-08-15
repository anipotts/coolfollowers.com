import {
  PROTOCOL_VERSION,
  applyScanProgress,
  classifyRelationships,
  emptyScanState,
  isActiveScanPhase,
  type RelationKind,
  type ScanState,
  type WebRequest,
} from "../../src/lib/extension-protocol";
import type { InternalMessage } from "./internal";

const STORAGE_KEY = "coolfollowersScanState";
const INSTAGRAM_URL = "https://www.instagram.com/";
const SITE_URLS = ["https://coolfollowers.com/*", "http://localhost/*", "http://127.0.0.1/*"];

type BackgroundMessage = WebRequest | InternalMessage | { type: "COOLFOLLOWERS_BRIDGE_READY" };

async function getState(): Promise<ScanState> {
  const stored = await chrome.storage.session.get(STORAGE_KEY);
  const state = stored[STORAGE_KEY] as ScanState | undefined;
  return state?.version === PROTOCOL_VERSION ? state : emptyScanState();
}

async function setState(state: ScanState) {
  await chrome.storage.session.set({ [STORAGE_KEY]: state });
  const tabs = await chrome.tabs.query({ url: SITE_URLS });
  await Promise.allSettled(
    tabs.filter((tab) => tab.id !== undefined).map((tab) =>
      chrome.tabs.sendMessage(tab.id as number, { type: "COOLFOLLOWERS_STATE_UPDATE", state }),
    ),
  );
  return state;
}

async function findInstagramTab(windowId?: number) {
  const tabs = await chrome.tabs.query({ url: "https://www.instagram.com/*", windowId });
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

async function openApp(sourceTab?: chrome.tabs.Tab) {
  const windowId = sourceTab?.windowId;
  if (windowId !== undefined) await chrome.sidePanel.open({ windowId });
  const existing = await findInstagramTab(windowId);
  if (existing?.id !== undefined) {
    await chrome.tabs.update(existing.id, { active: true });
    return getState();
  }
  if (sourceTab?.id !== undefined) {
    await chrome.tabs.update(sourceTab.id, { url: INSTAGRAM_URL, active: true });
    return getState();
  }
  await chrome.tabs.create({ url: INSTAGRAM_URL });
  return getState();
}

function scannerStartMessage(state: ScanState): InternalMessage {
  if (!state.scanId) throw new Error("scan id missing");
  return {
    type: "SCANNER_START",
    scanId: state.scanId,
    resume: {
      username: state.username,
      followers: state.followers,
      following: state.following,
      followerExpected: state.followerExpected,
      followingExpected: state.followingExpected,
    },
  };
}

async function sendScannerStart(tabId: number, state: ScanState) {
  for (let attempt = 0; attempt < 6; attempt += 1) {
    try {
      await chrome.tabs.sendMessage(tabId, scannerStartMessage(state));
      return;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 300));
    }
  }
  throw new Error("The Instagram scanner did not start");
}

async function startScan() {
  const scanId = crypto.randomUUID();
  const initial = emptyScanState();
  const state = await setState({ ...initial, scanId, phase: "starting", updatedAt: Date.now() });
  try {
    const existing = await findInstagramTab();
    const tab = existing ?? (await chrome.tabs.create({ url: INSTAGRAM_URL }));
    if (tab.id === undefined) throw new Error("Instagram tab was not created");
    await chrome.tabs.update(tab.id, { active: true });
    await waitForTab(tab.id);
    await sendScannerStart(tab.id, state);
    return state;
  } catch {
    return setState({
      ...state,
      phase: "error",
      error: { code: "interrupted", message: "Instagram did not open correctly. Open Instagram in Chrome, then try again.", retryable: true },
      updatedAt: Date.now(),
    });
  }
}

async function cancelScan() {
  const state = await getState();
  const tabs = await chrome.tabs.query({ url: "https://www.instagram.com/*" });
  await Promise.allSettled(
    tabs.filter((tab) => tab.id !== undefined).map((tab) =>
      chrome.tabs.sendMessage(tab.id as number, { type: "SCANNER_CANCEL", scanId: state.scanId } satisfies InternalMessage),
    ),
  );
  return setState({ ...emptyScanState(), phase: "cancelled", updatedAt: Date.now() });
}

function isCurrentScan(state: ScanState, scanId: string) {
  return Boolean(state.scanId && state.scanId === scanId);
}

function awaitingState(state: ScanState, phase: RelationKind): ScanState {
  const progress = phase === "followers" ? state.followerProgress : state.followingProgress;
  return {
    ...state,
    phase,
    followerProgress: phase === "followers" ? { ...progress, status: "awaiting_user" } : state.followerProgress,
    followingProgress: phase === "following" ? { ...progress, status: "awaiting_user" } : state.followingProgress,
    updatedAt: Date.now(),
  };
}

chrome.runtime.onMessage.addListener((message: BackgroundMessage, sender, sendResponse) => {
  void (async () => {
    if (message.type === "COOLFOLLOWERS_BRIDGE_READY" || message.type === "COOLFOLLOWERS_GET_STATE") {
      sendResponse(await getState());
      return;
    }
    if (message.type === "COOLFOLLOWERS_OPEN_APP") {
      sendResponse(await openApp(sender.tab));
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
      if (isActiveScanPhase(state.phase) && sender.tab?.id !== undefined) await sendScannerStart(sender.tab.id, state);
      sendResponse(state);
      return;
    }

    const state = await getState();
    const scanId = "scanId" in message ? message.scanId : undefined;
    if (!scanId || !isCurrentScan(state, scanId)) {
      sendResponse(state);
      return;
    }
    if (message.type === "SCANNER_AWAITING_USER") {
      sendResponse(await setState(awaitingState(state, message.phase)));
      return;
    }
    if (message.type === "SCANNER_PROGRESS") {
      sendResponse(await setState(applyScanProgress(state, message)));
      return;
    }
    if (message.type === "SCANNER_IDENTIFIED") {
      sendResponse(await setState({
        ...state,
        username: message.username,
        followerExpected: message.followerExpected,
        followingExpected: message.followingExpected,
        followerProgress: { ...state.followerProgress, expected: message.followerExpected, exact: true },
        followingProgress: { ...state.followingProgress, expected: message.followingExpected, exact: true },
        updatedAt: Date.now(),
      }));
      return;
    }
    if (message.type === "SCANNER_COMPLETE") {
      const { cools, fools } = classifyRelationships(message.followers, message.following);
      sendResponse(await setState({
        ...state,
        phase: "complete",
        username: message.username,
        collected: message.followers.length + message.following.length,
        expected: undefined,
        expectedIsExact: true,
        followerProgress: { collected: message.followers.length, expected: message.followers.length, exact: true, status: "verified" },
        followingProgress: { collected: message.following.length, expected: message.following.length, exact: true, status: "verified" },
        followers: undefined,
        following: undefined,
        cools,
        fools,
        updatedAt: Date.now(),
      }));
      return;
    }
    if (message.type === "SCANNER_ERROR") {
      sendResponse(await setState({ ...state, phase: "error", error: message.error, updatedAt: Date.now() }));
    }
  })();
  return true;
});

chrome.runtime.onInstalled.addListener(() => {
  void chrome.storage.session.setAccessLevel({ accessLevel: "TRUSTED_CONTEXTS" });
});

void chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
