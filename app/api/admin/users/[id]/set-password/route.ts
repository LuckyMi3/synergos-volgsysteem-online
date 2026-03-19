import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword, requireAdminAuth } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST(req: Request, { params }: { params: any }) {
  try {
    await requireAdminAuth();
  } catch {
    return NextResponse.json({ ok: false, error: "NOT_ADMIN" }, { status: 401 });
  }

  const { id } = await params;

  const body = await req.json().catch(() => ({}));
  const password = (body?.password ? String(body.password) : "").trim();

  if (!password || password.length < 8) {
    return NextResponse.json(
      { ok: false, error: "Password must be at least 8 characters" },
      { status: 400 }
    );
  }

  const passwordHash = hashPassword(password);

  const updated = await prisma.user.update({
    where: { id: String(id) },
    data: { passwordHash },
    select: { id: true, email: true },
  });

  return NextResponse.json({ ok: true, user: updated });
}
