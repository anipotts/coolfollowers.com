import { loadFollowingSafe, loadProfileSafe } from "@/lib/ig/load";
import { UsersGrid } from "@/components/users-grid";
import { RefreshButton } from "@/components/refresh-button";

export const metadata = {
  title: "Following",
};

export default async function FollowingPage() {
  const [following, profile] = await Promise.all([
    loadFollowingSafe(),
    loadProfileSafe(),
  ]);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-start mb-8">
        <div>
          <h1 className="text-3xl font-bold">Following</h1>
          {profile && (
            <p className="text-muted-foreground mt-1">
              {profile.followingCount.toLocaleString()} accounts followed
              {following.length > 0 && following.length < profile.followingCount && (
                <span> (showing {following.length})</span>
              )}
            </p>
          )}
        </div>
        <RefreshButton />
      </div>

      <UsersGrid
        users={following}
        title="Following"
        emptyMessage="No following data cached. Click Refresh Data to fetch accounts you follow."
      />
    </div>
  );
}
