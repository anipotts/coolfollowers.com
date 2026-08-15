import {
  PROTOCOL_VERSION,
  WEB_SOURCE,
  emptyScanState,
  type FollowerRecord,
  type RelationProgress,
  type ReviewLabel,
  type ScanState,
  type WebRequest,
  type WebRequestType,
} from "../../src/lib/extension-protocol";

const app = document.querySelector<HTMLElement>("#app")!;
const LABELS_KEY = "coolfollowersReviewLabelsV1";
type LabelStore = Record<string, Record<string, ReviewLabel>>;
type ResultView = "cools" | "fools";
type FoolFilter = "all" | "unreviewed" | ReviewLabel;

let state = emptyScanState();
let labels: LabelStore = {};
let resultView: ResultView = "fools";
let foolFilter: FoolFilter = "all";
let searchQuery = "";
let searchTimer = 0;
const previewMode = location.protocol !== "chrome-extension:";
if (previewMode) document.documentElement.classList.add("preview");

function previewState(): ScanState {
  const params = new URLSearchParams(location.search);
  if (params.get("preview") === "results") {
    const makeRecords = (names: string[]) => names.map((username) => ({ username, profileUrl: "https://www.instagram.com/" + username + "/" }));
    return {
      ...emptyScanState(),
      phase: "complete",
      username: "anipotts.jpeg",
      followerExpected: 1134,
      followingExpected: 754,
      followerProgress: { collected: 1134, expected: 1134, exact: true, status: "verified" },
      followingProgress: { collected: 754, expected: 754, exact: true, status: "verified" },
      cools: makeRecords(["lowtidevisuals", "midnightarchive", "cloudydaze", "neonchillz"]),
      fools: makeRecords(["ghostprotocol", "rarelyonline", "pixelcowboy", "brokenmirrorz", "unknownuser42"]),
    };
  }
  return {
    ...emptyScanState(),
    scanId: "preview",
    phase: "followers",
    username: "anipotts.jpeg",
    followerExpected: 1134,
    followingExpected: 754,
    followerProgress: { collected: 376, expected: 1134, exact: true, status: "scanning" },
    followingProgress: { collected: 0, expected: 754, exact: true, status: "pending" },
  };
}

function request(type: WebRequestType) {
  return chrome.runtime.sendMessage({ source: WEB_SOURCE, version: PROTOCOL_VERSION, type } satisfies WebRequest) as Promise<ScanState | undefined>;
}

function element<K extends keyof HTMLElementTagNameMap>(tag: K, className?: string, text?: string) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function actionButton(label: string, onClick: () => void, tone: "primary" | "quiet" | "danger" = "primary") {
  const button = element("button", "button " + tone, label);
  button.type = "button";
  button.addEventListener("click", onClick);
  return button;
}

function formatProgress(progress: RelationProgress) {
  if (!progress.expected) return progress.collected ? progress.collected.toLocaleString() : "getting ready";
  return progress.collected.toLocaleString() + " of " + progress.expected.toLocaleString();
}

function stepStatus(progress: RelationProgress) {
  if (progress.status === "verified") return "verified";
  if (progress.status === "awaiting_user") return "your turn";
  if (progress.status === "scanning") return "live";
  return "waiting";
}

function stepCard(number: number, title: string, status: string, active: boolean, complete: boolean, body?: HTMLElement) {
  const card = element("section", "step" + (active ? " active" : "") + (complete ? " complete" : ""));
  const header = element("div", "step-header");
  header.append(element("span", "step-number", String(number)));
  const names = element("div", "step-names");
  names.append(element("h2", "step-title", title), element("p", "step-status", status));
  header.append(names);
  if (complete) header.append(element("span", "verified", "ready"));
  else if (active && (status === "live" || status === "your turn")) header.append(element("span", "active-badge", status));
  card.append(header);
  if (active && body) card.append(body);
  return card;
}

