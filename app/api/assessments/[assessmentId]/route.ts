import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET(
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

    const assessment = await prisma.assessment.findUnique({
      where: { id: assessmentId },
      select: {
        id: true,
        submittedAt: true,
        rubricKey: true,
        moment: true,
        studentId: true,
      },
    });

    if (!assessment) {
      return NextResponse.json(
        { ok: false, error: "ASSESSMENT_NOT_FOUND" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      ok: true,
      assessment,
    });
  } catch (error) {
    console.error("GET /api/assessments/[assessmentId] failed", error);

    return NextResponse.json(
      {
        ok: false,
        error: "ASSESSMENT_READ_FAILED",
      },
      { status: 500 }
    );
  }
}