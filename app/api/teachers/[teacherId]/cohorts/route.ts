import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ teacherId: string }> }
) {
  const { teacherId } = await params;

  try {
    const cohorts = await prisma.cohort.findMany({
      where: {
        enrollments: {
          some: { userId: teacherId },
        },
      },
      orderBy: [{ createdAt: "desc" }],
      select: {
        id: true,
        naam: true,
        uitvoeringId: true,
        traject: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ cohorts });
  } catch (err) {
    console.error("GET /api/teachers/[teacherId]/cohorts failed:", err);

    return NextResponse.json(
      { error: "Failed to load cohorts" },
      { status: 500 }
    );
  }
}