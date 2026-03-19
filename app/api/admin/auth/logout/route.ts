import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { clearUserSessionCookie } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST() {
  const c = await cookies();

  // Wist admin auth + impersonation + user session
  c.set("synergos_is_admin", "", { path: "/", maxAge: 0 });
  c.set("synergos_admin_session", "", { path: "/", maxAge: 0 });
  c.set("impersonate_user_id", "", { path: "/", maxAge: 0 });

  await clearUserSessionCookie();

  return NextResponse.json({ ok: true });
}
