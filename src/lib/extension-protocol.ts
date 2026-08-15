export const PROTOCOL_VERSION = 2 as const;
export const WEB_SOURCE = "coolfollowers-web" as const;
export const EXTENSION_SOURCE = "coolfollowers-extension" as const;

export type RelationKind = "followers" | "following";
export type ScanPhase = "idle" | "starting" | "followers" | "following" | "classifying" | "complete" | "error" | "cancelled";
export type RelationStatus = "pending" | "awaiting_user" | "scanning" | "verified";
export type ScanErrorCode = "extension_missing" | "login_required" | "rate_limited" | "page_changed" | "incomplete_scan" | "interrupted" | "account_changed" | "unknown";
export type ReviewLabel = "intentional" | "maybe";

export interface FollowerRecord { username: string; profileUrl: string; }
export interface ScanError { code: ScanErrorCode; message: string; retryable: boolean; }
export interface RelationProgress { collected: number; expected?: number; exact: boolean; status: RelationStatus; }

export interface ScanState {
  version: typeof PROTOCOL_VERSION;
  scanId?: string;
  phase: ScanPhase;
  username?: string;
  collected: number;
  expected?: number;
  expectedIsExact?: boolean;
  followerExpected?: number;
  followingExpected?: number;
  followerProgress: RelationProgress;
  followingProgress: RelationProgress;
  followers?: FollowerRecord[];
  following?: FollowerRecord[];
  cools?: FollowerRecord[];
  fools?: FollowerRecord[];
  error?: ScanError;
  updatedAt: number;
}

export type WebRequestType = "COOLFOLLOWERS_GET_STATE" | "COOLFOLLOWERS_OPEN_APP" | "COOLFOLLOWERS_START_SCAN" | "COOLFOLLOWERS_CANCEL_SCAN" | "COOLFOLLOWERS_CLEAR";
export interface WebRequest { source: typeof WEB_SOURCE; version: typeof PROTOCOL_VERSION; type: WebRequestType; }
export type ExtensionEventType = "COOLFOLLOWERS_EXTENSION_READY" | "COOLFOLLOWERS_STATE";
export interface ExtensionEvent { source: typeof EXTENSION_SOURCE; version: typeof PROTOCOL_VERSION; type: ExtensionEventType; state?: ScanState; }

export function normalizeUsername(value: string): string | null {
  const normalized = value.trim().replace(/^@/, "").toLowerCase();
  return /^[a-z0-9._]{1,30}$/.test(normalized) ? normalized : null;
}

export function createFollowerRecord(value: string): FollowerRecord | null {
  const username = normalizeUsername(value);
  return username ? { username, profileUrl: "https://www.instagram.com/" + username + "/" } : null;
}

export function dedupeRecords(records: FollowerRecord[]): FollowerRecord[] {
  const seen = new Set<string>();
  const deduped: FollowerRecord[] = [];
  for (const record of records) {
    const username = normalizeUsername(record.username);
    if (!username || seen.has(username)) continue;
    seen.add(username);
    deduped.push({ username, profileUrl: "https://www.instagram.com/" + username + "/" });
  }
  return deduped;
}

export function classifyRelationships(followers: FollowerRecord[], following: FollowerRecord[]): { cools: FollowerRecord[]; fools: FollowerRecord[] } {
  const followerNames = new Set(dedupeRecords(followers).map((record) => record.username));
  const cools: FollowerRecord[] = [];
  const fools: FollowerRecord[] = [];
  for (const record of dedupeRecords(following)) {
    if (followerNames.has(record.username)) cools.push(record);
    else fools.push(record);
  }
  return { cools, fools };
}

export function emptyRelationProgress(): RelationProgress {
  return { collected: 0, exact: false, status: "pending" };
}

export function emptyScanState(): ScanState {
  return { version: PROTOCOL_VERSION, phase: "idle", collected: 0, followerProgress: emptyRelationProgress(), followingProgress: emptyRelationProgress(), updatedAt: Date.now() };
}

export function isActiveScanPhase(phase: ScanPhase): boolean {
  return phase === "starting" || phase === "followers" || phase === "following" || phase === "classifying";
}

export function applyScanProgress(state: ScanState, progress: { phase: RelationKind; records: FollowerRecord[]; expected?: number; expectedIsExact?: boolean }): ScanState {
  const relationProgress: RelationProgress = {
    collected: progress.records.length,
    expected: progress.expected,
    exact: progress.expectedIsExact === true,
    status: progress.expectedIsExact && progress.records.length === progress.expected ? "verified" : "scanning",
  };
  return {
    ...state,
    phase: progress.phase,
    collected: progress.records.length,
    expected: progress.expected,
    expectedIsExact: progress.expectedIsExact,
    followerProgress: progress.phase === "followers" ? relationProgress : state.followerProgress,
    followingProgress: progress.phase === "following" ? relationProgress : state.followingProgress,
    followers: progress.phase === "followers" ? progress.records : state.followers,
    following: progress.phase === "following" ? progress.records : state.following,
    error: undefined,
    updatedAt: Date.now(),
  };
}
