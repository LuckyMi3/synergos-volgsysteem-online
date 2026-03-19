import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Role } from "@prisma/client";

export async function GET() {
  try {
    const students = await prisma.user.findMany({
      where: { role: Role.STUDENT },
      select: {
        id: true,
        crmCustomerId: true,
        voornaam: true,
        tussenvoegsel: true,
        achternaam: true,
        email: true,
        mobiel: true,
        role: true,
        createdAt: true,
      },
      orderBy: [{ achternaam: "asc" }, { voornaam: "asc" }],
    });

    return NextResponse.json({ ok: true, students });
  } catch (error) {
    console.error("Error fetching students:", error);
    return NextResponse.json({ ok: false, error: "Failed to fetch students" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const crmCustomerId =
      typeof body?.crmCustomerId === "string" ? body.crmCustomerId.trim() : "";
    const voornaam = typeof body?.voornaam === "string" ? body.voornaam.trim() : "";
    const tussenvoegsel =
      typeof body?.tussenvoegsel === "string" ? body.tussenvoegsel.trim() : "";
    const achternaam =
      typeof body?.achternaam === "string" ? body.achternaam.trim() : "";
    const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
    const mobiel = typeof body?.mobiel === "string" ? body.mobiel.trim() : "";

    if (!crmCustomerId || !voornaam || !achternaam || !email) {
      return NextResponse.json(
        { ok: false, error: "crmCustomerId, voornaam, achternaam, email zijn verplicht" },
        { status: 400 }
      );
    }

    const student = await prisma.user.create({
      data: {
        crmCustomerId,
        voornaam,
        tussenvoegsel: tussenvoegsel || null,
        achternaam,
        email,
        mobiel: mobiel || null,
        role: Role.STUDENT,
      },
      select: {
        id: true,
        crmCustomerId: true,
        voornaam: true,
        tussenvoegsel: true,
        achternaam: true,
        email: true,
        mobiel: true,
        role: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ ok: true, student }, { status: 201 });
  } catch (error: any) {
    console.error("Error creating student:", error);

    // Handige Prisma unique error voor crmCustomerId
    if (error?.code === "P2002") {
      return NextResponse.json(
        { ok: false, error: "crmCustomerId bestaat al" },
        { status: 409 }
      );
    }

    return NextResponse.json({ ok: false, error: "Failed to create student" }, { status: 500 });
  }
}