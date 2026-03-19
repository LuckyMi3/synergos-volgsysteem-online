import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUserId } from "@/lib/auth/session";

export const runtime = "nodejs";

type MaxStage = "BASISJAAR" | "1VO" | "2VO" | "3VO" | null;

type EnrollmentLike = {
  id: string;
  cohort: {
    id: string;
    naam: string;
    uitvoeringId: string;
    traject: string | null;
  } | null;
};

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

  // verwacht bv "25/26"
  const match = s.match(/^(\d{2})\s*\/\s*(\d{2})$/);
  if (!match) return -1;

  const start = Number(match[1]);
  const end = Number(match[2]);

  if (Number.isNaN(start) || Number.isNaN(end)) return -1;

  return start * 100 + end;
}

function chooseActiveEnrollment(enrollments: EnrollmentLike[]): EnrollmentLike | null {
  if (!enrollments.length) return null;

  const sorted = [...enrollments].sort((a, b) => {
    const aStage = stageRank(trajectToStage(a.cohort?.traject));
    const bStage = stageRank(trajectToStage(b.cohort?.traject));

    if (aStage !== bStage) return bStage - aStage;

    const aUitvoering = uitvoeringRank(a.cohort?.uitvoeringId);
    const bUitvoering = uitvoeringRank(b.cohort?.uitvoeringId);

    if (aUitvoering !== bUitvoering) return bUitvoering - aUitvoering;

    const aNaam = a.cohort?.naam ?? "";
    const bNaam = b.cohort?.naam ?? "";

    return aNaam.localeCompare(bNaam, "nl");
  });

  return sorted[0] ?? null;
}

export async function GET() {
  try {
    const userId = await getSessionUserId();

    if (!userId) {
      return NextResponse.json(
        { ok: false, error: "NOT_AUTHENTICATED" },
        { status: 401 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        role: true,
        email: true,
        voornaam: true,
        tussenvoegsel: true,
        achternaam: true,
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
      return NextResponse.json(
        { ok: false, error: "USER_NOT_FOUND" },
        { status: 404 }
      );
    }

    const credential = await prisma.studentCredential.upsert({
      where: { userId },
      update: {},
      create: { userId },
    });

    const normalizedEnrollments: EnrollmentLike[] = user.enrollments
      .filter((e) => e.cohort)
      .map((e) => ({
        id: e.id,
        cohort: e.cohort
          ? {
              id: e.cohort.id,
              naam: e.cohort.naam,
              uitvoeringId: e.cohort.uitvoeringId,
              traject: e.cohort.traject,
            }
          : null,
      }));

    let maxStage: MaxStage = null;
    let bestStageRank = -1;

    for (const enrollment of normalizedEnrollments) {
      const stage = trajectToStage(enrollment.cohort?.traject);
      const rank = stageRank(stage);

      if (rank > bestStageRank) {
        bestStageRank = rank;
        maxStage = stage;
      }
    }

    const activeEnrollment = chooseActiveEnrollment(normalizedEnrollments);

    return NextResponse.json({
      ok: true,
      user: {
        id: user.id,
        role: user.role,
        email: user.email,
        voornaam: user.voornaam,
        tussenvoegsel: user.tussenvoegsel,
        achternaam: user.achternaam,
      },
      enrollments: normalizedEnrollments,
      activeEnrollment,
      maxStage,
      credential,
    });
  } catch (error) {
    console.error("GET /api/student/dossier failed", error);

    return NextResponse.json(
      { ok: false, error: "INTERNAL_SERVER_ERROR" },
      { status: 500 }
    );
  }
}