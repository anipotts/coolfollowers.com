import { z } from "zod";

/**
 * Schema for a user who liked a post
 */
export const LikerSchema = z.object({
  username: z.string(),
  fullName: z.string().nullable().optional(),
  profilePicUrl: z.string().url().nullable().optional(),
});

export type Liker = z.infer<typeof LikerSchema>;

/**
 * Schema for Instagram post media types
 */
export const MediaTypeSchema = z.enum(["image", "video", "carousel"]);

export type MediaType = z.infer<typeof MediaTypeSchema>;

/**
 * Schema for an Instagram post
 */
export const PostSchema = z.object({
  id: z.string(),
  shortcode: z.string(),
  caption: z.string().nullable(),
  mediaType: MediaTypeSchema,
  mediaUrls: z.array(z.string().url()),
  permalink: z.string().url(),
  timestamp: z.string().datetime(),
  likeCount: z.number().int().nonnegative(),
  commentCount: z.number().int().nonnegative(),
  likers: z.array(LikerSchema).optional().default([]),
});

export type Post = z.infer<typeof PostSchema>;

/**
 * Schema for the Instagram profile
 */
export const ProfileSchema = z.object({
  username: z.string(),
  fullName: z.string(),
  bio: z.string(),
  profilePicUrl: z.string().url(),
  followersCount: z.number().int().nonnegative(),
  followingCount: z.number().int().nonnegative(),
  lastUpdated: z.string().datetime(),
});

export type Profile = z.infer<typeof ProfileSchema>;

/**
 * Schema for the posts array
 */
export const PostsArraySchema = z.array(PostSchema);

export type PostsArray = z.infer<typeof PostsArraySchema>;
