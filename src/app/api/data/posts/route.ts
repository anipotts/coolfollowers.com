import { NextResponse } from "next/server";
import { getCachedPosts } from "@/lib/cache";
import { PostsArraySchema } from "@/lib/ig/schema";

export async function GET() {
  try {
    const posts = await getCachedPosts();

    if (!posts) {
      return NextResponse.json(
        { error: "No posts data cached. Trigger a refresh first." },
        { status: 404 }
      );
    }

    // Validate against schema
    const validated = PostsArraySchema.safeParse(posts);
    if (!validated.success) {
      console.error("Posts validation error:", validated.error);
      // Return raw data anyway for debugging
      return NextResponse.json(posts);
    }

    return NextResponse.json(validated.data);
  } catch (error) {
    console.error("Error fetching posts:", error);
    return NextResponse.json(
      { error: "Failed to fetch posts data" },
      { status: 500 }
    );
  }
}