function progressBody(progress: RelationProgress, kind: "followers" | "following") {
  const body = element("div", "step-body");
  const instruction = progress.status === "awaiting_user"
    ? "follow the moving outline on Instagram and click " + kind + "."
    : progress.status === "scanning"
      ? "keep the Instagram list open while every username is verified."
      : "we’ll guide you on Instagram when this step is ready.";
  body.append(element("p", "instruction", instruction));
  const meter = element("div", "meter");
  const fill = element("span", "meter-fill");
  fill.style.width = progress.expected ? Math.min(100, (progress.collected / progress.expected) * 100) + "%" : "0%";
  meter.append(fill);
  body.append(meter, element("p", "progress-count", formatProgress(progress)));
  return body;
}

function activeLabels() {
  return state.username ? labels[state.username] ?? {} : {};
}

async function saveLabel(username: string, label?: ReviewLabel) {
  if (!state.username) return;
  const owner = state.username;
  const ownerLabels = { ...(labels[owner] ?? {}) };
  if (label) ownerLabels[username] = label;
  else delete ownerLabels[username];
  labels = { ...labels, [owner]: ownerLabels };
  await chrome.storage.local.set({ [LABELS_KEY]: labels });
  render();
}

async function openProfile(record: FollowerRecord) {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab?.id !== undefined) await chrome.tabs.update(tab.id, { url: record.profileUrl, active: true });
}

function resultList(records: FollowerRecord[], view: ResultView) {
  const area = element("div", "result-area");
  const search = element("input", "search") as HTMLInputElement;
  search.type = "search";
  search.placeholder = "search usernames";
  search.value = searchQuery;
  search.autocomplete = "off";
  search.spellcheck = false;
  search.setAttribute("aria-label", "search " + view);
  const list = element("div", "username-list");

  const draw = () => {
    const ownerLabels = activeLabels();
    const query = searchQuery.trim().toLowerCase();
    list.replaceChildren();
    let visible = records;
    if (view === "fools" && foolFilter !== "all") {
      visible = visible.filter((record) =>
        foolFilter === "unreviewed" ? !ownerLabels[record.username] : ownerLabels[record.username] === foolFilter,
      );
    }
    if (query) visible = visible.filter((record) => record.username.includes(query));
    if (!visible.length) {
      list.append(element("p", "empty", "no matches"));
      return;
    }
    for (const record of visible) {
      const row = element("div", "username-row");
      const profile = element("button", "profile-link", record.username);
      profile.type = "button";
      profile.addEventListener("click", () => void openProfile(record));
      row.append(profile);
      if (view === "fools") {
        const controls = element("div", "label-controls");
        for (const label of ["intentional", "maybe"] as const) {
          const selected = ownerLabels[record.username] === label;
          const button = element("button", "label-button" + (selected ? " selected" : ""), label);
          button.type = "button";
          button.setAttribute("aria-pressed", String(selected));
          button.addEventListener("click", () => void saveLabel(record.username, selected ? undefined : label));
          controls.append(button);
        }
        row.append(controls);
      }
      list.append(row);
    }
  };

  search.addEventListener("input", () => {
    window.clearTimeout(searchTimer);
    searchTimer = window.setTimeout(() => {
      searchQuery = search.value;
      draw();
    }, 120);
  });
  area.append(search);
  if (view === "fools") {
    const filters = element("div", "filters");
    for (const filter of ["all", "unreviewed", "intentional", "maybe"] as const) {
      const button = element("button", "filter" + (foolFilter === filter ? " selected" : ""), filter);
      button.type = "button";
      button.addEventListener("click", () => { foolFilter = filter; render(); });
      filters.append(button);
    }
    area.append(filters);
  }
  draw();
  area.append(list);
  return area;
}

function resultsBody() {
  const body = element("div", "step-body results-body");
  const switcher = element("div", "result-switcher");
  const groups: Array<{ key: ResultView; label: string; records: FollowerRecord[] }> = [
    { key: "cools", label: "cools", records: state.cools ?? [] },
    { key: "fools", label: "fools", records: state.fools ?? [] },
  ];
  for (const group of groups) {
    const button = element("button", "result-choice " + group.key + (resultView === group.key ? " selected" : ""));
    button.type = "button";
    button.append(element("span", "choice-label", group.label), element("span", "choice-count", group.records.length.toLocaleString()));
    button.addEventListener("click", () => { resultView = group.key; searchQuery = ""; render(); });
    switcher.append(button);
  }
  const selected = groups.find((group) => group.key === resultView)!;
  body.append(switcher, element("p", "result-description", resultView === "cools" ? "they follow you back" : "they don’t follow you back"), resultList(selected.records, resultView));
  const actions = element("div", "actions");
  actions.append(
    actionButton("scan again", () => void request("COOLFOLLOWERS_START_SCAN")),
    actionButton("clear results", () => void request("COOLFOLLOWERS_CLEAR"), "quiet"),
  );
  body.append(actions);
  return body;
}

