import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET() {
  const cohorts = await prisma.cohort.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      enrollments: {
        include: { user: true },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  const payload = cohorts.map((c) => ({
    id: c.id,
    uitvoeringId: c.uitvoeringId,
    naam: c.naam,
    traject: c.traject,
    enrollments: c.enrollments.map((e) => ({
      id: e.id,
      trajectStatus: e.trajectStatus,
      coachNaam: e.coachNaam,
      user: {
        id: e.user.id,
        crmCustomerId: e.user.crmCustomerId,
        voornaam: e.user.voornaam,
        tussenvoegsel: e.user.tussenvoegsel,
        achternaam: e.user.achternaam,
        email: e.user.email,
        mobiel: e.user.mobiel,
        role: e.user.role,
      },
    })),
  }));

  return NextResponse.json(payload);
}
