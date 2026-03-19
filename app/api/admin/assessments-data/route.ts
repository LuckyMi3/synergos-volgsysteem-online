import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET() {
  // Alleen STUDENT enrollments (docent/admin niet meetellen)
  const enrollments = await prisma.enrollment.findMany({
    where: { user: { role: "STUDENT" } },
    include: {
      user: true,
      cohort: true,
    },
    orderBy: [
      { cohort: { uitvoeringId: "asc" } },
      { cohort: { naam: "asc" } },
      { user: { achternaam: "asc" } },
      { user: { voornaam: "asc" } },
    ],
  });

  const rows = enrollments.map((e) => ({
    id: e.id,
    studentName: [e.user.voornaam, e.user.tussenvoegsel, e.user.achternaam]
      .filter(Boolean)
      .join(" "),
    userId: e.user.id,
    cohortName: e.cohort.naam,
    cohortId: e.cohort.id,
    uitvoeringId: e.cohort.uitvoeringId,
    assessmentLocked: e.assessmentLocked,
  }));

  return NextResponse.json(rows);
}