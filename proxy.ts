import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const TOKEN_COOKIE = "fb_token";

const staticRoutes = new Set(["/", "/login", "/signup", "/api-docs"]);
const namedProtectedRoutes = new Set([
  "/leaderboard",
  "/score",
  "/create",
  "/attendance",
  "/attendance/history",
]);

function isProtected(pathname: string): boolean {
  if (namedProtectedRoutes.has(pathname)) return true;
  if (staticRoutes.has(pathname)) return false;
  if (/^\/[^/]+\/edit$/.test(pathname)) return true;
  if (/^\/[^/]+$/.test(pathname) && !pathname.startsWith("/api/")) return true;
  return false;
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get(TOKEN_COOKIE)?.value;

  if (pathname.startsWith("/api/") && pathname !== "/api/docs") {
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.next();
  }

  if (isProtected(pathname) && !token) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!sentry-tunnel|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|manifest.webmanifest).*)",
  ],
};
