"use client";

import { useState, useMemo } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Search, Shield, BadgeCheck } from "lucide-react";
import type { Follower } from "@/lib/ig/schema";

interface UsersGridProps {
  users: Follower[];
  title: string;
  emptyMessage?: string;
}

export function UsersGrid({ users, title, emptyMessage = "No users found" }: UsersGridProps) {
  const [search, setSearch] = useState("");

  const filteredUsers = useMemo(() => {
    if (!search.trim()) return users;
    const query = search.toLowerCase();
    return users.filter(
      (user) =>
        user.username.toLowerCase().includes(query) ||
        (user.fullName?.toLowerCase().includes(query) ?? false)
    );
  }, [users, search]);

  const verifiedCount = users.filter((u) => u.isVerified).length;
  const privateCount = users.filter((u) => u.isPrivate).length;

  if (users.length === 0) {
    return (
      <div className="text-center py-16 text-muted-foreground">
        <p>{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header Stats */}
      <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
        <span>{users.length.toLocaleString()} {title.toLowerCase()}</span>
        {verifiedCount > 0 && (
          <span className="flex items-center gap-1">
            <BadgeCheck className="h-4 w-4 text-blue-500" />
            {verifiedCount} verified
          </span>
        )}
        {privateCount > 0 && (
          <span className="flex items-center gap-1">
            <Shield className="h-4 w-4" />
            {privateCount} private
          </span>
        )}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by username or name..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Results count when filtering */}
      {search && (
        <p className="text-sm text-muted-foreground">
          Showing {filteredUsers.length} of {users.length} {title.toLowerCase()}
        </p>
      )}

      {/* Grid */}
      {filteredUsers.length > 0 ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filteredUsers.map((user) => (
            <div
              key={user.username}
              className="flex items-center gap-3 p-3 rounded-lg border bg-card"
            >
              <Avatar className="h-10 w-10">
                <AvatarImage
                  src={user.profilePicUrl ?? undefined}
                  alt={user.username}
                />
                <AvatarFallback>
                  {user.username.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <p className="text-sm font-medium truncate">@{user.username}</p>
                  {user.isVerified && (
                    <BadgeCheck className="h-4 w-4 text-blue-500 flex-shrink-0" />
                  )}
                  {user.isPrivate && (
                    <Shield className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                  )}
                </div>
                {user.fullName && (
                  <p className="text-xs text-muted-foreground truncate">
                    {user.fullName}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8 text-muted-foreground">
          No users match &quot;{search}&quot;
        </div>
      )}
    </div>
  );
}
