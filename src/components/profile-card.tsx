import { format } from "date-fns";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import type { Profile } from "@/lib/ig/schema";

interface ProfileCardProps {
  profile: Profile;
}

export function ProfileCard({ profile }: ProfileCardProps) {
  const initials = profile.fullName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase();

  return (
    <Card>
      <CardHeader className="flex flex-row items-center gap-4">
        <Avatar className="h-16 w-16">
          <AvatarImage src={profile.profilePicUrl} alt={profile.username} />
          <AvatarFallback>{initials}</AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold">{profile.fullName}</h2>
            <Badge variant="secondary">@{profile.username}</Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-1">{profile.bio}</p>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex gap-6 text-sm">
          <div>
            <span className="font-bold">{profile.followersCount.toLocaleString()}</span>
            <span className="text-muted-foreground ml-1">followers</span>
          </div>
          <div>
            <span className="font-bold">{profile.followingCount.toLocaleString()}</span>
            <span className="text-muted-foreground ml-1">following</span>
          </div>
        </div>
        <p className="text-xs text-muted-foreground mt-4">
          Last updated: {format(new Date(profile.lastUpdated), "PPP 'at' p")}
        </p>
      </CardContent>
    </Card>
  );
}
