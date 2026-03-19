import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUserId } from "@/lib/auth/session";

export const runtime = "nodejs";

type EnrollmentLike = {
  id: string;
  cohort: {
    id: string;
    naam: string;
    uitvoeringId: string;
    traject: string | null;
  } | null;
};

type MaxStage = "BASISJAAR" | "1VO" | "2VO" | "3VO" | null;

function trajectToStage(traject: string | null | undefined): MaxStage {
  const s = String(traject ?? "").toLowerCase();

  if (s.includes("3vo")) return "3VO";
  if (s.includes("2vo")) return "2VO";
  if (s.includes("1vo")) return "1VO";
  if (s.includes("basis")) return "BASISJAAR";

  return null;
}

function stageRank(stage: MaxStage) {
  if (stage === "BASISJAAR") return 0;
  if (stage === "1VO") return 1;
  if (stage === "2VO") return 2;
  if (stage === "3VO") return 3;
  return -1;
}

function uitvoeringRank(uitvoeringId: string | null | undefined) {
  const s = String(uitvoeringId ?? "").trim();
  const match = s.match(/^(\d{2})\s*\/\s*(\d{2})$/);
  if (!match) return -1;

  const start = Number(match[1]);
  const end = Number(match[2]);
  if (Number.isNaN(start) || Number.isNaN(end)) return -1;

  return start * 100 + end;
}

function chooseActiveEnrollment(enrollments: EnrollmentLike[]) {
  if (!enrollments.length) return null;

  const sorted = [...enrollments].sort((a, b) => {
    const aStage = stageRank(trajectToStage(a.cohort?.traject));
    const bStage = stageRank(trajectToStage(b.cohort?.traject));
    if (aStage !== bStage) return bStage - aStage;

    const aUitvoering = uitvoeringRank(a.cohort?.uitvoeringId);
    const bUitvoering = uitvoeringRank(b.cohort?.uitvoeringId);
    if (aUitvoering !== bUitvoering) return bUitvoering - aUitvoering;

    return (a.cohort?.naam ?? "").localeCompare(b.cohort?.naam ?? "", "nl");
  });

  return sorted[0] ?? null;
}

function normalizeRubricKey(input: string | null | undefined) {
  const s = String(input ?? "").trim().toLowerCase();

  if (s.includes("3vo")) return "3vo";
  if (s.includes("2vo")) return "2vo";
  if (s.includes("1vo")) return "1vo";
  if (s.includes("basis")) return "basisjaar";

  return s;
}

export async function GET() {
  try {
    const userId = await getSessionUserId();

    if (!userId) {
      return NextResponse.json({ ok: false, error: "NOT_AUTHENTICATED" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        enrollments: {
          select: {
            id: true,
            cohort: {
              select: {
                id: true,
                naam: true,
                uitvoeringId: true,
                traject: true,
              },
            },
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ ok: false, error: "USER_NOT_FOUND" }, { status: 404 });
    }

    const normalizedEnrollments: EnrollmentLike[] = user.enrollments
      .filter((enrollment) => enrollment.cohort)
      .map((enrollment) => ({
        id: enrollment.id,
        cohort: enrollment.cohort
          ? {
              id: enrollment.cohort.id,
              naam: enrollment.cohort.naam,
              uitvoeringId: enrollment.cohort.uitvoeringId,
              traject: enrollment.cohort.traject,
            }
          : null,
      }));

    const activeEnrollment = chooseActiveEnrollment(normalizedEnrollments);
    const rubricKey = normalizeRubricKey(activeEnrollment?.cohort?.traject);

    if (!activeEnrollment || !rubricKey) {
      return NextResponse.json({
        ok: true,
        activeEnrollment,
        rubricKey: null,
        assessments: [],
      });
    }

    const assessments = await prisma.assessment.findMany({
      where: {
        studentId: user.id,
        rubricKey,
        moment: { in: ["M1", "M2", "M3"] },
      },
      include: {
        scores: {
          orderBy: [{ themeId: "asc" }, { questionId: "asc" }],
        },
        teacherReviews: {
          where: { status: "PUBLISHED" },
          orderBy: [{ publishedAt: "desc" }, { updatedAt: "desc" }],
        },
      },
      orderBy: [{ moment: "asc" }, { createdAt: "asc" }],
    });

    const payload = await Promise.all(
      assessments.map(async (assessment) => {
        const publishedReview = assessment.teacherReviews[0] ?? null;

        const teacherScores = publishedReview
          ? await prisma.teacherScore.findMany({
              where: {
                assessmentId: assessment.id,
                teacherId: publishedReview.teacherId,
              },
              orderBy: [{ themeId: "asc" }, { questionId: "asc" }],
            })
          : [];

        return {
          assessmentId: assessment.id,
          moment: assessment.moment,
          rubricKey: assessment.rubricKey,
          scores: assessment.scores.map((score) => ({
            id: score.id,
            themeId: score.themeId,
            questionId: score.questionId,
            score: score.score,
            comment: score.comment,
            updatedAt: score.updatedAt,
          })),
          teacherScores: teacherScores.map((teacherScore) => ({
            id: teacherScore.id,
            themeId: teacherScore.themeId,
            questionId: teacherScore.questionId,
            correctedScore: teacherScore.correctedScore,
            feedback: teacherScore.feedback,
            updatedAt: teacherScore.updatedAt,
          })),
          teacherReview: publishedReview
            ? {
                id: publishedReview.id,
                teacherId: publishedReview.teacherId,
                correctedScore: publishedReview.correctedScore,
                feedback: publishedReview.feedback,
                publishedAt: publishedReview.publishedAt,
                updatedAt: publishedReview.updatedAt,
              }
            : null,
        };
      })
    );

    return NextResponse.json({
      ok: true,
      activeEnrollment,
      rubricKey,
      assessments: payload,
    });
  } catch (error) {
    console.error("GET /api/student/profile-bundle failed", error);
    return NextResponse.json(
      { ok: false, error: "PROFILE_BUNDLE_READ_FAILED" },
      { status: 500 }
    );
  }
}