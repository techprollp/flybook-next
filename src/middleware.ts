import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

const COOKIE = "flybook_session";
const publicPaths = ["/login"];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api/auth/login") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  const token = req.cookies.get(COOKIE)?.value;
  let ok = false;
  if (token) {
    try {
      await jwtVerify(
        token,
        new TextEncoder().encode(
          process.env.AUTH_SECRET ||
            "flybook-dev-secret-change-in-production-32chars"
        )
      );
      ok = true;
    } catch {
      ok = false;
    }
  }

  if (pathname === "/login") {
    if (ok) return NextResponse.redirect(new URL("/", req.url));
    return NextResponse.next();
  }

  if (!ok) {
    return NextResponse.redirect(new URL("/login", req.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
