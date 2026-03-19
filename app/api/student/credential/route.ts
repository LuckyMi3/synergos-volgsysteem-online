import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

export const runtime = "nodejs";
const prisma = new PrismaClient();

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId");

  // Tijdelijk (localhost): later vervangen door auth/session
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

  // Read-only endpoint, maar we zorgen dat er altijd een record is
  const credential = await prisma.studentCredential.upsert({
    where: { userId },
    create: { userId },
    update: {},
  });

  return NextResponse.json({ ok: true, user, credential });
} 