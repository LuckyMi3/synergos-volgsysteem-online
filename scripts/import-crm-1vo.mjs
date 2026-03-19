import fs from "node:fs";
import path from "node:path";
import xlsx from "xlsx";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const FILE = path.resolve(process.cwd(), "data", "CRMExport-20022026.xlsx");
const SHEET = "CustomerTemplate-Persoon";

const clean = (v) => {
  if (v === undefined || v === null) return null;
  const s = String(v).trim();
  return s.length ? s : null;
};

function mapRole(raw) {
  const v = (raw || "").toString().toLowerCase();
  if (v.includes("docent") || v.includes("teacher")) return "TEACHER";
  if (v.includes("admin")) return "ADMIN";
  return "STUDENT";
}

async function main() {
  if (!fs.existsSync(FILE)) throw new Error(`Bestand niet gevonden: ${FILE}`);

  const wb = xlsx.readFile(FILE);
  const ws = wb.Sheets[SHEET];
  if (!ws) throw new Error(`Sheet niet gevonden: ${SHEET}`);

  const rows = xlsx.utils.sheet_to_json(ws, { defval: "" });

  let createdUsers = 0;
  let updatedUsers = 0;
  let createdCohorts = 0;
  let createdEnrollments = 0;

  for (const r of rows) {
    // ⚠️ Deze kolomnamen moeten exact matchen met jouw export
    const crmCustomerId = clean(r["Klantnummer"]);
    const voornaam = clean(r["Voornaam"]);
    const tussenvoegsel = clean(r["Tussenvoegsel"]) || clean(r["van de"]);
    const achternaam = clean(r["Achternaam"]);
    const email = clean(r["Email"]) || clean(r["Emailadres"]);
    const mobiel = clean(r["Mobiel"]) || clean(r["Mobiel nummer"]);
    const role = mapRole(r["Rol"]);

    const uitvoeringId = clean(r["Uitvoering ID"]);
    const uitvoeringNaam = clean(r["Naam uitvoering"]);
    const traject = clean(r["Traject"]);
    const trajectStatus = clean(r["TrajectStatus"]);
    const coachNaam = clean(r["Coach"]);

    if (!crmCustomerId || !email || !uitvoeringId || !uitvoeringNaam) continue;

    // User upsert
    const existingUser = await prisma.user.findUnique({ where: { crmCustomerId } });

    const user = await prisma.user.upsert({
      where: { crmCustomerId },
      update: {
        voornaam: voornaam ?? "Onbekend",
        tussenvoegsel,
        achternaam: achternaam ?? "Onbekend",
        email,
        mobiel,
        role,
      },
      create: {
        crmCustomerId,
        voornaam: voornaam ?? "Onbekend",
        tussenvoegsel,
        achternaam: achternaam ?? "Onbekend",
        email,
        mobiel,
        role,
      },
    });

    if (existingUser) updatedUsers++;
    else createdUsers++;

    // Cohort upsert (uitvoeringId is @unique)
    const existingCohort = await prisma.cohort.findUnique({ where: { uitvoeringId } });
    const cohort = await prisma.cohort.upsert({
      where: { uitvoeringId },
      update: { naam: uitvoeringNaam, traject },
      create: { uitvoeringId, naam: uitvoeringNaam, traject },
    });
    if (!existingCohort) createdCohorts++;

    // Enrollment upsert (userId+cohortId is unique)
    const existingEnrollment = await prisma.enrollment.findUnique({
      where: { userId_cohortId: { userId: user.id, cohortId: cohort.id } },
    });

    await prisma.enrollment.upsert({
      where: { userId_cohortId: { userId: user.id, cohortId: cohort.id } },
      update: { coachNaam, trajectStatus },
      create: { userId: user.id, cohortId: cohort.id, coachNaam, trajectStatus },
    });

    if (!existingEnrollment) createdEnrollments++;
  }

  console.log("✅ Import klaar");
  console.log({ createdUsers, updatedUsers, createdCohorts, createdEnrollments });
}

main()
  .catch((e) => {
    console.error("❌ Import error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });