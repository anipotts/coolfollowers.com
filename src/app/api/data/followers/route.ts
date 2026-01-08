import { NextResponse } from "next/server";
import { getCachedFollowers } from "@/lib/cache";
import { FollowersArraySchema } from "@/lib/ig/schema";

export async function GET() {
  try {
    const followers = await getCachedFollowers();

    if (!followers) {
      return NextResponse.json(
        { error: "No followers data cached. Trigger a refresh first." },
        { status: 404 }
      );
    }

    // Validate against schema
    const validated = FollowersArraySchema.safeParse(followers);
    if (!validated.success) {
      console.error("Followers validation error:", validated.error);
      return NextResponse.json(followers);
    }

    return NextResponse.json(validated.data);
  } catch (error) {
    console.error("Error fetching followers:", error);
    return NextResponse.json(
      { error: "Failed to fetch followers data" },
      { status: 500 }
    );
  }
}
