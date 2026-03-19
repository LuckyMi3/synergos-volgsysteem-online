import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

export const runtime = "nodejs";
const prisma = new PrismaClient();

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ cohortId: string }> }
) {
  try {
    const { cohortId } = await params;
    const body = await req.json();
    const studentIds = (body?.studentIds ?? []) as string[];

    if (!cohortId) {
      return NextResponse.json({ ok: false, error: "Missing cohortId" }, { status: 400 });
    }

    if (!Array.isArray(studentIds) || studentIds.length === 0) {
      return NextResponse.json({ ok: false, error: "Missing studentIds[]" }, { status: 400 });
    }

    await prisma.enrollment.createMany({
      data: studentIds.map((studentId) => ({
        cohortId,
        userId: studentId,
      })),
      skipDuplicates: true,
    });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message ?? "Unknown error" },
      { status: 500 }
    );
  }
}