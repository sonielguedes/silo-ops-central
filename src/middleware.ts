import { NextRequest, NextResponse } from "next/server";
import { decodeSessionCookie, SESSION_COOKIE_NAME } from "@/lib/auth";

const PUBLIC_EXTENSIONS = /\.[^/]+$/;
const PUBLIC_PREFIXES = ["/_next/", "/api/", "/assets/"];
const PUBLIC_PATHS = new Set([
  "/login",
  "/favicon.ico",
  "/apple-icon.png",
  "/logo-silo.png",
  "/manifest.json",
  "/robots.txt",
  "/sitemap.xml",
  "/site.webmanifest",
]);

function isPublicPath(pathname: string) {
  if (PUBLIC_PATHS.has(pathname)) return true;
  if (PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix))) return true;
  return PUBLIC_EXTENSIONS.test(pathname);
}

export function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  const session = decodeSessionCookie(request.cookies.get(SESSION_COOKIE_NAME)?.value);
  if (session) {
    return NextResponse.next();
  }

  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("returnTo", `${pathname}${search}`);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image).*)"],
};
