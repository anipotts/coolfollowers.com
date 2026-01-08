import { z } from "zod";

/**
 * Schema for a user (liker, commenter, follower, etc.)
 */
export const UserSchema = z.object({
  username: z.string(),
  fullName: z.string().nullable().optional(),
  profilePicUrl: z.string().nullable().optional(),
  isVerified: z.boolean().optional().default(false),
  isPrivate: z.boolean().optional().default(false),
});

export type User = z.infer<typeof UserSchema>;

// Alias for backwards compatibility
export const LikerSchema = UserSchema;
export type Liker = User;

/**
 * Schema for post location
 */
export const LocationSchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string().nullable().optional(),
  lat: z.number().nullable().optional(),
  lng: z.number().nullable().optional(),
});

export type Location = z.infer<typeof LocationSchema>;

/**
 * Schema for carousel/sidecar items
 */
export const SidecarItemSchema = z.object({
  isVideo: z.boolean(),
  displayUrl: z.string(),
  videoUrl: z.string().nullable().optional(),
});

export type SidecarItem = z.infer<typeof SidecarItemSchema>;

/**
 * Schema for a comment on a post
 */
export const CommentSchema: z.ZodType<Comment> = z.object({
  id: z.string(),
  text: z.string(),
  timestamp: z.string(),
  likesCount: z.number().default(0),
  owner: UserSchema,
  replies: z.array(z.lazy(() => CommentSchema)).optional().default([]),
});

export type Comment = {
  id: string;
  text: string;
  timestamp: string;
  likesCount: number;
  owner: User;
  replies?: Comment[];
};

/**
 * Schema for Instagram post media types
 */
export const TypenameSchema = z.enum(["GraphImage", "GraphVideo", "GraphSidecar"]);

export type Typename = z.infer<typeof TypenameSchema>;

// Legacy alias
export const MediaTypeSchema = z.enum(["image", "video", "carousel"]);
export type MediaType = z.infer<typeof MediaTypeSchema>;

/**
 * Extended schema for an Instagram post
 */
export const PostSchema = z.object({
  // Identifiers
  id: z.string(),
  shortcode: z.string(),
  typename: TypenameSchema.optional(),

  // Content
  caption: z.string().nullable(),
  captionHashtags: z.array(z.string()).optional().default([]),
  captionMentions: z.array(z.string()).optional().default([]),
  taggedUsers: z.array(z.string()).optional().default([]),

  // Media
  mediaType: MediaTypeSchema.optional(), // Legacy field
  mediaUrl: z.string().optional(),
  mediaUrls: z.array(z.string()).optional().default([]), // Legacy field
  videoUrl: z.string().nullable().optional(),
  videoDuration: z.number().nullable().optional(),
  sidecarItems: z.array(SidecarItemSchema).optional().default([]),

  // Engagement
  likeCount: z.number().int().nonnegative(),
  commentCount: z.number().int().nonnegative(),
  videoViewCount: z.number().nullable().optional(),

  // Location
  location: LocationSchema.nullable().optional(),

  // Metadata
  permalink: z.string().optional(),
  timestamp: z.string(),
  isVideo: z.boolean().optional().default(false),
  isPinned: z.boolean().optional().default(false),
  isSponsored: z.boolean().optional().default(false),

  // Related data (fetched separately, may be limited)
  likers: z.array(UserSchema).optional().default([]),
  comments: z.array(CommentSchema).optional().default([]),
});

export type Post = z.infer<typeof PostSchema>;

/**
 * Extended schema for the Instagram profile
 */
export const ProfileSchema = z.object({
  // Identifiers
  username: z.string(),
  userid: z.string().optional(),

  // Basic info
  fullName: z.string(),
  biography: z.string().optional().default(""),
  bio: z.string().optional(), // Legacy alias
  externalUrl: z.string().nullable().optional(),
  profilePicUrl: z.string(),

  // Account status
  isPrivate: z.boolean().optional().default(false),
  isVerified: z.boolean().optional().default(false),
  isBusinessAccount: z.boolean().optional().default(false),
  businessCategory: z.string().nullable().optional(),

  // Counts
  followersCount: z.number().int().nonnegative(),
  followingCount: z.number().int().nonnegative(),
  postsCount: z.number().int().nonnegative().optional(),
  igtvCount: z.number().int().nonnegative().optional().default(0),

  // Bio analysis
  biographyHashtags: z.array(z.string()).optional().default([]),
  biographyMentions: z.array(z.string()).optional().default([]),

  // Metadata
  lastUpdated: z.string(),
});

export type Profile = z.infer<typeof ProfileSchema>;

/**
 * Schema for follower/following entries
 */
export const FollowerSchema = z.object({
  username: z.string(),
  fullName: z.string().nullable().optional(),
  profilePicUrl: z.string().nullable().optional(),
  isVerified: z.boolean().optional().default(false),
  isPrivate: z.boolean().optional().default(false),
});

export type Follower = z.infer<typeof FollowerSchema>;

/**
 * Schema for arrays
 */
export const PostsArraySchema = z.array(PostSchema);
export type PostsArray = z.infer<typeof PostsArraySchema>;

export const FollowersArraySchema = z.array(FollowerSchema);
export type FollowersArray = z.infer<typeof FollowersArraySchema>;

/**
 * Schema for the complete Instagram data set
 */
export const InstagramDataSchema = z.object({
  profile: ProfileSchema,
  posts: PostsArraySchema,
  followers: FollowersArraySchema.optional().default([]),
  following: FollowersArraySchema.optional().default([]),
  lastUpdated: z.string(),
});

export type InstagramData = z.infer<typeof InstagramDataSchema>;
