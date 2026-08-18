import { NextResponse, type NextRequest } from "next/server";

import { decideRouteAccess } from "@/lib/auth/access";
import { SESSION_COOKIE } from "@/lib/auth/constants";
import { readSessionToken } from "@/lib/auth/session-token";

export function proxy(request: NextRequest) {
  const secret = process.env.AUTH_PEPPER;
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const session = secret && token ? readSessionToken(token, secret) : null;
  const decision = decideRouteAccess(request.nextUrl.pathname, session?.role ?? null);
  if (decision.kind === "redirect") {
    return NextResponse.redirect(new URL(decision.destination, request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/",
    "/landing",
    "/home/:path*",
    "/topics/:path*",
    "/pages/:path*",
    "/editor/:path*",
    "/me/:path*",
    "/admin/:path*",
  ],
};
