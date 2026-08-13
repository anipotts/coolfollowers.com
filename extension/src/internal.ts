import type {
  FollowerRecord,
  ScanError,
  ScanPhase,
} from "../../src/lib/extension-protocol";

export type InternalMessage =
  | { type: "SCANNER_READY" }
  | { type: "SCANNER_START" }
  | { type: "SCANNER_CANCEL" }
  | {
      type: "SCANNER_PROGRESS";
      phase: Extract<ScanPhase, "followers" | "following">;
      records: FollowerRecord[];
      expected?: number;
      expectedIsExact?: boolean;
    }
  | {
      type: "SCANNER_COMPLETE";
      username: string;
      followers: FollowerRecord[];
      following: FollowerRecord[];
    }
  | { type: "SCANNER_ERROR"; error: ScanError };
