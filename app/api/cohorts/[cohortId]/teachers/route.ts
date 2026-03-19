import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ cohortId: string }> }
) {
  const { cohortId } = await params;
  const body = await req.json();
  const { teacherIds } = body ?? {};

  if (!Array.isArray(teacherIds) || teacherIds.length === 0) {
    return NextResponse.json(
      { ok: false, error: "teacherIds (array) is required" },
      { status: 400 }
    );
  }

  await prisma.enrollment.createMany({
    data: teacherIds.map((teacherId: string) => ({
      cohortId,
      userId: teacherId,
    })),
    skipDuplicates: true,
  });

  const enrollments = await prisma.enrollment.findMany({
    where: {
      cohortId,
      user: { role: { in: ["TEACHER", "ADMIN"] } },
    },
    include: { user: true },
    orderBy: { createdAt: "asc" },
  });

  const teachers = enrollments.map((e) => ({
    enrollmentId: e.id,
    userId: e.userId,
    coachNaam: e.coachNaam,
    trajectStatus: e.trajectStatus,
    assessmentLocked: e.assessmentLocked,
    createdAt: e.createdAt,
    user: e.user,
  }));

  return NextResponse.json({ ok: true, teachers });
}