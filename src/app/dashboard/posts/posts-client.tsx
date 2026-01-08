"use client";

import * as React from "react";
import { PostCard } from "@/components/post-card";
import { PostModal } from "@/components/post-modal";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import type { Post } from "@/lib/ig/schema";
import { format } from "date-fns";

type SortOption = "timestamp" | "likeCount" | "commentCount";
type SortDirection = "asc" | "desc";
type ViewMode = "grid" | "table";

function GridIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <rect width="7" height="7" x="3" y="3" rx="1" />
      <rect width="7" height="7" x="14" y="3" rx="1" />
      <rect width="7" height="7" x="14" y="14" rx="1" />
      <rect width="7" height="7" x="3" y="14" rx="1" />
    </svg>
  );
}

function ListIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <line x1="8" x2="21" y1="6" y2="6" />
      <line x1="8" x2="21" y1="12" y2="12" />
      <line x1="8" x2="21" y1="18" y2="18" />
      <line x1="3" x2="3.01" y1="6" y2="6" />
      <line x1="3" x2="3.01" y1="12" y2="12" />
      <line x1="3" x2="3.01" y1="18" y2="18" />
    </svg>
  );
}

function ArrowUpDown(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="m21 16-4 4-4-4" />
      <path d="M17 20V4" />
      <path d="m3 8 4-4 4 4" />
      <path d="M7 4v16" />
    </svg>
  );
}

interface PostsClientProps {
  initialPosts: Post[];
}

export function PostsClient({ initialPosts }: PostsClientProps) {
  const [searchQuery, setSearchQuery] = React.useState("");
  const [sortBy, setSortBy] = React.useState<SortOption>("timestamp");
  const [sortDir, setSortDir] = React.useState<SortDirection>("desc");
  const [viewMode, setViewMode] = React.useState<ViewMode>("grid");
  const [selectedPost, setSelectedPost] = React.useState<Post | null>(null);
  const [modalOpen, setModalOpen] = React.useState(false);

  const filteredPosts = React.useMemo(() => {
    const result = initialPosts.filter((post) => {
      const query = searchQuery.toLowerCase();
      return (
        post.shortcode.toLowerCase().includes(query) ||
        (post.caption?.toLowerCase().includes(query) ?? false)
      );
    });

    result.sort((a, b) => {
      let aVal: number, bVal: number;
      switch (sortBy) {
        case "timestamp":
          aVal = new Date(a.timestamp).getTime();
          bVal = new Date(b.timestamp).getTime();
          break;
        case "likeCount":
          aVal = a.likeCount;
          bVal = b.likeCount;
          break;
        case "commentCount":
          aVal = a.commentCount;
          bVal = b.commentCount;
          break;
      }
      return sortDir === "asc" ? aVal - bVal : bVal - aVal;
    });

    return result;
  }, [initialPosts, searchQuery, sortBy, sortDir]);

  const handlePostClick = (post: Post) => {
    setSelectedPost(post);
    setModalOpen(true);
  };

  const sortLabels: Record<SortOption, string> = {
    timestamp: "Date",
    likeCount: "Likes",
    commentCount: "Comments",
  };

  return (
    <>
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <Input
          type="search"
          placeholder="Search by caption or shortcode..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="sm:max-w-xs"
        />

        <div className="flex gap-2 flex-wrap">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <ArrowUpDown className="mr-2 h-4 w-4" />
                Sort: {sortLabels[sortBy]} ({sortDir === "asc" ? "↑" : "↓"})
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuRadioGroup
                value={`${sortBy}-${sortDir}`}
                onValueChange={(value) => {
                  const [field, dir] = value.split("-") as [SortOption, SortDirection];
                  setSortBy(field);
                  setSortDir(dir);
                }}
              >
                <DropdownMenuRadioItem value="timestamp-desc">
                  Date (Newest)
                </DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="timestamp-asc">
                  Date (Oldest)
                </DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="likeCount-desc">
                  Likes (Most)
                </DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="likeCount-asc">
                  Likes (Least)
                </DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="commentCount-desc">
                  Comments (Most)
                </DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="commentCount-asc">
                  Comments (Least)
                </DropdownMenuRadioItem>
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>

          <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as ViewMode)}>
            <TabsList>
              <TabsTrigger value="grid">
                <GridIcon className="h-4 w-4" />
              </TabsTrigger>
              <TabsTrigger value="table">
                <ListIcon className="h-4 w-4" />
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      {/* Results Count */}
      <p className="text-sm text-muted-foreground mb-4">
        {filteredPosts.length} post{filteredPosts.length !== 1 ? "s" : ""}
        {searchQuery && ` matching "${searchQuery}"`}
      </p>

      {/* Grid View */}
      {viewMode === "grid" && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredPosts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              onClick={() => handlePostClick(post)}
            />
          ))}
        </div>
      )}

      {/* Table View */}
      {viewMode === "table" && (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Caption</TableHead>
                <TableHead className="text-right">Likes</TableHead>
                <TableHead className="text-right">Comments</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPosts.map((post) => (
                <TableRow
                  key={post.id}
                  className="cursor-pointer"
                  onClick={() => handlePostClick(post)}
                >
                  <TableCell>
                    {format(new Date(post.timestamp), "MMM d, yyyy")}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{post.mediaType}</Badge>
                  </TableCell>
                  <TableCell className="max-w-xs truncate">
                    {post.caption || (
                      <span className="text-muted-foreground italic">
                        No caption
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    {post.likeCount.toLocaleString()}
                  </TableCell>
                  <TableCell className="text-right">
                    {post.commentCount.toLocaleString()}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {filteredPosts.length === 0 && (
        <div className="text-center py-16 text-muted-foreground">
          {searchQuery
            ? `No posts found matching "${searchQuery}"`
            : "No posts found. Run the refresh script to load data."}
        </div>
      )}

      {/* Post Detail Modal */}
      <PostModal
        post={selectedPost}
        open={modalOpen}
        onOpenChange={setModalOpen}
      />
    </>
  );
}
