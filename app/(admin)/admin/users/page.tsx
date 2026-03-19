import React from "react";
import { PrismaClient, Role } from "@prisma/client";
import ImpersonateInlineLink from "../_components/ImpersonateInlineLink";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };
const prisma = globalForPrisma.prisma ?? new PrismaClient();
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

function fullName(u: any) {
  const parts = [u.voornaam, u.tussenvoegsel, u.achternaam].filter(Boolean);
  return parts.join(" ").trim();
}

/* =========================
   Rubric logic
========================= */

type RubricKey = "basisjaar" | "1vo" | "2vo" | "3vo";

const rubricOrder: RubricKey[] = ["3vo", "2vo", "1vo", "basisjaar"];

function normTraject(x: any): RubricKey | null {
  const s = String(x ?? "").trim().toLowerCase();
  if (!s) return null;
  if (s.includes("basis")) return "basisjaar";
  if (s.includes("1vo")) return "1vo";
  if (s.includes("2vo")) return "2vo";
  if (s.includes("3vo")) return "3vo";
  return null;
}

function labelRubric(k: RubricKey) {
  if (k === "basisjaar") return "BASIS";
  return k.toUpperCase();
}

function computeRubrics(
  enrollments: Array<{
    assessmentLocked: boolean;
    cohort: { traject: string | null };
  }>
) {
  const present = new Set<RubricKey>();
  const unlocked = new Set<RubricKey>();

  for (const e of enrollments ?? []) {
    const k = normTraject(e?.cohort?.traject);
    if (!k) continue;
    present.add(k);
    if (!e.assessmentLocked) unlocked.add(k);
  }

  const list = rubricOrder.filter((k) => present.has(k));
  const active = rubricOrder.find((k) => unlocked.has(k)) ?? null;
  const allLocked = list.length > 0 && active === null;

  return { list, active, allLocked };
}

/* =========================
   Page
========================= */

type SortKey = "name_asc" | "name_desc" | "rel_asc" | "rel_desc";

function buildHref(basePath: string, params: Record<string, string | undefined>) {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v && v.length) sp.set(k, v);
  }
  const qs = sp.toString();
  return qs ? `${basePath}?${qs}` : basePath;
}

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams?: { role?: string; sort?: string; showEmail?: string };
}) {
  const basePath = "/admin/users";

  const roleParam = (searchParams?.role ?? "ALL").toUpperCase();
  const sort = (searchParams?.sort ?? "name_asc") as SortKey;
  const showEmail = searchParams?.showEmail === "1";

  const roleFilter: Role | null =
    roleParam === "STUDENT" || roleParam === "TEACHER" || roleParam === "ADMIN"
      ? (roleParam as Role)
      : null;

  const orderBy =
    sort === "name_desc"
      ? [{ achternaam: "desc" as const }, { voornaam: "desc" as const }]
      : sort === "rel_asc"
      ? [
          { crmCustomerId: "asc" as const },
          { achternaam: "asc" as const },
          { voornaam: "asc" as const },
        ]
      : sort === "rel_desc"
      ? [
          { crmCustomerId: "desc" as const },
          { achternaam: "asc" as const },
          { voornaam: "asc" as const },
        ]
      : [{ achternaam: "asc" as const }, { voornaam: "asc" as const }];

  const users = await prisma.user.findMany({
    where: roleFilter ? { role: roleFilter } : undefined,
    orderBy,
    select: {
      id: true,
      email: true,
      role: true,
      crmCustomerId: true,
      voornaam: true,
      tussenvoegsel: true,
      achternaam: true,
      createdAt: true,
      enrollments: {
        select: {
          assessmentLocked: true,
          cohort: {
            select: {
              traject: true,
            },
          },
        },
      },
    },
  });

  const label: React.CSSProperties = { fontSize: 12, color: "#666" };

  const activeChip: React.CSSProperties = {
    border: "1px solid #111",
    background: "#111",
    color: "white",
  };

  const chip: React.CSSProperties = {
    border: "1px solid #e5e7eb",
    borderRadius: 999,
    padding: "6px 10px",
    fontSize: 12,
    textDecoration: "none",
    color: "#111",
    background: "white",
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
  };

  const rubricPill: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    flexWrap: "wrap",
  };

  const pill: React.CSSProperties = {
    border: "1px solid #e5e7eb",
    borderRadius: 999,
    padding: "4px 8px",
    fontSize: 12,
    background: "white",
    color: "#111",
    lineHeight: 1,
  };

  const pillActive: React.CSSProperties = {
    ...pill,
    border: "1px solid #111",
    background: "#111",
    color: "white",
    fontWeight: 900,
  };

  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 12,
          alignItems: "baseline",
        }}
      >
        <h2 style={{ marginTop: 0, marginBottom: 10 }}>Users</h2>
        <div style={label}>{users.length} zichtbaar</div>
      </div>

      <div
        style={{
          border: "1px solid #eee",
          borderRadius: 12,
          padding: 12,
          display: "flex",
          flexWrap: "wrap",
          gap: 10,
          alignItems: "center",
          marginBottom: 12,
          background: "white",
        }}
      >
        <div style={{ ...label, marginRight: 6 }}>Filter</div>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {(["ALL", "STUDENT", "TEACHER", "ADMIN"] as const).map((r) => {
            const active = roleParam === r;
            return (
              <a
                key={r}
                href={buildHref(basePath, {
                  role: r === "ALL" ? undefined : r,
                  sort,
                  showEmail: showEmail ? "1" : undefined,
                })}
                style={{ ...chip, ...(active ? activeChip : {}) }}
              >
                {r === "ALL" ? "Alle" : r}
              </a>
            );
          })}
        </div>
      </div>

      <div style={{ border: "1px solid #eee", borderRadius: 12, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "#fafafa" }}>
              <th style={th}>Naam</th>
              <th style={th}>Rol</th>
              <th style={th}>Rubric(s)</th>
              {showEmail && <th style={th}>Email</th>}
              <th style={th}>Relatienummer</th>
            </tr>
          </thead>

          <tbody>
            {users.map((u) => {
              const { list, active, allLocked } = computeRubrics(
                u.enrollments as any
              );

              return (
                <tr key={u.id}>
                  <td style={td}>
                    <div style={{ fontWeight: 900 }}>{fullName(u) || "—"}</div>
                    <ImpersonateInlineLink userId={u.id} label="meekijken" redirectTo="/" />
                  </td>

                  <td style={td}>{String(u.role)}</td>

                  <td style={td}>
                    {list.length === 0 ? (
                      <span style={{ color: "#999", fontSize: 12 }}>—</span>
                    ) : allLocked ? (
                      <span style={pillActive}>KLAAR</span>
                    ) : (
                      <div style={rubricPill}>
                        {list.map((k) => (
                          <span
                            key={k}
                            style={k === active ? pillActive : pill}
                          >
                            {labelRubric(k)}
                          </span>
                        ))}
                      </div>
                    )}
                  </td>

                  {showEmail && <td style={td}>{u.email || "—"}</td>}

                  <td style={td}>{u.crmCustomerId || "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const th: React.CSSProperties = {
  textAlign: "left",
  padding: "10px 12px",
  fontSize: 12,
  color: "#666",
  borderBottom: "1px solid #eee",
};

const td: React.CSSProperties = {
  padding: "10px 12px",
  borderBottom: "1px solid #f0f0f0",
  verticalAlign: "top",
};