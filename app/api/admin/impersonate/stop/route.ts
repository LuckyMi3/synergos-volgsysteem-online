import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { requireAdminAuth } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST() {
  try {
    await requireAdminAuth();
    const c = await cookies();

    c.set("impersonate_user_id", "", {
      httpOnly: true,
      path: "/",
      maxAge: 0,
    });

    c.set("impersonate_return_to", "", {
      httpOnly: true,
      path: "/",
      maxAge: 0,
    });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    const msg = e?.message || "Unknown error";
    const status =
      msg === "NOT_AUTHENTICATED"
        ? 401
        : msg === "NOT_ADMIN"
        ? 403
        : msg === "REAL_USER_NOT_FOUND"
        ? 401
        : 500;
    return NextResponse.json({ ok: false, error: msg }, { status });
  }
}
