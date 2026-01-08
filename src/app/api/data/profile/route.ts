import { NextResponse } from "next/server";
import { getCachedProfile } from "@/lib/cache";
import { ProfileSchema } from "@/lib/ig/schema";

export async function GET() {
  try {
    const profile = await getCachedProfile();

    if (!profile) {
      return NextResponse.json(
        { error: "No profile data cached. Trigger a refresh first." },
        { status: 404 }
      );
    }

    // Validate against schema
    const validated = ProfileSchema.safeParse(profile);
    if (!validated.success) {
      console.error("Profile validation error:", validated.error);
      return NextResponse.json(
        { error: "Invalid profile data in cache", data: profile },
        { status: 500 }
      );
    }

    return NextResponse.json(validated.data);
  } catch (error) {
    console.error("Error fetching profile:", error);
    return NextResponse.json(
      { error: "Failed to fetch profile data" },
      { status: 500 }
    );
  }
}
