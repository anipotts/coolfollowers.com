import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// No password protection - site is public
export function middleware(request: NextRequest) {
  return NextResponse.next();
}

export const config = {
  matcher: [],
};
