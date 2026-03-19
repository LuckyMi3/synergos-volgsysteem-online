import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

export const runtime = "nodejs";
const prisma = new PrismaClient();

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const cohortId = searchParams.get("cohortId");

  if (!cohortId) {
    return NextResponse.json({ ok: false, error: "cohortId ontbreekt" }, { status: 400 });
  }

  const enrollments = await prisma.enrollment.findMany({
    where: { cohortId },
    include: { user: true },
    orderBy: { createdAt: "asc" },
  });

  const studentEnrollments = enrollments.filter((e) => e.user.role === "STUDENT");
  const userIds = studentEnrollments.map((e) => e.userId);

  const creds = await prisma.studentCredential.findMany({
    where: { userId: { in: userIds } },
  });

  const byUserId = new Map(creds.map((c) => [c.userId, c]));

  const rows = studentEnrollments.map((e) => {
    const u = e.user;
    const c: any = byUserId.get(u.id);

    return {
      userId: u.id,
      name: [u.voornaam, u.tussenvoegsel, u.achternaam].filter(Boolean).join(" "),
      email: u.email ?? null,

      // bekwaamheid
      mbkCompleted: c?.mbkCompleted ?? false,
      psbkCompleted: c?.psbkCompleted ?? false,
      exam1Completed: c?.exam1Completed ?? false,
      exam2Completed: c?.exam2Completed ?? false,
      exam3Completed: c?.exam3Completed ?? false,

      // praktijkvorming (✅ nodig voor Praktijkfase in cohortoverzicht)
      leertherapieCount: c?.leertherapieCount ?? 0,
      intervisieCount: c?.intervisieCount ?? 0,
      supervisieCount: c?.supervisieCount ?? 0,
      eindsupervisieDone: c?.eindsupervisieDone ?? false,
    };
  });

  return NextResponse.json({ ok: true, rows });
}

/**
 * POST is optioneel (jouw cohortoverzicht is read-only),
 * maar ik laat hem staan voor compatibiliteit.
 */
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const userId = String(body?.userId ?? "");
  const field = String(body?.field ?? "");
  const value = Boolean(body?.value);

  const allowed = new Set([
    "mbkCompleted",
    "psbkCompleted",
    "exam1Completed",
    "exam2Completed",
    "exam3Completed",
  ]);

  if (!userId || !allowed.has(field)) {
    return NextResponse.json({ ok: false, error: "Ongeldige invoer" }, { status: 400 });
  }

  const updated = await prisma.studentCredential.upsert({
    where: { userId },
    create: { userId, [field]: value } as any,
    update: { [field]: value } as any,
  });

  return NextResponse.json({ ok: true, credential: updated });
}