import { NextResponse } from "next/server";

// No password protection - site is public
export function middleware() {
  return NextResponse.next();
}

export const config = {
  matcher: [],
};
