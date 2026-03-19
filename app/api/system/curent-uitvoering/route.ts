import { NextResponse } from "next/server";

// ⚠️ DEPRECATED: typo-route. Gebruik /api/system/current-uitvoering
export const runtime = "nodejs";

export async function GET(req: Request) {
  const url = new URL(req.url);
  url.pathname = "/api/system/current-uitvoering";
  const res = await fetch(url.toString(), { cache: "no-store" });
  const body = await res.text();
  return new NextResponse(body, {
    status: res.status,
    headers: { "content-type": res.headers.get("content-type") ?? "application/json" },
  });
}