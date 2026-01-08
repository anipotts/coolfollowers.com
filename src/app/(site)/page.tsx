import Link from "next/link";
import { loadFollowersSafe, loadProfileSafe } from "@/lib/ig/load";
import { UsersGrid } from "@/components/users-grid";
import { RefreshButton } from "@/components/refresh-button";

export default async function HomePage() {
  const [profile, followers] = await Promise.all([
    loadProfileSafe(),
    loadFollowersSafe(),
  ]);

  return (
    <div className="container mx-auto px-4 py-8 md:py-12">
      <div className="space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold tracking-tighter sm:text-5xl">
            Cool Followers of{" "}
            <a
              href="https://instagram.com/anipottsbuilds"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              @anipottsbuilds
            </a>
          </h1>
          <p className="mx-auto max-w-[600px] text-muted-foreground md:text-lg">
            {profile
              ? `${profile.followersCount?.toLocaleString() || 0} followers and counting`
              : "Loading follower data..."}
          </p>
        </div>

        {/* Navigation */}
        <div className="flex flex-wrap justify-center gap-4">
          <Link
            href="/dashboard"
            className="text-sm font-medium hover:text-primary underline-offset-4 hover:underline"
          >
            View Dashboard
          </Link>
          <Link
            href="/dashboard/posts"
            className="text-sm font-medium hover:text-primary underline-offset-4 hover:underline"
          >
            Browse Posts
          </Link>
          <Link
            href="/dashboard/insights"
            className="text-sm font-medium hover:text-primary underline-offset-4 hover:underline"
          >
            Analytics
          </Link>
        </div>

        {/* Followers Grid */}
        {followers && followers.length > 0 ? (
          <UsersGrid
            users={followers}
            title="Followers"
            emptyMessage="No followers data yet. Click refresh to load."
          />
        ) : (
          <div className="text-center py-16 space-y-6">
            <p className="text-muted-foreground">
              No follower data loaded yet. Click the button below to fetch data from Instagram.
            </p>
            <RefreshButton />
          </div>
        )}

        {/* Footer */}
        <div className="text-center pt-8 border-t">
          <Link
            href="/privacy"
            className="text-sm text-muted-foreground hover:text-foreground underline-offset-4 hover:underline"
          >
            Privacy Policy
          </Link>
        </div>
      </div>
    </div>
  );
}
