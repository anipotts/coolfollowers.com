import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { Liker } from "@/lib/ig/schema";

interface LikersListProps {
  likers: Liker[];
  totalLikes: number;
}

export function LikersList({ likers, totalLikes }: LikersListProps) {
  if (likers.length === 0) {
    return (
      <div className="text-sm text-muted-foreground py-4">
        <p className="font-medium">{totalLikes.toLocaleString()} likes</p>
        <p className="text-xs mt-1">
          Likers unavailable (data not provided)
        </p>
      </div>
    );
  }

  const displayedLikers = likers.slice(0, 10);
  const remainingCount = totalLikes - displayedLikers.length;

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">{totalLikes.toLocaleString()} likes</p>
      <div className="space-y-2">
        {displayedLikers.map((liker) => (
          <div key={liker.username} className="flex items-center gap-2">
            <Avatar className="h-8 w-8">
              <AvatarImage
                src={liker.profilePicUrl ?? undefined}
                alt={liker.username}
              />
              <AvatarFallback>
                {liker.username.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">@{liker.username}</p>
              {liker.fullName && (
                <p className="text-xs text-muted-foreground truncate">
                  {liker.fullName}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
      {remainingCount > 0 && (
        <p className="text-xs text-muted-foreground">
          and {remainingCount.toLocaleString()} others
        </p>
      )}
    </div>
  );
}
