import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ assessmentId: string }> }
) {
  try {
    const { assessmentId } = await params;
    const body = await req.json().catch(() => ({}));
    const resetReviews = body?.resetReviews !== false; // default true

    const result = await prisma.$transaction(async (tx) => {
      const assessment = await tx.assessment.update({
        where: { id: assessmentId },
        data: { submittedAt: null },
        select: {
          id: true,
          studentId: true,
          rubricKey: true,
          moment: true,
          submittedAt: true,
        },
      });

      let resetCount = 0;

      if (resetReviews) {
        const upd = await tx.teacherReview.updateMany({
          where: { assessmentId },
          data: { status: "DRAFT", publishedAt: null },
        });
        resetCount = upd.count;
      }

      return { assessment, resetCount };
    });

    return NextResponse.json({
      ok: true,
      assessment: result.assessment,
      resetReviews: result.resetCount,
    });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: "Unlock failed", detail: String(e?.message ?? e) },
      { status: 500 }
    );
  }
}