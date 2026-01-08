import { NextRequest, NextResponse } from "next/server";
import {
  AUTH_COOKIE_NAME,
  generateAuthToken,
  verifyPassword,
} from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { password, remember } = body;

    if (!password || typeof password !== "string") {
      return NextResponse.json(
        { error: "Password is required" },
        { status: 400 }
      );
    }

    if (!verifyPassword(password)) {
      return NextResponse.json(
        { error: "Invalid password" },
        { status: 401 }
      );
    }

    // Generate auth token
    const token = generateAuthToken(process.env.SITE_PASSWORD || "");

    // Set cookie expiry (7 days if remember, else session)
    const maxAge = remember ? 60 * 60 * 24 * 7 : undefined;

    const response = NextResponse.json({ success: true });

    response.cookies.set(AUTH_COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      ...(maxAge && { maxAge }),
    });

    return response;
  } catch {
    return NextResponse.json(
      { error: "Invalid request" },
      { status: 400 }
    );
  }
}

export async function DELETE() {
  const response = NextResponse.json({ success: true });
  response.cookies.delete(AUTH_COOKIE_NAME);
  return response;
}
