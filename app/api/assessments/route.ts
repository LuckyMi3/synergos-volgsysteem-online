import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const studentId = typeof body?.studentId === "string" ? body.studentId : "";
    const moment = typeof body?.moment === "string" ? body.moment.trim() : "";
    const rubricKey = typeof body?.rubricKey === "string" ? body.rubricKey.trim() : "";

    if (!studentId) {
      return NextResponse.json({ error: "studentId is required" }, { status: 400 });
    }
    if (!moment) {
      return NextResponse.json({ error: "moment is required" }, { status: 400 });
    }
    if (!rubricKey) {
      return NextResponse.json({ error: "rubricKey is required" }, { status: 400 });
    }

    const assessment = await prisma.assessment.create({
      data: {
        studentId,
        moment,
        rubricKey
      }
    });

    return NextResponse.json(assessment, { status: 201 });
  } catch (error) {
    console.error("Error creating assessment:", error);
    return NextResponse.json({ error: "Failed to create assessment" }, { status: 500 });
  }
}
