import { NextResponse } from "next/server";
import { Prisma, PrismaClient } from "@prisma/client";

export const runtime = "nodejs";

const prisma = new PrismaClient();

/**
 * Generic CSV import endpoint for Users:
 * - Accepts JSON: { csvText: string }
 * - Supports comma or semicolon separated CSV
 * - Uses crmCustomerId as primary key if present (unique in your schema)
 * - Falls back to email match via findFirst (since email is NOT unique in your schema)
 * - Updates only fields that exist in your Prisma User model (DMMF-safe)
 *
 * Expected columns (any subset ok):
 * email, voornaam, tussenvoegsel, achternaam, crmCustomerId, role
 */

type ParsedRow = {
  email: string;
  voornaam?: string;
  tussenvoegsel?: string;
  achternaam?: string;
  crmCustomerId?: string;
  role?: string;
};

function normalizeHeader(h: string) {
  return h
    .trim()
    .toLowerCase()
    .replace(/\ufeff/g, "") // BOM
    .replace(/\s+/g, "");
}

function splitCsvLine(line: string, delimiter: string): string[] {
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

    if (!inQuotes && ch === delimiter) {
      out.push(cur.trim());
      cur = "";
      continue;
    }

    cur += ch;
  }

  out.push(cur.trim());
  return out;
}

function detectDelimiter(headerLine: string) {
  const commas = (headerLine.match(/,/g) || []).length;
  const semis = (headerLine.match(/;/g) || []).length;
  return semis > commas ? ";" : ",";
}

function parseCSV(csvText: string): ParsedRow[] {
  const text = csvText.replace(/\r\n/g, "\n").replace(/\r/g, "\n").trim();
  const lines = text
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length < 2) return [];

  const delimiter = detectDelimiter(lines[0]);
  const headerRaw = splitCsvLine(lines[0], delimiter).map(normalizeHeader);

  const idx = (name: string) => headerRaw.indexOf(normalizeHeader(name));

  const idxEmail = idx("email");
  const idxVoornaam = idx("voornaam") >= 0 ? idx("voornaam") : idx("firstname");
  const idxTussenvoegsel =
    idx("tussenvoegsel") >= 0
      ? idx("tussenvoegsel")
      : idx("vande") >= 0
        ? idx("vande")
        : idx("infix");
  const idxAchternaam = idx("achternaam") >= 0 ? idx("achternaam") : idx("lastname");
  const idxCrm = idx("crmcustomerid") >= 0 ? idx("crmcustomerid") : idx("klantnummer");
  const idxRole = idx("role") >= 0 ? idx("role") : idx("rol");

  if (idxEmail === -1 && idxCrm === -1) {
    throw new Error("CSV mist kolom: email (of crmCustomerId/klantnummer)");
  }

  const rows: ParsedRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = splitCsvLine(lines[i], delimiter);

    const email = idxEmail >= 0 ? (cols[idxEmail] || "").trim().toLowerCase() : "";
    const crmCustomerId = idxCrm >= 0 ? (cols[idxCrm] || "").trim() : "";

    // We require at least one identifier
    if (!email && !crmCustomerId) continue;

    rows.push({
      email,
      voornaam: idxVoornaam >= 0 ? (cols[idxVoornaam] || "").trim() : undefined,
      tussenvoegsel: idxTussenvoegsel >= 0 ? (cols[idxTussenvoegsel] || "").trim() : undefined,
      achternaam: idxAchternaam >= 0 ? (cols[idxAchternaam] || "").trim() : undefined,
      crmCustomerId: crmCustomerId || undefined,
      role: idxRole >= 0 ? (cols[idxRole] || "").trim() : undefined,
    });
  }

  return rows;
}

function getUserModelMeta() {
  const dmmf = Prisma.dmmf;
  const user = dmmf.datamodel.models.find((m) => m.name === "User");
  if (!user) return null;

  const fields = user.fields.map((f) => f.name);
  const enums = dmmf.datamodel.enums;
  return { fields, enums };
}

function pickField(fields: string[], options: string[]) {
  for (const opt of options) {
    if (fields.includes(opt)) return opt;
  }
  return null;
}

function normalizeRole(raw: string | undefined) {
  const x = (raw ?? "").trim().toLowerCase();
  if (!x) return null; // missing => do not change role
  if (x.includes("admin")) return "ADMIN";
  if (x.includes("student")) return "STUDENT";
  if (x.includes("docent") || x.includes("teacher")) return "TEACHER";
  return raw!.trim();
}

type DmmfEnum = {
  name: string;
  values?: ReadonlyArray<{ name: string; dbName?: string }>;
  dbName?: string;
  documentation?: string;
};

