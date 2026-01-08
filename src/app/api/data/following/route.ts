import { NextResponse } from "next/server";
import { getCachedFollowing } from "@/lib/cache";
import { FollowersArraySchema } from "@/lib/ig/schema";

export async function GET() {
  try {
    const following = await getCachedFollowing();

    if (!following) {
      return NextResponse.json(
        { error: "No following data cached. Trigger a refresh first." },
        { status: 404 }
      );
    }

    // Validate against schema (same schema as followers)
    const validated = FollowersArraySchema.safeParse(following);
    if (!validated.success) {
      console.error("Following validation error:", validated.error);
      return NextResponse.json(following);
    }

    return NextResponse.json(validated.data);
  } catch (error) {
    console.error("Error fetching following:", error);
    return NextResponse.json(
      { error: "Failed to fetch following data" },
      { status: 500 }
    );
  }
}
