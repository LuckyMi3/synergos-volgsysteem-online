import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

export const runtime = "nodejs";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };
const prisma = globalForPrisma.prisma ?? new PrismaClient();
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

/**
 * POST /api/cohorts
 * Body: { uitvoeringId: string, naam: string, traject?: string | null }
 *
 * Let op: uitvoeringId is in schema NIET unique (unique is id of uitvoeringId_naam compound),
 * dus we doen findFirst + update/create i.p.v. upsert(where: { uitvoeringId }).
 */
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));

    const uitvoeringId = String(body?.uitvoeringId ?? "").trim();
    const naam = String(body?.naam ?? "").trim();
    const trajectRaw = body?.traject;
    const traject =
      trajectRaw === null || trajectRaw === undefined
        ? null
        : String(trajectRaw).toLowerCase().trim() || null;

    if (!uitvoeringId) {
      return NextResponse.json({ ok: false, error: "Missing uitvoeringId" }, { status: 400 });
    }
    if (!naam) {
      return NextResponse.json({ ok: false, error: "Missing naam" }, { status: 400 });
    }

    const existing = await prisma.cohort.findFirst({
      where: { uitvoeringId },
      select: { id: true },
    });

    if (existing) {
      const updated = await prisma.cohort.update({
        where: { id: existing.id },
        data: { naam, traject },
        select: { id: true, uitvoeringId: true, naam: true, traject: true },
      });

      return NextResponse.json({ ok: true, mode: "updated", cohort: updated });
    }

    const created = await prisma.cohort.create({
      data: { uitvoeringId, naam, traject },
      select: { id: true, uitvoeringId: true, naam: true, traject: true },
    });

    return NextResponse.json({ ok: true, mode: "created", cohort: created });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message ?? "Unknown error" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/cohorts
 * lijstje (handig voor debug/admin tooling)
 */
export async function GET() {
  const cohorts = await prisma.cohort.findMany({
    orderBy: [{ uitvoeringId: "asc" }, { naam: "asc" }],
    select: { id: true, uitvoeringId: true, naam: true, traject: true, createdAt: true },
  });

  return NextResponse.json({ ok: true, cohorts });
}