import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const assessmentId = typeof body?.assessmentId === "string" ? body.assessmentId.trim() : "";
    const teacherId = typeof body?.teacherId === "string" ? body.teacherId.trim() : "";

    if (!assessmentId || !teacherId) {
      return NextResponse.json(
        { error: "assessmentId and teacherId are required" },
        { status: 400 }
      );
    }

    // Zorg dat assessment bestaat
    const assessment = await prisma.assessment.findUnique({ where: { id: assessmentId } });
    if (!assessment) {
      return NextResponse.json({ error: "Assessment not found" }, { status: 404 });
    }

    // Publiceer alleen je eigen review (of maak 'm aan als die nog niet bestaat)
    const review = await prisma.teacherReview.upsert({
      where: { assessment_teacher: { assessmentId, teacherId } },
      create: {
        assessmentId,
        teacherId,
        correctedScore: null,
        feedback: null,
        status: "PUBLISHED",
        publishedAt: new Date(),
      },
      update: {
        status: "PUBLISHED",
        publishedAt: new Date(),
      },
    });

    return NextResponse.json(review);
  } catch (error) {
    console.error("Publish teacher review error:", error);
    return NextResponse.json({ error: "Failed to publish teacher review" }, { status: 500 });
  }
}