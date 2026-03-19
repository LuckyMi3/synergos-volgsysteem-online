import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(_request: Request, { params }: { params: any }) {
  try {
    const { id } = await params;

    const enrollment = await prisma.enrollment.update({
      where: { id: String(id) },
      data: { assessmentLocked: false },
    });

    return NextResponse.json({ success: true, enrollment });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { success: false, message: "Unlock failed" },
      { status: 500 }
    );
  }
}
