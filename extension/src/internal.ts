import type { FollowerRecord, RelationKind, ScanError, ScanState } from "../../src/lib/extension-protocol";

export type InternalMessage =
  | { type: "SCANNER_READY" }
  | {
      type: "SCANNER_START";
      scanId: string;
      resume: Pick<ScanState, "username" | "followers" | "following" | "followerExpected" | "followingExpected">;
    }
  | { type: "SCANNER_CANCEL"; scanId?: string }
  | {
      type: "SCANNER_IDENTIFIED";
      scanId: string;
      username: string;
      followerExpected: number;
      followingExpected: number;
    }
  | { type: "SCANNER_AWAITING_USER"; scanId: string; phase: RelationKind }
  | {
      type: "SCANNER_PROGRESS";
      scanId: string;
      phase: RelationKind;
      records: FollowerRecord[];
      expected?: number;
      expectedIsExact?: boolean;
    }
  | {
      type: "SCANNER_COMPLETE";
      scanId: string;
      username: string;
      followers: FollowerRecord[];
      following: FollowerRecord[];
    }
  | { type: "SCANNER_ERROR"; scanId: string; error: ScanError };
