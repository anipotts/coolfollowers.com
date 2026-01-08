import {
  ProfileSchema,
  PostsArraySchema,
  FollowersArraySchema,
  type Profile,
  type Post,
  type Follower,
} from "./schema";
import {
  getCachedProfile,
  getCachedPosts,
  getCachedFollowers,
  getCachedFollowing,
  getLastRefreshTime,
  isCacheStale,
} from "../cache";

/**
 * Load and validate the Instagram profile from Vercel KV cache.
 * Throws if no cached data or validation fails.
 */
export async function loadProfile(): Promise<Profile> {
  const data = await getCachedProfile();
  if (!data) {
    throw new Error("No profile data in cache. Trigger a refresh first.");
  }
  return ProfileSchema.parse(data);
}

/**
 * Load and validate the Instagram posts from Vercel KV cache.
 * Throws if no cached data or validation fails.
 */
export async function loadPosts(): Promise<Post[]> {
  const data = await getCachedPosts();
  if (!data) {
    throw new Error("No posts data in cache. Trigger a refresh first.");
  }
  return PostsArraySchema.parse(data);
}

/**
 * Load and validate followers from Vercel KV cache.
 * Throws if no cached data or validation fails.
 */
export async function loadFollowers(): Promise<Follower[]> {
  const data = await getCachedFollowers();
  if (!data) {
    throw new Error("No followers data in cache. Trigger a refresh first.");
  }
  return FollowersArraySchema.parse(data);
}

/**
 * Load and validate following from Vercel KV cache.
 * Throws if no cached data or validation fails.
 */
export async function loadFollowing(): Promise<Follower[]> {
  const data = await getCachedFollowing();
  if (!data) {
    throw new Error("No following data in cache. Trigger a refresh first.");
  }
  return FollowersArraySchema.parse(data);
}

/**
 * Load profile with fallback on error.
 * Returns null if cache empty or validation fails.
 */
export async function loadProfileSafe(): Promise<Profile | null> {
  try {
    return await loadProfile();
  } catch (error) {
    console.error("Failed to load profile:", error);
    return null;
  }
}

/**
 * Load posts with fallback on error.
 * Returns empty array if cache empty or validation fails.
 */
export async function loadPostsSafe(): Promise<Post[]> {
  try {
    return await loadPosts();
  } catch (error) {
    console.error("Failed to load posts:", error);
    return [];
  }
}

/**
 * Load followers with fallback on error.
 * Returns empty array if cache empty or validation fails.
 */
export async function loadFollowersSafe(): Promise<Follower[]> {
  try {
    return await loadFollowers();
  } catch (error) {
    console.error("Failed to load followers:", error);
    return [];
  }
}

/**
 * Load following with fallback on error.
 * Returns empty array if cache empty or validation fails.
 */
export async function loadFollowingSafe(): Promise<Follower[]> {
  try {
    return await loadFollowing();
  } catch (error) {
    console.error("Failed to load following:", error);
    return [];
  }
}

/**
 * Get cache status information.
 */
export async function getCacheStatus(): Promise<{
  lastRefresh: Date | null;
  isStale: boolean;
}> {
  const [lastRefresh, stale] = await Promise.all([
    getLastRefreshTime(),
    isCacheStale(),
  ]);
  return { lastRefresh, isStale: stale };
}

/**
 * Calculate aggregate statistics from posts.
 */
export function calculateStats(posts: Post[]) {
  if (posts.length === 0) {
    return {
      totalPosts: 0,
      totalLikes: 0,
      totalComments: 0,
      avgLikes: 0,
      avgComments: 0,
      medianLikes: 0,
    };
  }

  const totalLikes = posts.reduce((sum, p) => sum + p.likeCount, 0);
  const totalComments = posts.reduce((sum, p) => sum + p.commentCount, 0);
  const sortedLikes = posts.map((p) => p.likeCount).sort((a, b) => a - b);

  const mid = Math.floor(sortedLikes.length / 2);
  const medianLikes =
    sortedLikes.length % 2 === 0
      ? (sortedLikes[mid - 1] + sortedLikes[mid]) / 2
      : sortedLikes[mid];

  return {
    totalPosts: posts.length,
    totalLikes,
    totalComments,
    avgLikes: Math.round(totalLikes / posts.length),
    avgComments: Math.round(totalComments / posts.length),
    medianLikes: Math.round(medianLikes),
  };
}

