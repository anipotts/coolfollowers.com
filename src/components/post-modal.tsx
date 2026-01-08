"use client";

import Image from "next/image";
import Link from "next/link";
import { format } from "date-fns";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LikersList } from "@/components/likers-list";
import { CommentsList } from "@/components/comments-list";
import {
  ExternalLink,
  MapPin,
  Hash,
  AtSign,
  UserCircle,
  Play,
  Heart,
  MessageCircle,
  Eye,
} from "lucide-react";
import type { Post } from "@/lib/ig/schema";

interface PostModalProps {
  post: Post | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PostModal({ post, open, onOpenChange }: PostModalProps) {
  if (!post) return null;

  const typeLabels: Record<string, string> = {
    GraphImage: "Photo",
    GraphVideo: "Video",
    GraphSidecar: "Carousel",
    image: "Photo",
    video: "Video",
    carousel: "Carousel",
  };

  const mediaType = post.typename || post.mediaType || "image";
  const mediaLabel = typeLabels[mediaType] || "Post";
  const hasHashtags = (post.captionHashtags?.length || 0) > 0;
  const hasMentions = (post.captionMentions?.length || 0) > 0;
  const hasTaggedUsers = (post.taggedUsers?.length || 0) > 0;
  const hasLocation = !!post.location;
  const hasLikers = (post.likers?.length || 0) > 0;
  const hasComments = (post.comments?.length || 0) > 0;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            Post Details
            <Badge variant="secondary">{mediaLabel}</Badge>
            {post.isPinned && <Badge variant="outline">Pinned</Badge>}
            {post.isSponsored && <Badge variant="destructive">Sponsored</Badge>}
          </SheetTitle>
        </SheetHeader>

        <div className="mt-4 space-y-4">
          {/* Media Preview */}
          <div className="relative aspect-square rounded-lg overflow-hidden bg-muted">
            <Image
              src={post.mediaUrl || post.mediaUrls?.[0] || ""}
              alt={post.caption || "Instagram post"}
              fill
              className="object-cover"
            />
            {post.isVideo && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                <Play className="h-12 w-12 text-white" fill="white" />
              </div>
            )}
          </div>

          {/* Carousel indicator */}
          {(post.sidecarItems?.length || 0) > 0 && (
            <p className="text-xs text-muted-foreground">
              {post.sidecarItems!.length} items in carousel
            </p>
          )}

          {/* Stats */}
          <div className="flex gap-6 text-sm">
            <div className="flex items-center gap-1.5">
              <Heart className="h-4 w-4 text-red-500" />
              <span className="font-bold">{post.likeCount.toLocaleString()}</span>
              <span className="text-muted-foreground">likes</span>
            </div>
            <div className="flex items-center gap-1.5">
              <MessageCircle className="h-4 w-4 text-blue-500" />
              <span className="font-bold">{post.commentCount.toLocaleString()}</span>
              <span className="text-muted-foreground">comments</span>
            </div>
            {post.videoViewCount && (
              <div className="flex items-center gap-1.5">
                <Eye className="h-4 w-4 text-green-500" />
                <span className="font-bold">{post.videoViewCount.toLocaleString()}</span>
                <span className="text-muted-foreground">views</span>
              </div>
            )}
          </div>

          {/* Caption */}
          <div>
            <h4 className="text-sm font-medium mb-1">Caption</h4>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">
              {post.caption || <span className="italic">No caption</span>}
            </p>
          </div>

          {/* Location */}
          {hasLocation && (
            <div className="flex items-center gap-2 text-sm">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <span>{post.location!.name}</span>
            </div>
          )}

          {/* Hashtags */}
          {hasHashtags && (
            <div>
              <div className="flex items-center gap-1.5 text-sm font-medium mb-2">
                <Hash className="h-4 w-4" />
                Hashtags
              </div>
              <div className="flex flex-wrap gap-1.5">
                {post.captionHashtags!.map((tag) => (
                  <Badge key={tag} variant="secondary" className="text-xs">
                    #{tag}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Mentions */}
          {hasMentions && (
            <div>
              <div className="flex items-center gap-1.5 text-sm font-medium mb-2">
                <AtSign className="h-4 w-4" />
                Mentions
              </div>
              <div className="flex flex-wrap gap-1.5">
                {post.captionMentions!.map((mention) => (
                  <Badge key={mention} variant="outline" className="text-xs">
                    @{mention}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Tagged Users */}
          {hasTaggedUsers && (
            <div>
              <div className="flex items-center gap-1.5 text-sm font-medium mb-2">
                <UserCircle className="h-4 w-4" />
                Tagged Users
              </div>
              <div className="flex flex-wrap gap-1.5">
                {post.taggedUsers!.map((user) => (
                  <Badge key={user} variant="outline" className="text-xs">
                    @{user}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Metadata */}
          <div className="text-sm text-muted-foreground space-y-1">
            <p>Posted: {format(new Date(post.timestamp), "PPP 'at' p")}</p>
            <p>ID: {post.shortcode}</p>
            {post.videoDuration && (
              <p>Duration: {Math.round(post.videoDuration)}s</p>
            )}
          </div>

          {/* Link to Instagram */}
          <Button asChild variant="outline" className="w-full">
            <Link
              href={post.permalink || `https://www.instagram.com/p/${post.shortcode}/`}
              target="_blank"
              rel="noopener noreferrer"
            >
              View on Instagram
              <ExternalLink className="ml-2 h-4 w-4" />
            </Link>
          </Button>

          <Separator />

          {/* Likers and Comments Tabs */}
          {(hasLikers || hasComments) ? (
            <Tabs defaultValue="likers" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="likers">
                  Likers ({post.likers?.length || 0})
                </TabsTrigger>
                <TabsTrigger value="comments">
                  Comments ({post.comments?.length || 0})
                </TabsTrigger>
              </TabsList>
              <TabsContent value="likers" className="mt-4">
                <LikersList likers={post.likers || []} totalLikes={post.likeCount} />
              </TabsContent>
              <TabsContent value="comments" className="mt-4">
                <CommentsList
                  comments={post.comments || []}
                  totalComments={post.commentCount}
                />
              </TabsContent>
            </Tabs>
          ) : (
            <div className="space-y-4">
              <LikersList likers={[]} totalLikes={post.likeCount} />
              <CommentsList comments={[]} totalComments={post.commentCount} />
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
