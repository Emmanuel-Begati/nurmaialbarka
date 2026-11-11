import { NextResponse, type NextRequest } from "next/server";

// Lightweight gate: any non-public route needs a session cookie.
// The real session + role checks happen server-side in each layout/page/action.
// "/" is the public school website; staff photos are checked inside their route.
const PUBLIC = ["/login", "/photo/staff/", "/photo/site/", "/logo.png", "/icon.png", "/apple-icon.png"];
const PUBLIC_EXACT = ["/"];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (PUBLIC_EXACT.includes(pathname) || PUBLIC.some((p) => pathname.startsWith(p))) return NextResponse.next();
  if (!req.cookies.get("nq_session")) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
