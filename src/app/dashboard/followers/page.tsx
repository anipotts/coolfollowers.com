import { loadFollowersSafe, loadProfileSafe } from "@/lib/ig/load";
import { UsersGrid } from "@/components/users-grid";
import { RefreshButton } from "@/components/refresh-button";

export const metadata = {
  title: "Followers",
};

export default async function FollowersPage() {
  const [followers, profile] = await Promise.all([
    loadFollowersSafe(),
    loadProfileSafe(),
  ]);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-start mb-8">
        <div>
          <h1 className="text-3xl font-bold">Followers</h1>
          {profile && (
            <p className="text-muted-foreground mt-1">
              {profile.followersCount.toLocaleString()} total followers
              {followers.length > 0 && followers.length < profile.followersCount && (
                <span> (showing {followers.length})</span>
              )}
            </p>
          )}
        </div>
        <RefreshButton />
      </div>

      <UsersGrid
        users={followers}
        title="Followers"
        emptyMessage="No follower data cached. Click Refresh Data to fetch your followers."
      />
    </div>
  );
}
