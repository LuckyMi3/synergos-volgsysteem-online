import { NextRequest, NextResponse } from "next/server";

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // 1️⃣ Admin login route altijd toestaan
  if (pathname === "/admin/login" || pathname.startsWith("/api/admin/auth/")) {
    return NextResponse.next();
  }

  const isAdmin = req.cookies.get("synergos_is_admin")?.value === "1";
  const hasSession = !!req.cookies.get("synergos_admin_session")?.value;

  const isAuthenticated = isAdmin && hasSession;

  // 2️⃣ API routes: return 401 JSON
  if (pathname.startsWith("/api/admin/")) {
    if (!isAuthenticated) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    return NextResponse.next();
  }

  // 3️⃣ Admin pages: redirect to login
  if (!isAuthenticated) {
    const loginUrl = new URL("/admin/login", req.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}
