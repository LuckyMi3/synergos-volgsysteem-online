import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const ORDER: Record<string, number> = { M1: 1, M2: 2, M3: 3 };

function parseMoments(momentsParam: string | null) {
  if (!momentsParam) return [];
  return momentsParam
    .split(",")
    .map((s) => s.trim())
    .filter((m) => m === "M1" || m === "M2" || m === "M3")
    .sort((a, b) => (ORDER[a] ?? 99) - (ORDER[b] ?? 99));
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);

    const studentId = searchParams.get("studentId")?.trim();
    const rubricKey = searchParams.get("rubricKey")?.trim();
    const teacherId = searchParams.get("teacherId")?.trim();
    const moments = parseMoments(searchParams.get("moments"));

    if (!studentId) return NextResponse.json({ error: "studentId is required" }, { status: 400 });
    if (!rubricKey) return NextResponse.json({ error: "rubricKey is required" }, { status: 400 });
    if (!teacherId) return NextResponse.json({ error: "teacherId is required" }, { status: 400 });
    if (moments.length === 0) {
      return NextResponse.json({ error: "moments is required (e.g. M1,M2)" }, { status: 400 });
    }

    const assessments = await prisma.assessment.findMany({
      where: {
        studentId,
        rubricKey,
        moment: { in: moments as any },
      },
      include: {
        scores: {
          orderBy: [{ themeId: "asc" }, { questionId: "asc" }],
        },
        teacherScores: {
          where: { teacherId },
          orderBy: [{ themeId: "asc" }, { questionId: "asc" }],
        },
        teacherReviews: {
          where: { teacherId },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    const payload = assessments
      .slice()
      .sort((a: any, b: any) => (ORDER[a.moment] ?? 99) - (ORDER[b.moment] ?? 99))
      .map((a: any) => ({
        moment: a.moment,
        assessmentId: a.id,
        studentId: a.studentId,
        rubricKey: a.rubricKey,
        scores: a.scores.map((s: any) => ({
          id: s.id,
          themeId: s.themeId,
          questionId: s.questionId,
          score: s.score,
          comment: s.comment,
          updatedAt: s.updatedAt,
        })),
        teacherScores: a.teacherScores.map((t: any) => ({
          id: t.id,
          themeId: t.themeId,
          questionId: t.questionId,
          correctedScore: t.correctedScore,
          feedback: t.feedback,
          updatedAt: t.updatedAt,
        })),
        teacherReview: a.teacherReviews?.[0]
          ? {
              id: a.teacherReviews[0].id,
              status: a.teacherReviews[0].status,
              feedback: a.teacherReviews[0].feedback,
              correctedScore: a.teacherReviews[0].correctedScore,
              publishedAt: a.teacherReviews[0].publishedAt,
              updatedAt: a.teacherReviews[0].updatedAt,
            }
          : null,
      }));

    return NextResponse.json({ assessments: payload });
  } catch (error) {
    console.error("Assessment bundle error:", error);
    return NextResponse.json({ error: "Failed to fetch assessment bundle" }, { status: 500 });
  }
}