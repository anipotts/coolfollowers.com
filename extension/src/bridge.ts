import {
  EXTENSION_SOURCE,
  PROTOCOL_VERSION,
  WEB_SOURCE,
  type ExtensionEvent,
  type ScanState,
  type WebRequest,
} from "../../src/lib/extension-protocol";

function postToPage(event: ExtensionEvent) {
  window.postMessage(event, window.location.origin);
}

function announceReady(state?: ScanState) {
  postToPage({
    source: EXTENSION_SOURCE,
    version: PROTOCOL_VERSION,
    type: "COOLFOLLOWERS_EXTENSION_READY",
  });
  if (state) {
    postToPage({
      source: EXTENSION_SOURCE,
      version: PROTOCOL_VERSION,
      type: "COOLFOLLOWERS_STATE",
      state,
    });
  }
}

window.addEventListener("message", (event: MessageEvent<WebRequest>) => {
  if (event.source !== window || event.origin !== window.location.origin) return;
  const message = event.data;
  if (
    !message ||
    message.source !== WEB_SOURCE ||
    message.version !== PROTOCOL_VERSION
  )
    return;

  chrome.runtime.sendMessage(message).then((response: ScanState | undefined) => {
    announceReady(response);
  }).catch(() => {
    // The page handles an absent extension by keeping its local fallback state.
  });
});

chrome.runtime.onMessage.addListener((message: unknown) => {
  const candidate = message as { type?: string; state?: ScanState };
  if (candidate.type === "COOLFOLLOWERS_STATE_UPDATE" && candidate.state) {
    postToPage({
      source: EXTENSION_SOURCE,
      version: PROTOCOL_VERSION,
      type: "COOLFOLLOWERS_STATE",
      state: candidate.state,
    });
  }
});

chrome.runtime.sendMessage({ type: "COOLFOLLOWERS_BRIDGE_READY" }).then(
  (state: ScanState | undefined) => announceReady(state),
).catch(() => announceReady());
