import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const assessmentId = searchParams.get("assessmentId")?.trim();

    if (!assessmentId) {
      return NextResponse.json(
        { error: "assessmentId is required" },
        { status: 400 }
      );
    }

const reviews = await prisma.teacherReview.findMany({
  where: {
    assessmentId,
    status: "PUBLISHED",
  },
  include: {
    teacher: {
      select: {
        voornaam: true,
        tussenvoegsel: true,
        achternaam: true,
      },
    },
  },
  orderBy: {
    publishedAt: "asc",
  },
});
    return NextResponse.json(reviews);
  } catch (error) {
    console.error("Published teacher reviews error:", error);
    return NextResponse.json(
      { error: "Failed to fetch published teacher reviews" },
      { status: 500 }
    );
  }
}