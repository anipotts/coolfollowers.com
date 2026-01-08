"use client";

import Image from "next/image";
import { format } from "date-fns";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Post } from "@/lib/ig/schema";

interface PostCardProps {
  post: Post;
  onClick?: () => void;
}

function HeartIcon(props: React.SVGProps<SVGSVGElement>) {
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
      <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
    </svg>
  );
}

function MessageIcon(props: React.SVGProps<SVGSVGElement>) {
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
      <path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z" />
    </svg>
  );
}

export function PostCard({ post, onClick }: PostCardProps) {
  const mediaTypeLabels = {
    image: "Photo",
    video: "Video",
    carousel: "Carousel",
  };

  return (
    <Card
      className="overflow-hidden cursor-pointer hover:shadow-lg transition-shadow"
      onClick={onClick}
    >
      <div className="relative aspect-square">
        <Image
          src={post.mediaUrls[0]}
          alt={post.caption || "Instagram post"}
          fill
          className="object-cover"
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
        />
        <Badge
          variant="secondary"
          className="absolute top-2 right-2 bg-background/80 backdrop-blur"
        >
          {mediaTypeLabels[post.mediaType]}
        </Badge>
      </div>
      <CardContent className="p-4">
        <p className="text-sm line-clamp-2 min-h-[2.5rem]">
          {post.caption || <span className="text-muted-foreground italic">No caption</span>}
        </p>
      </CardContent>
      <CardFooter className="p-4 pt-0 flex justify-between text-sm text-muted-foreground">
        <div className="flex gap-4">
          <span className="flex items-center gap-1">
            <HeartIcon className="h-4 w-4" />
            {post.likeCount.toLocaleString()}
          </span>
          <span className="flex items-center gap-1">
            <MessageIcon className="h-4 w-4" />
            {post.commentCount.toLocaleString()}
          </span>
        </div>
        <time dateTime={post.timestamp}>
          {format(new Date(post.timestamp), "MMM d, yyyy")}
        </time>
      </CardFooter>
    </Card>
  );
}
