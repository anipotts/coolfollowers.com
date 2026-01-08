"use client";

import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Heart, ChevronDown, ChevronUp, MessageCircle } from "lucide-react";
import type { Comment } from "@/lib/ig/schema";

interface CommentsListProps {
  comments: Comment[];
  totalComments: number;
}

function CommentItem({
  comment,
  isReply = false,
}: {
  comment: Comment;
  isReply?: boolean;
}) {
  const [showReplies, setShowReplies] = useState(false);
  const replies = comment.replies || [];

  return (
    <div className={isReply ? "ml-8 mt-2" : ""}>
      <div className="flex gap-3">
        <Avatar className="h-8 w-8 flex-shrink-0">
          <AvatarImage
            src={comment.owner.profilePicUrl ?? undefined}
            alt={comment.owner.username}
          />
          <AvatarFallback>
            {comment.owner.username.slice(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium">@{comment.owner.username}</span>
            {comment.owner.isVerified && (
              <Badge variant="secondary" className="h-4 px-1 text-[10px]">
                ✓
              </Badge>
            )}
            <span className="text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(comment.timestamp), {
                addSuffix: true,
              })}
            </span>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5 break-words">
            {comment.text}
          </p>
          {comment.likesCount > 0 && (
            <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
              <Heart className="h-3 w-3" />
              {comment.likesCount.toLocaleString()}
            </div>
          )}

          {/* Replies toggle */}
          {replies.length > 0 && !isReply && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-0 text-xs text-primary hover:bg-transparent mt-1"
              onClick={() => setShowReplies(!showReplies)}
            >
              {showReplies ? (
                <>
                  <ChevronUp className="h-3 w-3 mr-1" />
                  Hide {replies.length} {replies.length === 1 ? "reply" : "replies"}
                </>
              ) : (
                <>
                  <ChevronDown className="h-3 w-3 mr-1" />
                  View {replies.length} {replies.length === 1 ? "reply" : "replies"}
                </>
              )}
            </Button>
          )}
        </div>
      </div>

      {/* Replies */}
      {showReplies && replies.length > 0 && (
        <div className="mt-2 space-y-3">
          {replies.map((reply) => (
            <CommentItem key={reply.id} comment={reply} isReply />
          ))}
        </div>
      )}
    </div>
  );
}

export function CommentsList({ comments, totalComments }: CommentsListProps) {
  const [showAll, setShowAll] = useState(false);

  if (comments.length === 0) {
    return (
      <div className="text-sm text-muted-foreground py-4">
        <div className="flex items-center gap-2">
          <MessageCircle className="h-4 w-4" />
          <span className="font-medium">{totalComments.toLocaleString()} comments</span>
        </div>
        <p className="text-xs mt-1">Comments unavailable (data not fetched)</p>
      </div>
    );
  }

  const displayedComments = showAll ? comments : comments.slice(0, 5);
  const hasMore = comments.length > 5;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <MessageCircle className="h-4 w-4" />
        <span className="text-sm font-medium">
          {totalComments.toLocaleString()} comments
        </span>
        {comments.length < totalComments && (
          <span className="text-xs text-muted-foreground">
            (showing {comments.length})
          </span>
        )}
      </div>

      <div className="space-y-4">
        {displayedComments.map((comment) => (
          <CommentItem key={comment.id} comment={comment} />
        ))}
      </div>

      {hasMore && (
        <Button
          variant="ghost"
          size="sm"
          className="w-full text-xs"
          onClick={() => setShowAll(!showAll)}
        >
          {showAll ? "Show less" : `Show all ${comments.length} comments`}
        </Button>
      )}
    </div>
  );
}
