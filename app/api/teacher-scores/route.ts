import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const assessmentId = searchParams.get("assessmentId")?.trim();
  const teacherId = searchParams.get("teacherId")?.trim(); // optioneel

  if (!assessmentId) {
    return NextResponse.json({ error: "assessmentId is required" }, { status: 400 });
  }

  const rows = await prisma.teacherScore.findMany({
    where: {
      assessmentId,
      ...(teacherId ? { teacherId } : {}),
    },
    include: {
      teacher: {
        select: {
          id: true,
          voornaam: true,
          tussenvoegsel: true,
          achternaam: true,
        },
      },
    },
    orderBy: [{ themeId: "asc" }, { questionId: "asc" }],
  });

  return NextResponse.json(rows);
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const assessmentId =
      typeof body?.assessmentId === "string" ? body.assessmentId.trim() : "";
    const teacherId =
      typeof body?.teacherId === "string" ? body.teacherId.trim() : "";
    const themeId =
      typeof body?.themeId === "string" ? body.themeId.trim() : "";
    const questionId =
      typeof body?.questionId === "string" ? body.questionId.trim() : "";

    const correctedScore =
      typeof body?.correctedScore === "number" ? body.correctedScore : null;

    const feedback =
      typeof body?.feedback === "string" ? body.feedback : null;

    if (!assessmentId || !teacherId || !themeId || !questionId) {
      return NextResponse.json(
        { error: "assessmentId, teacherId, themeId, questionId are required" },
        { status: 400 }
      );
    }

    const row = await prisma.teacherScore.upsert({
      where: {
        // @@unique([assessmentId, teacherId, themeId, questionId])
        assessment_teacher_theme_question: {
          assessmentId,
          teacherId,
          themeId,
          questionId,
        },
      },
      create: {
        assessmentId,
        teacherId,
        themeId,
        questionId,
        correctedScore,
        feedback: feedback?.trim() ? feedback : null,
      },
      update: {
        correctedScore,
        feedback: feedback?.trim() ? feedback : null,
      },
      include: {
        teacher: {
          select: {
            id: true,
            voornaam: true,
            tussenvoegsel: true,
            achternaam: true,
          },
        },
      },
    });

    return NextResponse.json(row);
  } catch (error) {
    console.error("TeacherScore upsert error:", error);
    return NextResponse.json(
      { error: "Failed to save teacher score" },
      { status: 500 }
    );
  }
}