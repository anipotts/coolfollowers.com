import Link from "next/link";
import { loadProfileSafe, loadPostsSafe, calculateStats } from "@/lib/ig/load";
import { ProfileCard } from "@/components/profile-card";
import { StatsCard } from "@/components/stats-card";
import { PostCard } from "@/components/post-card";
import { Button } from "@/components/ui/button";

export const metadata = {
  title: "Dashboard",
};

export default async function DashboardPage() {
  const [profile, posts] = await Promise.all([
    loadProfileSafe(),
    loadPostsSafe(),
  ]);

  if (!profile) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center py-16">
          <h1 className="text-2xl font-bold mb-4">No Profile Data</h1>
          <p className="text-muted-foreground">
            Profile data not found. Make sure to run the refresh script locally
            and commit the updated JSON files.
          </p>
        </div>
      </div>
    );
  }

  const stats = calculateStats(posts);
  const recentPosts = posts
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 4);

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Dashboard</h1>

      {/* Profile Card */}
      <div className="mb-8">
        <ProfileCard profile={profile} />
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
        <StatsCard
          title="Followers"
          value={profile.followersCount}
          description="Total followers"
        />
        <StatsCard
          title="Following"
          value={profile.followingCount}
          description="Accounts you follow"
        />
        <StatsCard
          title="Posts"
          value={stats.totalPosts}
          description="Total posts tracked"
        />
        <StatsCard
          title="Avg. Likes"
          value={stats.avgLikes}
          description="Per post"
        />
      </div>

      {/* Recent Posts */}
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-semibold">Recent Posts</h2>
          <Button asChild variant="outline" size="sm">
            <Link href="/dashboard/posts">View All</Link>
          </Button>
        </div>

        {recentPosts.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {recentPosts.map((post) => (
              <Link key={post.id} href="/dashboard/posts">
                <PostCard post={post} />
              </Link>
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground py-8 text-center">
            No posts found. Run the refresh script to load post data.
          </p>
        )}
      </div>
    </div>
  );
}
