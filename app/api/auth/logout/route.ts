import { NextResponse } from "next/server";
import { deleteSessionByCookie } from "@/lib/auth/session";

export const runtime = "nodejs";

export async function POST() {
  await deleteSessionByCookie();
  return NextResponse.json({ ok: true });
}