import { NextResponse } from "next/server";
import { getCachedProfile, getCachedPosts, getLastRefreshTime, isCacheStale } from "@/lib/cache";
import type { Post, Profile } from "@/lib/ig/schema";

interface Stats {
  profile: {
    username: string;
    followersCount: number;
    followingCount: number;
    postsCount: number;
  } | null;
  engagement: {
    totalLikes: number;
    totalComments: number;
    totalVideoViews: number;
    avgLikesPerPost: number;
    avgCommentsPerPost: number;
    engagementRate: number;
  } | null;
  content: {
    totalPosts: number;
    imagePosts: number;
    videoPosts: number;
    carouselPosts: number;
    postsWithLocation: number;
    topHashtags: { tag: string; count: number }[];
  } | null;
  timing: {
    postsByDayOfWeek: Record<string, number>;
    postsByHour: Record<string, number>;
    bestDayToPost: string;
    bestHourToPost: number;
  } | null;
  cache: {
    lastRefresh: string | null;
    isStale: boolean;
  };
}

export async function GET() {
  try {
    const [profile, posts, lastRefresh, stale] = await Promise.all([
      getCachedProfile() as Promise<Profile | null>,
      getCachedPosts() as Promise<Post[] | null>,
      getLastRefreshTime(),
      isCacheStale(),
    ]);

    const stats: Stats = {
      profile: null,
      engagement: null,
      content: null,
      timing: null,
      cache: {
        lastRefresh: lastRefresh?.toISOString() || null,
        isStale: stale,
      },
    };

    if (profile) {
      stats.profile = {
        username: profile.username,
        followersCount: profile.followersCount,
        followingCount: profile.followingCount,
        postsCount: profile.postsCount || 0,
      };
    }

    if (posts && posts.length > 0) {
      // Engagement stats
      const totalLikes = posts.reduce((sum, p) => sum + p.likeCount, 0);
      const totalComments = posts.reduce((sum, p) => sum + p.commentCount, 0);
      const totalVideoViews = posts.reduce(
        (sum, p) => sum + (p.videoViewCount || 0),
        0
      );

      stats.engagement = {
        totalLikes,
        totalComments,
        totalVideoViews,
        avgLikesPerPost: Math.round(totalLikes / posts.length),
        avgCommentsPerPost: Math.round(totalComments / posts.length),
        engagementRate: profile
          ? parseFloat(
              (
                ((totalLikes + totalComments) /
                  posts.length /
                  profile.followersCount) *
                100
              ).toFixed(2)
            )
          : 0,
      };

      // Content stats
      const hashtagCount: Record<string, number> = {};
      posts.forEach((post) => {
        (post.captionHashtags || []).forEach((tag) => {
          hashtagCount[tag] = (hashtagCount[tag] || 0) + 1;
        });
      });

      const topHashtags = Object.entries(hashtagCount)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 10)
        .map(([tag, count]) => ({ tag, count }));

      stats.content = {
        totalPosts: posts.length,
        imagePosts: posts.filter((p) => p.typename === "GraphImage").length,
        videoPosts: posts.filter((p) => p.typename === "GraphVideo").length,
        carouselPosts: posts.filter((p) => p.typename === "GraphSidecar").length,
        postsWithLocation: posts.filter((p) => p.location).length,
        topHashtags,
      };

      // Timing stats
      const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
      const postsByDayOfWeek: Record<string, number> = {};
      const postsByHour: Record<string, number> = {};

      dayNames.forEach((day) => (postsByDayOfWeek[day] = 0));
      for (let h = 0; h < 24; h++) {
        postsByHour[h.toString()] = 0;
      }

      posts.forEach((post) => {
        const date = new Date(post.timestamp);
        const day = dayNames[date.getUTCDay()];
        const hour = date.getUTCHours();
        postsByDayOfWeek[day]++;
        postsByHour[hour.toString()]++;
      });

      const bestDay = Object.entries(postsByDayOfWeek).sort(
        ([, a], [, b]) => b - a
      )[0];
      const bestHour = Object.entries(postsByHour).sort(
        ([, a], [, b]) => b - a
      )[0];

      stats.timing = {
        postsByDayOfWeek,
        postsByHour,
        bestDayToPost: bestDay[0],
        bestHourToPost: parseInt(bestHour[0]),
      };
    }

    return NextResponse.json(stats);
  } catch (error) {
    console.error("Error computing stats:", error);
    return NextResponse.json(
      { error: "Failed to compute stats" },
      { status: 500 }
    );
  }
}
