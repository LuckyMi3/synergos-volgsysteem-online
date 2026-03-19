import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

export const runtime = "nodejs";
const prisma = new PrismaClient();

const ALLOWED_FIELDS = new Set([
  // booleans
  "exam1Completed",
  "exam2Completed",
  "exam3Completed",
  "mbkCompleted",
  "psbkCompleted",
  "eindsupervisieDone",
  // ints
  "leertherapieCount",
  "intervisieCount",
  "supervisieCount",
]);

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId");

  if (!userId) {
    return NextResponse.json({ ok: false, error: "userId ontbreekt" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { voornaam: true, tussenvoegsel: true, achternaam: true },
  });

  if (!user) {
    return NextResponse.json({ ok: false, error: "user niet gevonden" }, { status: 404 });
  }

  const credential = await prisma.studentCredential.upsert({
    where: { userId },
    create: { userId },
    update: {},
  });

  return NextResponse.json({ ok: true, user, credential });
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const userId = String(body?.userId ?? "");
  const field = String(body?.field ?? "");

  if (!userId || !ALLOWED_FIELDS.has(field)) {
    return NextResponse.json({ ok: false, error: "ongeldige invoer" }, { status: 400 });
  }

  // typed value (bool/int)
  let value: any = body?.value;
  if (field.endsWith("Count")) value = Math.max(0, Number(value) || 0);
  if (field.endsWith("Completed") || field === "eindsupervisieDone") value = Boolean(value);

  const updated = await prisma.studentCredential.upsert({
    where: { userId },
    create: { userId, [field]: value },
    update: { [field]: value },
  });

  return NextResponse.json({ ok: true, credential: updated });
}