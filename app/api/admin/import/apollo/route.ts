import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

export const runtime = "nodejs";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };
const prisma = globalForPrisma.prisma ?? new PrismaClient();
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

function detectDelimiter(firstLine: string) {
  const semi = (firstLine.match(/;/g) || []).length;
  const comma = (firstLine.match(/,/g) || []).length;
  return semi > comma ? ";" : ",";
}

function parseLine(line: string, delim: string) {
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];

    if (ch === '"') {
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
  return out.map((v) => String(v ?? "").trim());
}

function normHeader(s: string) {
  return String(s || "")
    .trim()
    .toLowerCase()
    .replace(/\uFEFF/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function idx(headers: string[], name: string) {
  const target = normHeader(name);
  const hs = headers.map(normHeader);
  const i = hs.indexOf(target);
  return i >= 0 ? i : -1;
}

function pick(row: string[], i: number) {
  return i >= 0 ? String(row[i] ?? "").trim() : "";
}

function roleToUserRole(v: string): "STUDENT" | "TEACHER" | "ADMIN" {
  const s = (v || "").toLowerCase();
  if (s.includes("docent") || s.includes("teacher")) return "TEACHER";
  if (s.includes("admin")) return "ADMIN";
  return "STUDENT";
}

function inferTrajectFromNameOrCourses(naamUitvoering: string, courses: string) {
  const s = `${naamUitvoering} ${courses}`.toLowerCase();
  if (s.includes("basis")) return "basisjaar";
  if (s.includes("1vo")) return "1vo";
  if (s.includes("2vo")) return "2vo";
  if (s.includes("3vo")) return "3vo";
  return null;
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
        { ok: false, error: "CSV lijkt leeg (header + minimaal 1 rij nodig)." },
        { status: 400 }
      );
    }

    const delim = detectDelimiter(lines[0]);
    const headers = parseLine(lines[0], delim);

    // Exact Apollo kolommen
    const iNaamUitvoering = idx(headers, "Naam uitvoering");
    const iUitvoeringId = idx(headers, "Uitvoering ID");
    const iRol = idx(headers, "Rol");
    const iCoach = idx(headers, "Coach");
    const iVoornaam = idx(headers, "Voornaam");
    const iVanDe = idx(headers, "van de");
    const iAchternaam = idx(headers, "Achternaam");
    const iEmail = idx(headers, "Emailadres");
    const iKlantnr = idx(headers, "Klantnummer");
    const iCourses = idx(headers, "Courses");
    const iTrajectStatus = idx(headers, "TrajectStatus");

    if (iNaamUitvoering < 0 || iUitvoeringId < 0 || iEmail < 0) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Vereiste kolommen ontbreken. Vereist minimaal: Naam uitvoering, Uitvoering ID, Emailadres.",
          headers,
          delimiter: delim,
        },
        { status: 400 }
      );
    }

    let cohortCreated = 0;
    let cohortUpdated = 0;

    let usersCreated = 0;
    let usersUpdated = 0;

    let enrollCreated = 0;
    let enrollUpdated = 0;

    const errors: Array<{ line: number; error: string; email?: string }> = [];

    for (let li = 1; li < lines.length; li++) {
      const row = parseLine(lines[li], delim);

      // ✅ rij-safe: 1 slechte rij mag nooit alles slopen
      try {
        const naamUitvoering = pick(row, iNaamUitvoering);
        const uitvoeringId = pick(row, iUitvoeringId);
        const emailRaw = pick(row, iEmail);
        const email = emailRaw.toLowerCase();
        const rolRaw = pick(row, iRol);
        const coachNaam = pick(row, iCoach);
        const voornaam = pick(row, iVoornaam);
        const tussenvoegsel = pick(row, iVanDe);
        const achternaam = pick(row, iAchternaam);
        const crmCustomerId = pick(row, iKlantnr) || null;
        const courses = pick(row, iCourses);
        const trajectStatus = pick(row, iTrajectStatus) || null;

        if (!uitvoeringId || !naamUitvoering) {
          errors.push({
            line: li + 1,
            email: emailRaw,
            error: "Naam uitvoering / Uitvoering ID leeg",
          });
          continue;
        }

        if (!email || !email.includes("@")) {
          errors.push({
            line: li + 1,
            email: emailRaw,
            error: "Emailadres ongeldig/leeg",
          });
          continue;
        }

        // 1) Uitvoering upsert (schooljaar)
        await prisma.uitvoering.upsert({
          where: { id: uitvoeringId },
          update: {},
          create: { id: uitvoeringId },
        });

        // 2) Cohort upsert (procesgroep binnen uitvoering) via compound unique
        const inferredTraject = inferTrajectFromNameOrCourses(naamUitvoering, courses);

        const existingCohort = await prisma.cohort.findUnique({
          where: {
            uitvoeringId_naam: {
              uitvoeringId,
              naam: naamUitvoering,
            },
          },
          select: { id: true },
        });

        const cohort = await prisma.cohort.upsert({
          where: {
            uitvoeringId_naam: {
              uitvoeringId,
              naam: naamUitvoering,
            },
          },
          update: {
            // naam niet updaten: compound key zou dan veranderen.
            ...(inferredTraject ? { traject: inferredTraject } : {}),
          },
          create: {
            uitvoeringId,
            naam: naamUitvoering,
            traject: inferredTraject,
          },
          select: { id: true },
        });

        if (existingCohort) cohortUpdated++;
        else cohortCreated++;

        // 3) User create/update op basis van email (email is NIET unique in schema)
        const userRole = roleToUserRole(rolRaw);

        const existingUser = await prisma.user.findFirst({
          where: { email },
          select: { id: true },
        });

        let user: { id: string };

        if (existingUser) {
          user = await prisma.user.update({
            where: { id: existingUser.id },
            data: {
              ...(voornaam ? { voornaam } : {}),
              ...(tussenvoegsel ? { tussenvoegsel } : {}),
              ...(achternaam ? { achternaam } : {}),
              crmCustomerId,
              role: userRole,
              email,
            },
            select: { id: true },
          });
          usersUpdated++;
        } else {
          user = await prisma.user.create({
            data: {
              email,
              voornaam: voornaam || "",
              tussenvoegsel: tussenvoegsel || null,
              achternaam: achternaam || "",
              crmCustomerId,
              role: userRole,
            },
            select: { id: true },
          });
          usersCreated++;
        }

        // 4) Enrollment upsert (unique: userId_cohortId)
        const existingEnroll = await prisma.enrollment.findUnique({
          where: { userId_cohortId: { userId: user.id, cohortId: cohort.id } },
          select: { id: true },
        });

        await prisma.enrollment.upsert({
          where: { userId_cohortId: { userId: user.id, cohortId: cohort.id } },
          update: {
            coachNaam: coachNaam || null,
            trajectStatus,
          },
          create: {
            userId: user.id,
            cohortId: cohort.id,
            coachNaam: coachNaam || null,
            trajectStatus,
          },
        });

        if (existingEnroll) enrollUpdated++;
        else enrollCreated++;
      } catch (e: any) {
        errors.push({
          line: li + 1,
          email: pick(row, iEmail),
          error: e?.message ?? String(e),
        });
        continue;
      }
    }

    return NextResponse.json({
      ok: true,
      totalRows: lines.length - 1,
      cohortCreated,
      cohortUpdated,
      usersCreated,
      usersUpdated,
      enrollCreated,
      enrollUpdated,
      errors,
      delimiter: delim,
      headers,
    });
  } catch (e: any) {
    console.error("APOLLO IMPORT FATAL", e);
    return NextResponse.json(
      {
        ok: false,
        error: e?.message ?? "Apollo import failed",
        stack: process.env.NODE_ENV !== "production" ? (e?.stack ?? null) : null,
      },
      { status: 500 }
    );
  }
}