import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const SESSION_COOKIE_NAME = "mintrain_session";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isAsset =
    pathname.startsWith("/_next") ||
    pathname.startsWith("/icon") ||
    pathname.startsWith("/apple-icon") ||
    pathname === "/favicon.ico" ||
    pathname === "/manifest.webmanifest" ||
    pathname === "/sw.js";

  if (isAsset || pathname.startsWith("/api")) {
    return NextResponse.next();
  }

  const hasSession = request.cookies.get(SESSION_COOKIE_NAME)?.value != null;

  if (pathname === "/login") {
    if (hasSession) {
      return NextResponse.redirect(new URL("/", request.url));
    }

    return NextResponse.next();
  }

  if (hasSession === false) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!.*\\..*).*)"],
};
