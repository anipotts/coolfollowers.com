export const PROTOCOL_VERSION = 1 as const;
export const WEB_SOURCE = "coolfollowers-web" as const;
export const EXTENSION_SOURCE = "coolfollowers-extension" as const;

export type ScanPhase =
  | "idle"
  | "starting"
  | "followers"
  | "following"
  | "complete"
  | "error"
  | "cancelled";

export type ScanErrorCode =
  | "extension_missing"
  | "login_required"
  | "rate_limited"
  | "page_changed"
  | "incomplete_scan"
  | "interrupted"
  | "unknown";

export interface FollowerRecord {
  username: string;
  profileUrl: string;
}

export interface ScanError {
  code: ScanErrorCode;
  message: string;
  retryable: boolean;
}

export interface ScanState {
  version: typeof PROTOCOL_VERSION;
  phase: ScanPhase;
  username?: string;
  collected: number;
  expected?: number;
  expectedIsExact?: boolean;
  followers?: FollowerRecord[];
  following?: FollowerRecord[];
  cools?: FollowerRecord[];
  fools?: FollowerRecord[];
  error?: ScanError;
  updatedAt: number;
}

export type WebRequestType =
  | "COOLFOLLOWERS_GET_STATE"
  | "COOLFOLLOWERS_START_SCAN"
  | "COOLFOLLOWERS_CANCEL_SCAN"
  | "COOLFOLLOWERS_CLEAR";

export interface WebRequest {
  source: typeof WEB_SOURCE;
  version: typeof PROTOCOL_VERSION;
  type: WebRequestType;
}

export type ExtensionEventType =
  | "COOLFOLLOWERS_EXTENSION_READY"
  | "COOLFOLLOWERS_STATE";

export interface ExtensionEvent {
  source: typeof EXTENSION_SOURCE;
  version: typeof PROTOCOL_VERSION;
  type: ExtensionEventType;
  state?: ScanState;
}

export function normalizeUsername(value: string): string | null {
  const normalized = value.trim().replace(/^@/, "").toLowerCase();
  return /^[a-z0-9._]{1,30}$/.test(normalized) ? normalized : null;
}

export function createFollowerRecord(value: string): FollowerRecord | null {
  const username = normalizeUsername(value);
  return username
    ? {
        username,
        profileUrl: "https://www.instagram.com/" + username + "/",
      }
    : null;
}

export function dedupeRecords(records: FollowerRecord[]): FollowerRecord[] {
  const seen = new Set<string>();
  const deduped: FollowerRecord[] = [];

  for (const record of records) {
    const username = normalizeUsername(record.username);
    if (!username || seen.has(username)) continue;
    seen.add(username);
    deduped.push({
      username,
      profileUrl: "https://www.instagram.com/" + username + "/",
    });
  }

  return deduped;
}

export function classifyRelationships(
  followers: FollowerRecord[],
  following: FollowerRecord[],
): { cools: FollowerRecord[]; fools: FollowerRecord[] } {
  const followerNames = new Set(
    dedupeRecords(followers).map((record) => record.username),
  );
  const cools: FollowerRecord[] = [];
  const fools: FollowerRecord[] = [];

  for (const record of dedupeRecords(following)) {
    if (followerNames.has(record.username)) cools.push(record);
    else fools.push(record);
  }

  return { cools, fools };
}

export function emptyScanState(): ScanState {
  return {
    version: PROTOCOL_VERSION,
    phase: "idle",
    collected: 0,
    updatedAt: Date.now(),
  };
}

export function isActiveScanPhase(phase: ScanPhase): boolean {
  return phase === "starting" || phase === "followers" || phase === "following";
}

export function applyScanProgress(
  state: ScanState,
  progress: {
    phase: Extract<ScanPhase, "followers" | "following">;
    records: FollowerRecord[];
    expected?: number;
    expectedIsExact?: boolean;
  },
): ScanState {
  return {
    ...state,
    phase: progress.phase,
    collected: progress.records.length,
    expected: progress.expected,
    expectedIsExact: progress.expectedIsExact,
    followers:
      progress.phase === "followers" ? progress.records : state.followers,
    following:
      progress.phase === "following" ? progress.records : state.following,
    error: undefined,
    updatedAt: Date.now(),
  };
}