/**
 * Get posts grouped by month for frequency analysis.
 */
export function getPostsByMonth(
  posts: Post[]
): Map<string, { count: number; posts: Post[] }> {
  const grouped = new Map<string, { count: number; posts: Post[] }>();

  for (const post of posts) {
    const date = new Date(post.timestamp);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;

    if (!grouped.has(key)) {
      grouped.set(key, { count: 0, posts: [] });
    }

    const entry = grouped.get(key)!;
    entry.count++;
    entry.posts.push(post);
  }

  return grouped;
}

/**
 * Get top N posts by likes.
 */
export function getTopPostsByLikes(posts: Post[], n: number = 10): Post[] {
  return [...posts].sort((a, b) => b.likeCount - a.likeCount).slice(0, n);
}

/**
 * Get top N posts by comments.
 */
export function getTopPostsByComments(posts: Post[], n: number = 10): Post[] {
  return [...posts].sort((a, b) => b.commentCount - a.commentCount).slice(0, n);
}

/**
 * Get hashtag usage frequency from posts.
 */
export function getHashtagStats(
  posts: Post[]
): { tag: string; count: number; avgLikes: number }[] {
  const hashtagData: Record<string, { count: number; totalLikes: number }> = {};

  for (const post of posts) {
    const hashtags = post.captionHashtags || [];
    for (const tag of hashtags) {
      if (!hashtagData[tag]) {
        hashtagData[tag] = { count: 0, totalLikes: 0 };
      }
      hashtagData[tag].count++;
      hashtagData[tag].totalLikes += post.likeCount;
    }
  }

  return Object.entries(hashtagData)
    .map(([tag, data]) => ({
      tag,
      count: data.count,
      avgLikes: Math.round(data.totalLikes / data.count),
    }))
    .sort((a, b) => b.count - a.count);
}

/**
 * Get posting time analysis.
 */
export function getTimingStats(posts: Post[]) {
  const dayNames = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];

  const byDay: Record<string, { count: number; totalLikes: number }> = {};
  const byHour: Record<number, { count: number; totalLikes: number }> = {};

  dayNames.forEach((day) => (byDay[day] = { count: 0, totalLikes: 0 }));
  for (let h = 0; h < 24; h++) {
    byHour[h] = { count: 0, totalLikes: 0 };
  }

  for (const post of posts) {
    const date = new Date(post.timestamp);
    const day = dayNames[date.getUTCDay()];
    const hour = date.getUTCHours();

    byDay[day].count++;
    byDay[day].totalLikes += post.likeCount;
    byHour[hour].count++;
    byHour[hour].totalLikes += post.likeCount;
  }

  const dayStats = Object.entries(byDay).map(([day, data]) => ({
    day,
    count: data.count,
    avgLikes: data.count > 0 ? Math.round(data.totalLikes / data.count) : 0,
  }));

  const hourStats = Object.entries(byHour).map(([hour, data]) => ({
    hour: parseInt(hour),
    count: data.count,
    avgLikes: data.count > 0 ? Math.round(data.totalLikes / data.count) : 0,
  }));

  const bestDay = dayStats.sort((a, b) => b.avgLikes - a.avgLikes)[0];
  const bestHour = hourStats.sort((a, b) => b.avgLikes - a.avgLikes)[0];

  return {
    byDay: dayStats,
    byHour: hourStats,
    bestDay: bestDay?.day || null,
    bestHour: bestHour?.hour ?? null,
  };
}