function render() {
  const shell = element("div", "shell");
  const masthead = element("header", "masthead");
  const brandGroup = element("div", "brand-group");
  const brandIcon = element("img", "brand-icon") as HTMLImageElement;
  brandIcon.src = "icons/icon-48.png";
  brandIcon.alt = "";
  brandGroup.append(brandIcon, element("h1", "brand", "coolfollowers.com"));
  masthead.append(brandGroup, element("p", "privacy", "private chrome beta"));
  shell.append(masthead);

  const connected = Boolean(state.username);
  const idle = state.phase === "idle" || state.phase === "cancelled";
  const readyBody = element("div", "step-body");
  readyBody.append(element("p", "instruction", connected ? "connected to @" + state.username : "we’ll use the Instagram account already open in Chrome."));
  if (idle || state.phase === "error") readyBody.append(actionButton(state.phase === "error" ? "try again" : "start scan", () => void request("COOLFOLLOWERS_START_SCAN")));

  shell.append(stepCard(1, "ready", connected ? "connected to @" + state.username : idle ? "open Instagram to begin" : "finding your profile", idle || state.phase === "starting" || state.phase === "error", connected, readyBody));

  const followersActive = state.phase === "followers";
  shell.append(stepCard(2, "scan followers", stepStatus(state.followerProgress), followersActive, state.followerProgress.status === "verified", progressBody(state.followerProgress, "followers")));

  const followingActive = state.phase === "following";
  shell.append(stepCard(3, "scan following", stepStatus(state.followingProgress), followingActive, state.followingProgress.status === "verified", progressBody(state.followingProgress, "following")));

  const complete = state.phase === "complete" && Boolean(state.cools && state.fools);
  shell.append(stepCard(4, "results", complete ? "verified" : "waiting", complete, complete, complete ? resultsBody() : undefined));

  if (state.phase === "error" && state.error) {
    const error = element("section", "error-card");
    error.append(element("h2", "error-title", "the scan stopped"), element("p", "error-copy", state.error.message));
    if (!state.error.retryable) error.append(actionButton("clear scan", () => void request("COOLFOLLOWERS_CLEAR"), "quiet"));
    shell.append(error);
  }
  if (!idle && !complete && state.phase !== "error") {
    shell.append(actionButton("cancel scan", () => void request("COOLFOLLOWERS_CANCEL_SCAN"), "quiet"));
  }

  const footer = element("footer", "footer");
  footer.append(element("p", "local-note", "usernames stay in this Chrome profile"));
  if (state.username && Object.keys(activeLabels()).length) {
    const clearLabels = element("button", "text-button", "clear my labels");
    clearLabels.type = "button";
    clearLabels.addEventListener("click", async () => {
      if (!state.username || !window.confirm("clear your saved labels for @" + state.username + "?")) return;
      const next = { ...labels };
      delete next[state.username];
      labels = next;
      await chrome.storage.local.set({ [LABELS_KEY]: labels });
      render();
    });
    footer.append(clearLabels);
  }
  shell.append(footer);
  app.replaceChildren(shell);
}

if (!previewMode) chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === "session" && changes.coolfollowersScanState?.newValue) {
    state = changes.coolfollowersScanState.newValue as ScanState;
    render();
  }
  if (areaName === "local" && changes[LABELS_KEY]?.newValue) {
    labels = changes[LABELS_KEY].newValue as LabelStore;
    render();
  }
});

if (previewMode) state = previewState();
else void Promise.all([request("COOLFOLLOWERS_GET_STATE"), chrome.storage.local.get(LABELS_KEY)]).then(([nextState, stored]) => {
    if (nextState) state = nextState;
    labels = (stored[LABELS_KEY] as LabelStore | undefined) ?? {};
    render();
  });
render();
