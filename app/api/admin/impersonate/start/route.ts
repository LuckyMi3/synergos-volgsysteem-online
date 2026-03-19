import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { requireAdminAuth } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    await requireAdminAuth();
    const c = await cookies();

    const body = await req.json().catch(() => ({}));
    const userId = String(body?.userId || "").trim();
    const returnToRaw = String(body?.returnTo || "").trim();

    if (!userId) {
      return NextResponse.json(
        { ok: false, error: "Missing userId" },
        { status: 400 }
      );
    }

    const target = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true },
    });

    if (!target) {
      return NextResponse.json(
        { ok: false, error: "User not found" },
        { status: 404 }
      );
    }

    // Set impersonation cookies
    c.set("impersonate_user_id", userId, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
    });

    // Save a safe return path for "Stop"
    const safeReturnTo = returnToRaw.startsWith("/admin/")
      ? returnToRaw
      : `/admin/users/${userId}`;

    c.set("impersonate_return_to", safeReturnTo, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
    });

    // Decide where to send the admin after starting impersonation
    const role = String(target.role);
    const redirectTo =
      role === "TEACHER" ? "/docent" :
      role === "STUDENT" ? "/student" :
      "/admin";

    return NextResponse.json({
      ok: true,
      redirectTo,
      returnTo: safeReturnTo,
      role,
    });
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
