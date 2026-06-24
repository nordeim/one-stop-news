import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { auth } from "./src/lib/auth";

/**
 * Next.js 16 Network Boundary (replaces middleware.ts).
 *
 * Runs on Node.js runtime. Provides ONLY optimistic UX redirects.
 * Real authorization lives in verifySession() at the DAL layer.
 *
 * CRITICAL: Zero DB calls. Zero business logic. Redirects only.
 */
export default async function proxy(request: NextRequest) {
  const session = await auth();
  const isAdminRoute = request.nextUrl.pathname.startsWith("/admin");

  if (isAdminRoute && !session) {
    return NextResponse.redirect(new URL("/sign-in", request.url));
  }

  return NextResponse.next();
}

export const config = {
  // Match all routes except static assets and favicon
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
