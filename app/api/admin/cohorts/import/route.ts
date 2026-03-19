import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

export const runtime = "nodejs";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };
const prisma = globalForPrisma.prisma ?? new PrismaClient();
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

function normHeader(s: string) {
  return String(s || "")
    .trim()
    .toLowerCase()
    .replace(/\uFEFF/g, "") // BOM
    .replace(/\s+/g, "")
    .replace(/[-_]/g, "");
}

function detectDelimiter(firstLine: string) {
  const semi = (firstLine.match(/;/g) || []).length;
  const comma = (firstLine.match(/,/g) || []).length;
  return semi > comma ? ";" : ",";
}

// simpele CSV line parser met quotes support
function parseLine(line: string, delim: string) {
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];

    if (ch === '"') {
      // double quote escape: ""
      const next = line[i + 1];
      if (inQuotes && next === '"') {
        cur += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (!inQuotes && ch === delim) {
      out.push(cur);
      cur = "";
      continue;
    }

    cur += ch;
  }
  out.push(cur);
  return out.map((v) => v.trim());
}

function pick(row: string[], idx: number | undefined) {
  if (idx == null) return "";
  return String(row[idx] ?? "").trim();
}

// accepteer verschillende header-namen uit Apollo/export
function findIndex(headers: string[], candidates: string[]) {
  const normalized = headers.map(normHeader);
  for (const c of candidates) {
    const i = normalized.indexOf(normHeader(c));
    if (i >= 0) return i;
  }
  return undefined;
}

export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const file = form.get("file");

    if (!file || !(file instanceof Blob)) {
      return NextResponse.json(
        { ok: false, error: "Geen bestand ontvangen (field name: file)." },
        { status: 400 }
      );
    }

    const text = await file.text();
    const lines = text
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    if (lines.length < 2) {
      return NextResponse.json(
        { ok: false, error: "CSV lijkt leeg (minstens header + 1 regel nodig)." },
        { status: 400 }
      );
    }

    const delim = detectDelimiter(lines[0]);
    const headers = parseLine(lines[0], delim);

    const idxUitvoeringId = findIndex(headers, [
      "uitvoeringId",
      "uitvoering",
      "executionId",
      "cohortId",
      "cohort",
      "schooljaar",
    ]);
    const idxNaam = findIndex(headers, ["naam", "title", "naamuitvoering", "name"]);
    const idxTraject = findIndex(headers, ["traject", "rubrickey", "rubricKey", "opleiding"]);

    if (idxUitvoeringId == null) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Kolom 'uitvoeringId' niet gevonden. Verwacht header zoals: uitvoeringId / uitvoering / schooljaar / cohortId.",
          headers,
        },
        { status: 400 }
      );
    }

    if (idxNaam == null) {
      return NextResponse.json(
        {
          ok: false,
          error: "Kolom 'naam' niet gevonden. Verwacht header zoals: naam / title / name.",
          headers,
        },
        { status: 400 }
      );
    }

    let created = 0;
    let updated = 0;
    const errors: Array<{ line: number; error: string; uitvoeringId?: string }> = [];

    // vanaf regel 2
    for (let li = 1; li < lines.length; li++) {
      const row = parseLine(lines[li], delim);

      const uitvoeringId = pick(row, idxUitvoeringId);
      const naam = pick(row, idxNaam);
      const trajectRaw = pick(row, idxTraject);
      const traject = trajectRaw ? trajectRaw.toLowerCase().trim() : null;

      if (!uitvoeringId) {
        errors.push({ line: li + 1, error: "uitvoeringId is leeg" });
        continue;
      }
      if (!naam) {
        errors.push({ line: li + 1, error: "naam is leeg", uitvoeringId });
        continue;
      }

      try {
        // ✅ NIET findUnique op uitvoeringId (schema heeft geen unique daarop)
        const existing = await prisma.cohort.findFirst({
          where: { uitvoeringId },
          select: { id: true },
        });

        if (existing) {
          await prisma.cohort.update({
            where: { id: existing.id },
            data: {
              naam,
              traject: traject || null,
            },
          });
          updated++;
        } else {
          await prisma.cohort.create({
            data: {
              uitvoeringId,
              naam,
              traject: traject || null,
            },
          });
          created++;
        }
      } catch (e: any) {
        errors.push({
          line: li + 1,
          uitvoeringId,
          error: e?.message ?? "onbekende fout",
        });
      }
    }

    return NextResponse.json({
      ok: true,
      created,
      updated,
      errors,
      total: lines.length - 1,
      delimiter: delim,
      headers,
    });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message ?? "import failed" },
      { status: 500 }
    );
  }
}