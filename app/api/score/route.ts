import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const {
      assessmentId,
      themeId,
      questionId,
      score,
      comment
    } = body;

    if (!assessmentId || !themeId || !questionId || typeof score !== "number") {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const result = await prisma.score.upsert({
      where: {
  assessment_theme_question: {
    assessmentId,
    themeId,
    questionId,
  },
},
      update: {
        score,
        comment
      },
      create: {
        assessmentId,
        themeId,
        questionId,
        score,
        comment
      }
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Score upsert error:", error);
    return NextResponse.json(
      { error: "Failed to save score" },
      { status: 500 }
    );
  }
}
