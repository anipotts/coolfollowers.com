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
import { LikersList } from "@/components/likers-list";
import type { Post } from "@/lib/ig/schema";

interface PostModalProps {
  post: Post | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function ExternalLinkIcon(props: React.SVGProps<SVGSVGElement>) {
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
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
      <polyline points="15 3 21 3 21 9" />
      <line x1="10" x2="21" y1="14" y2="3" />
    </svg>
  );
}

export function PostModal({ post, open, onOpenChange }: PostModalProps) {
  if (!post) return null;

  const mediaTypeLabels = {
    image: "Photo",
    video: "Video",
    carousel: "Carousel",
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            Post Details
            <Badge variant="secondary">{mediaTypeLabels[post.mediaType]}</Badge>
          </SheetTitle>
        </SheetHeader>

        <div className="mt-4 space-y-4">
          {/* Media Preview */}
          <div className="relative aspect-square rounded-lg overflow-hidden">
            <Image
              src={post.mediaUrls[0]}
              alt={post.caption || "Instagram post"}
              fill
              className="object-cover"
            />
          </div>

          {/* Multiple images indicator */}
          {post.mediaUrls.length > 1 && (
            <p className="text-xs text-muted-foreground">
              +{post.mediaUrls.length - 1} more image(s) in carousel
            </p>
          )}

          {/* Stats */}
          <div className="flex gap-6 text-sm">
            <div>
              <span className="font-bold">{post.likeCount.toLocaleString()}</span>
              <span className="text-muted-foreground ml-1">likes</span>
            </div>
            <div>
              <span className="font-bold">{post.commentCount.toLocaleString()}</span>
              <span className="text-muted-foreground ml-1">comments</span>
            </div>
          </div>

          {/* Caption */}
          <div>
            <h4 className="text-sm font-medium mb-1">Caption</h4>
            <p className="text-sm text-muted-foreground">
              {post.caption || <span className="italic">No caption</span>}
            </p>
          </div>

          {/* Metadata */}
          <div className="text-sm text-muted-foreground">
            <p>
              Posted: {format(new Date(post.timestamp), "PPP 'at' p")}
            </p>
            <p>Shortcode: {post.shortcode}</p>
          </div>

          {/* Link to Instagram */}
          <Button asChild variant="outline" className="w-full">
            <Link href={post.permalink} target="_blank" rel="noopener noreferrer">
              View on Instagram
              <ExternalLinkIcon className="ml-2 h-4 w-4" />
            </Link>
          </Button>

          <Separator />

          {/* Likers */}
          <div>
            <h4 className="text-sm font-medium mb-2">Likers</h4>
            <LikersList likers={post.likers} totalLikes={post.likeCount} />
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