function pickRoleEnumValue(enums: ReadonlyArray<DmmfEnum>, preferred: string) {
  const roleEnum = enums.find((e) => {
    const n = String(e.name).toLowerCase();
    return n === "role" || n === "rol";
  });
  if (!roleEnum) return null;

  const values: string[] = (roleEnum.values ?? []).map((v) => String(v.name));

  const tryOrder = [
    preferred,
    preferred.toUpperCase(),
    preferred.toLowerCase(),
    preferred[0]?.toUpperCase() + preferred.slice(1).toLowerCase(),
    "TEACHER",
    "DOCENT",
    "ADMIN",
    "STUDENT",
  ].filter(Boolean) as string[];

  for (const v of tryOrder) {
    if (values.includes(v)) return v;
  }
  return null;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const csvText = body?.csvText as string | undefined;

    if (!csvText || typeof csvText !== "string") {
      return NextResponse.json({ ok: false, error: "Geen csvText ontvangen" }, { status: 400 });
    }

    const meta = getUserModelMeta();
    if (!meta) {
      return NextResponse.json({ ok: false, error: "Prisma User model niet gevonden" }, { status: 500 });
    }

    const { fields, enums } = meta;

    // Field mapping (tolerant)
    const fId = pickField(fields, ["id"]);
    const fEmail = pickField(fields, ["email"]);
    const fCrm = pickField(fields, ["crmCustomerId", "crmcustomerid", "customerId", "crm_id"]);
    const fRole = pickField(fields, ["role", "rol"]);
    const fVoornaam = pickField(fields, ["voornaam", "firstName", "firstname", "givenName"]);
    const fTussenvoegsel = pickField(fields, ["tussenvoegsel", "infix", "tussenvoegsels"]);
    const fAchternaam = pickField(fields, ["achternaam", "lastName", "lastname", "familyName"]);

    if (!fId) {
      return NextResponse.json({ ok: false, error: "User model mist veld: id" }, { status: 500 });
    }
    if (!fEmail && !fCrm) {
      return NextResponse.json(
        { ok: false, error: "User model mist zowel email als crmCustomerId; kan niet importeren" },
        { status: 500 }
      );
    }

    const rows = parseCSV(csvText);

    const results = {
      total: rows.length,
      created: 0,
      updated: 0,
      skipped: 0,
      warnings: [] as { email?: string; crmCustomerId?: string; message: string }[],
      errors: [] as { email?: string; crmCustomerId?: string; message: string }[],
    };

    for (const r of rows) {
      const email = (r.email || "").trim().toLowerCase();
      const crmCustomerId = (r.crmCustomerId || "").trim();

      if (!email && !crmCustomerId) {
        results.skipped++;
        continue;
      }

      try {
        // 1) Find existing: prefer unique crmCustomerId if available, else fallback email via findFirst
        let existing: any = null;

        if (crmCustomerId && fCrm) {
          existing = await (prisma as any).user.findUnique({
            where: { [fCrm]: crmCustomerId },
          });
        }

        if (!existing && email && fEmail) {
          existing = await (prisma as any).user.findFirst({
            where: { [fEmail]: email },
            orderBy: { createdAt: "asc" }, // deterministic if multiple
          });

          // If multiple accounts share same email, warn (still proceeds with first)
          const count = await (prisma as any).user.count({ where: { [fEmail]: email } });
          if (count > 1) {
            results.warnings.push({
              email,
              crmCustomerId: crmCustomerId || undefined,
              message: `Meerdere users met hetzelfde email (${count}x). Import gebruikt de oudste (createdAt asc).`,
            });
          }
        }

        const preferredRole = normalizeRole(r.role);
        const roleValue = fRole && preferredRole ? pickRoleEnumValue(enums, preferredRole) : null;

        const buildData = () => {
          const data: any = {};

          if (fEmail && email) data[fEmail] = email;
          if (fCrm && crmCustomerId) data[fCrm] = crmCustomerId;

          if (fRole && roleValue) data[fRole] = roleValue;

          if (fVoornaam && r.voornaam && r.voornaam.trim()) data[fVoornaam] = r.voornaam.trim();
          if (fTussenvoegsel && r.tussenvoegsel && r.tussenvoegsel.trim())
            data[fTussenvoegsel] = r.tussenvoegsel.trim();
          if (fAchternaam && r.achternaam && r.achternaam.trim()) data[fAchternaam] = r.achternaam.trim();

          return data;
        };

        if (!existing) {
          const data: any = buildData();

          // If your schema has non-null name fields, defaults are safe
          if (fVoornaam && data[fVoornaam] === undefined) data[fVoornaam] = "";
          if (fAchternaam && data[fAchternaam] === undefined) data[fAchternaam] = "";
          if (fTussenvoegsel && data[fTussenvoegsel] === undefined) data[fTussenvoegsel] = "";

          await (prisma as any).user.create({ data });
          results.created++;
        } else {
          const data = buildData();

          // Must update via unique id
          const idVal = existing[fId];
          if (!idVal) {
            results.errors.push({
              email: email || undefined,
              crmCustomerId: crmCustomerId || undefined,
              message: "Bestaande user gevonden maar id ontbreekt (onverwacht).",
            });
            continue;
          }

          // If only email was supplied and nothing changes, skip
          if (Object.keys(data).length === 0) {
            results.skipped++;
            continue;
          }

          await (prisma as any).user.update({
            where: { [fId]: idVal },
            data,
          });

          results.updated++;
        }
      } catch (e: any) {
        results.errors.push({
          email: email || undefined,
          crmCustomerId: crmCustomerId || undefined,
          message: e?.message ?? "Unknown error",
        });
      }
    }

    return NextResponse.json({ ok: true, results });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? "Unknown error" }, { status: 500 });
  }
}