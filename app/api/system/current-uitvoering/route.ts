import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

// Moet exact gelijk zijn aan admin endpoint
const KEY = "CURRENT_UITVOERING_ID";
const DEFAULT_VALUE = "25/26";

export async function GET() {
  const setting = await prisma.systemSetting.upsert({
    where: { key: KEY },
    update: {},
    create: { key: KEY, value: DEFAULT_VALUE },
    select: { value: true },
  });

  // Shape: { ok:true, uitvoeringId:"25/26" }
  return NextResponse.json({ ok: true, uitvoeringId: setting.value });
}