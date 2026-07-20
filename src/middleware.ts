import { NextRequest, NextResponse } from "next/server";
import {
  COOKIE_NAME,
  passwordToken,
  tokensMatch,
} from "@/lib/auth";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const sitePassword = process.env.SITE_PASSWORD;
  const isProd =
    process.env.NODE_ENV === "production" || process.env.VERCEL === "1";

  const isPublic =
    pathname === "/login" ||
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.endsWith(".png") ||
    pathname.endsWith(".webp") ||
    pathname.endsWith(".svg") ||
    pathname.endsWith(".ico") ||
    pathname.startsWith("/avatars");

  // Local convenience: no password configured → open access.
  // Production requires SITE_PASSWORD.
  if (!sitePassword) {
    if (isProd && !isPublic && pathname !== "/login") {
      const loginUrl = request.nextUrl.clone();
      loginUrl.pathname = "/login";
      return NextResponse.redirect(loginUrl);
    }
    return NextResponse.next();
  }

  if (isPublic) {
    return NextResponse.next();
  }

  const cookie = request.cookies.get(COOKIE_NAME)?.value;
  const expected = await passwordToken(sitePassword);
  const ok = cookie ? await tokensMatch(cookie, expected) : false;

  if (ok) {
    return NextResponse.next();
  }

  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const loginUrl = request.nextUrl.clone();
  loginUrl.pathname = "/login";
  loginUrl.searchParams.set("next", pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image).*)"],
};
