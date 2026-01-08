import { promises as fs } from "fs";
import path from "path";
import {
  ProfileSchema,
  PostsArraySchema,
  type Profile,
  type Post,
} from "./schema";

const DATA_DIR = path.join(process.cwd(), "data", "instagram");

/**
 * Load and validate the Instagram profile from the JSON file.
 * Throws if the file doesn't exist or fails validation.
 */
export async function loadProfile(): Promise<Profile> {
  const filePath = path.join(DATA_DIR, "profile.json");
  const content = await fs.readFile(filePath, "utf-8");
  const data = JSON.parse(content);
  return ProfileSchema.parse(data);
}

/**
 * Load and validate the Instagram posts from the JSON file.
 * Throws if the file doesn't exist or fails validation.
 */
export async function loadPosts(): Promise<Post[]> {
  const filePath = path.join(DATA_DIR, "posts.json");
  const content = await fs.readFile(filePath, "utf-8");
  const data = JSON.parse(content);
  return PostsArraySchema.parse(data);
}

/**
 * Load profile with fallback on error.
 * Returns null if file doesn't exist or validation fails.
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
 * Returns empty array if file doesn't exist or validation fails.
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
