import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function POST(
  _req: Request,
  context: { params: Promise<{ assessmentId: string }> }
) {
  try {
    const { assessmentId } = await context.params;

    if (!assessmentId || !assessmentId.trim()) {
      return NextResponse.json(
        { ok: false, error: "ASSESSMENT_ID_REQUIRED" },
        { status: 400 }
      );
    }

    const existing = await prisma.assessment.findUnique({
      where: { id: assessmentId },
      select: {
        id: true,
        submittedAt: true,
      },
    });

    if (!existing) {
      return NextResponse.json(
        { ok: false, error: "ASSESSMENT_NOT_FOUND" },
        { status: 404 }
      );
    }

    const updated = await prisma.assessment.update({
      where: { id: assessmentId },
      data: {
        submittedAt: new Date(),
      },
      select: {
        id: true,
        submittedAt: true,
      },
    });

    return NextResponse.json({
      ok: true,
      assessment: updated,
    });
  } catch (error) {
    console.error("POST /api/assessments/[assessmentId]/submit failed", error);

    return NextResponse.json(
      {
        ok: false,
        error: "SUBMIT_FAILED",
      },
      { status: 500 }
    );
  }
}