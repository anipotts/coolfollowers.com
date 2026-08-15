import { describe, expect, it, vi } from "vitest";
import {
  applyScanProgress,
  classifyRelationships,
  createFollowerRecord,
  dedupeRecords,
  emptyScanState,
  isActiveScanPhase,
  normalizeUsername,
} from "./extension-protocol";

function record(username: string) {
  const value = createFollowerRecord(username);
  if (!value) throw new Error("invalid test username");
  return value;
}

describe("username records", () => {
  it("normalizes valid usernames and rejects unsafe values", () => {
    expect(normalizeUsername(" @Ani.Potts_ ")).toBe("ani.potts_");
    expect(normalizeUsername("spaces are invalid")).toBeNull();
    expect(normalizeUsername("a".repeat(31))).toBeNull();
  });

  it("deduplicates case-insensitively and rebuilds canonical profile URLs", () => {
    expect(
      dedupeRecords([
        { username: "ANI", profileUrl: "https://example.test/unsafe" },
        record("ani"),
        record("sasha"),
      ]),
    ).toEqual([record("ani"), record("sasha")]);
  });
});

describe("relationship classification", () => {
  it("uses follower membership to classify each followed account once", () => {
    const result = classifyRelationships(
      [record("ani"), record("mira")],
      [record("MIRA"), record("dev"), record("dev")],
    );

    expect(result.cools).toEqual([record("mira")]);
    expect(result.fools).toEqual([record("dev")]);
  });
});

describe("session recovery", () => {
  it("recognizes phases that should resume after a worker restart", () => {
    expect(isActiveScanPhase("starting")).toBe(true);
    expect(isActiveScanPhase("followers")).toBe(true);
    expect(isActiveScanPhase("following")).toBe(true);
    expect(isActiveScanPhase("complete")).toBe(false);
    expect(isActiveScanPhase("error")).toBe(false);
  });

  it("preserves a completed follower batch while following progress arrives", () => {
    vi.spyOn(Date, "now").mockReturnValue(1234);
    const followerBatch = [record("mira")];
    const followingBatch = [record("mira"), record("dev")];
    const withFollowers = applyScanProgress(emptyScanState(), {
      phase: "followers",
      records: followerBatch,
      expected: 1,
      expectedIsExact: true,
    });
    const resumed = applyScanProgress(withFollowers, {
      phase: "following",
      records: followingBatch,
      expected: 2,
      expectedIsExact: true,
    });

    expect(resumed.followers).toEqual(followerBatch);
    expect(resumed.following).toEqual(followingBatch);
    expect(resumed.followerProgress.status).toBe("verified");
    expect(resumed.followingProgress.status).toBe("verified");
    expect(resumed.collected).toBe(2);
    expect(resumed.updatedAt).toBe(1234);
    vi.restoreAllMocks();
  });
});
