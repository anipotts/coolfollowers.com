import { kv } from "@vercel/kv";

const IG_USERNAME = process.env.IG_USERNAME || "anipottsbuilds";
const CACHE_TTL = parseInt(process.env.CACHE_TTL_SECONDS || "3600", 10);

// Key builders
export const keys = {
  profile: () => `ig:profile:${IG_USERNAME}`,
  posts: () => `ig:posts:${IG_USERNAME}`,
  followers: () => `ig:followers:${IG_USERNAME}`,
  following: () => `ig:following:${IG_USERNAME}`,
  lastRefresh: () => `ig:last_refresh:${IG_USERNAME}`,
  refreshStatus: () => `ig:refresh_status`,
};

export type RefreshStatus = "idle" | "running" | "complete" | `error:${string}`;

// Generic cache operations
export async function getCachedData<T>(key: string): Promise<T | null> {
  try {
    const data = await kv.get<T>(key);
    return data;
  } catch (error) {
    console.error(`Failed to get cached data for ${key}:`, error);
    return null;
  }
}

export async function setCachedData<T>(
  key: string,
  data: T,
  ttl: number = CACHE_TTL
): Promise<boolean> {
  try {
    await kv.set(key, data, { ex: ttl });
    return true;
  } catch (error) {
    console.error(`Failed to set cached data for ${key}:`, error);
    return false;
  }
}

export async function deleteCachedData(key: string): Promise<boolean> {
  try {
    await kv.del(key);
    return true;
  } catch (error) {
    console.error(`Failed to delete cached data for ${key}:`, error);
    return false;
  }
}

// Staleness check
export async function isCacheStale(maxAgeSeconds: number = CACHE_TTL): Promise<boolean> {
  try {
    const lastRefresh = await kv.get<string>(keys.lastRefresh());
    if (!lastRefresh) return true;

    const lastRefreshTime = new Date(lastRefresh).getTime();
    const now = Date.now();
    const ageSeconds = (now - lastRefreshTime) / 1000;

    return ageSeconds > maxAgeSeconds;
  } catch {
    return true;
  }
}

export async function getLastRefreshTime(): Promise<Date | null> {
  try {
    const lastRefresh = await kv.get<string>(keys.lastRefresh());
    return lastRefresh ? new Date(lastRefresh) : null;
  } catch {
    return null;
  }
}

export async function setLastRefreshTime(): Promise<void> {
  await kv.set(keys.lastRefresh(), new Date().toISOString());
}

// Refresh status management
export async function getRefreshStatus(): Promise<RefreshStatus> {
  try {
    const status = await kv.get<RefreshStatus>(keys.refreshStatus());
    return status || "idle";
  } catch {
    return "idle";
  }
}

export async function setRefreshStatus(status: RefreshStatus): Promise<void> {
  // Set status with 5-minute TTL to auto-clear stuck states
  await kv.set(keys.refreshStatus(), status, { ex: 300 });
}

// Convenience functions for Instagram data
export async function getCachedProfile() {
  return getCachedData(keys.profile());
}

export async function getCachedPosts() {
  return getCachedData(keys.posts());
}

export async function getCachedFollowers() {
  return getCachedData(keys.followers());
}

export async function getCachedFollowing() {
  return getCachedData(keys.following());
}

// Check if any data exists in cache
export async function hasAnyCachedData(): Promise<boolean> {
  const profile = await getCachedProfile();
  return profile !== null;
}
