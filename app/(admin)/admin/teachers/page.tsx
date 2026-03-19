import { PrismaClient } from "@prisma/client";
import React from "react";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };
const prisma = globalForPrisma.prisma ?? new PrismaClient();
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

/* =========================
   Helpers
========================= */

function fullNameFromUser(u: any) {
  return [u.voornaam, u.tussenvoegsel, u.achternaam].filter(Boolean).join(" ");
}

function isTeacherRole(role: any) {
  const r = String(role ?? "").toUpperCase();
  return r.includes("TEACH") || r.includes("DOCENT");
}

function cohortLabel(c: any) {
  // jouw Cohort heeft in elk geval: naam, traject, uitvoeringId
  return `${c.naam} · ${c.traject} · ${c.uitvoeringId}`;
}

/* =========================
   Server Actions
========================= */

async function linkTeacherToCohort(formData: FormData) {
  "use server";

  const userId = String(formData.get("userId") || "");
  const cohortId = String(formData.get("cohortId") || "");
  if (!userId || !cohortId) redirect("/admin/teachers?msg=Selecteer%20docent%20en%20cohort");

  // Vereist dat je Enrollment een unieke key heeft op (cohortId, userId).
  // Zo niet: dan krijg je een duidelijke Prisma error en passen we 'm 1-op-1 aan.
  await prisma.enrollment.upsert({
  where: {
    userId_cohortId: {
      userId,
      cohortId,
    },
  },
  update: {},
  create: {
    userId,
    cohortId,
  },
});

  revalidatePath("/admin/teachers");
  redirect("/admin/teachers?msg=Gekoppeld");
}

async function unlinkTeacherFromCohort(formData: FormData) {
  "use server";

  const userId = String(formData.get("userId") || "");
  const cohortId = String(formData.get("cohortId") || "");
  if (!userId || !cohortId) redirect("/admin/teachers?msg=Ontkoppelen%20mislukt");

  await prisma.enrollment.delete({
    where: { cohortId_userId: { cohortId, userId } } as any,
  });

  revalidatePath("/admin/teachers");
  redirect("/admin/teachers?msg=Ontkoppeld");
}

/* =========================
   UI components
========================= */

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span
      style={{
        fontSize: 12,
        border: "1px solid #e5e7eb",
        borderRadius: 999,
        padding: "2px 8px",
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
      }}
    >
      {children}
    </span>
  );
}

function ChipUnlinkButton({
  userId,
  cohortId,
  title,
}: {
  userId: string;
  cohortId: string;
  title: string;
}) {
  return (
    <form action={unlinkTeacherFromCohort} style={{ display: "inline" }}>
      <input type="hidden" name="userId" value={userId} />
      <input type="hidden" name="cohortId" value={cohortId} />
      <button
        type="submit"
        title={title}
        aria-label={title}
        style={{
          border: "none",
          background: "transparent",
          cursor: "pointer",
          padding: 0,
          lineHeight: 1,
          fontSize: 14,
          color: "#6b7280",
        }}
      >
        ×
      </button>
    </form>
  );
}

/* =========================
   Page
========================= */

export default async function AdminTeachersPage(props: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const searchParams = (await props.searchParams) ?? {};
  const msgRaw = searchParams.msg;
  const msg = Array.isArray(msgRaw) ? msgRaw[0] : msgRaw;

  const [users, cohorts, enrollments] = await Promise.all([
    prisma.user.findMany({
      orderBy: [{ achternaam: "asc" }, { voornaam: "asc" }],
    }),
    prisma.cohort.findMany({
      orderBy: [{ traject: "asc" }, { naam: "asc" }],
    }),
    prisma.enrollment.findMany({
      include: { user: true, cohort: true },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  const teachers = users.filter((u: any) => isTeacherRole(u.role));

  // indexeer koppelingen
  const linksByUserId = new Map<string, any[]>();
  const linksByCohortId = new Map<string, any[]>();

  for (const e of enrollments) {
    const arrU = linksByUserId.get(e.userId) ?? [];
    arrU.push(e);
    linksByUserId.set(e.userId, arrU);

    const arrC = linksByCohortId.get(e.cohortId) ?? [];
    arrC.push(e);
    linksByCohortId.set(e.cohortId, arrC);
  }

  const card: React.CSSProperties = {
    border: "1px solid #e5e7eb",
    borderRadius: 10,
    padding: 14,
    background: "white",
  };

  const label: React.CSSProperties = { fontSize: 12, color: "#6b7280" };
  const h1: React.CSSProperties = { margin: 0, fontSize: 20 };
  const h2: React.CSSProperties = { margin: 0, fontSize: 14 };

  return (
    <div style={{ padding: 18, display: "grid", gap: 12, maxWidth: 1100 }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
        <h1 style={h1}>Docentenpool</h1>
        <div style={label}>
          {teachers.length} docenten · {cohorts.length} cohorten
        </div>
        <div style={{ marginLeft: "auto" }}>
          <a href="/admin/cohorts" style={{ fontSize: 12 }}>
            naar cohorten →
          </a>
        </div>
      </div>

      {msg ? (
        <div
          style={{
            ...card,
            borderColor: "#dbeafe",
            background: "#eff6ff",
            padding: 10,
            fontSize: 13,
          }}
        >
          {decodeURIComponent(msg)}
        </div>
      ) : null}

      <div style={card}>
        <h2 style={h2}>Koppel docent ↔ cohort</h2>
        <div style={{ ...label, marginTop: 6 }}>
          Je hebt nu nog geen docenten? Zet ze in Prisma (User.role bevat “TEACH…” of “DOCENT…”), dan verschijnen ze hier.
        </div>

        <form action={linkTeacherToCohort} style={{ display: "grid", gap: 8, marginTop: 10 }}>
          <select name="userId" required>
            <option value="">Selecteer docent</option>
            {teachers.map((t: any) => (
              <option key={t.id} value={t.id}>
                {fullNameFromUser(t) || t.email || t.id}
                {t.email ? ` (${t.email})` : ""}
              </option>
            ))}
          </select>

          <select name="cohortId" required>
            <option value="">Selecteer cohort</option>
            {cohorts.map((c: any) => (
              <option key={c.id} value={c.id}>
                {cohortLabel(c)}
              </option>
            ))}
          </select>

          <button type="submit" disabled={teachers.length === 0 || cohorts.length === 0}>
            Koppelen
          </button>
        </form>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, alignItems: "start" }}>
        <div style={card}>
          <h2 style={h2}>Docenten → cohorten</h2>

          {teachers.length === 0 ? (
            <div style={{ ...label, marginTop: 10 }}>Nog geen docenten gevonden.</div>
          ) : (
            <div style={{ display: "grid", gap: 10, marginTop: 10 }}>
              {teachers.map((t: any) => {
                const tLinks = linksByUserId.get(t.id) ?? [];
                return (
                  <div
                    key={t.id}
                    style={{ border: "1px solid #f1f5f9", borderRadius: 10, padding: 10 }}
                  >
                    <div style={{ display: "flex", gap: 8, alignItems: "baseline" }}>
                      <strong>{fullNameFromUser(t) || t.email || t.id}</strong>
                      <span style={label}>{t.email ?? "—"}</span>
                    </div>

                    <div style={{ marginTop: 6 }}>
                      {tLinks.length === 0 ? (
                        <span style={{ ...label, color: "#9ca3af" }}>geen cohorten</span>
                      ) : (
                        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                          {tLinks.map((e: any) => (
                            <Chip key={e.id}>
                              {cohortLabel(e.cohort)}
                              <ChipUnlinkButton
                                userId={t.id}
                                cohortId={e.cohortId}
                                title={`Ontkoppel ${fullNameFromUser(t) || t.email || t.id} van ${cohortLabel(
                                  e.cohort
                                )}`}
                              />
                            </Chip>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div style={card}>
          <h2 style={h2}>Cohorten → docenten</h2>

          {cohorts.length === 0 ? (
            <div style={{ ...label, marginTop: 10 }}>Nog geen cohorten gevonden.</div>
          ) : (
            <div style={{ display: "grid", gap: 10, marginTop: 10 }}>
              {cohorts.map((c: any) => {
                const cLinks = linksByCohortId.get(c.id) ?? [];
                return (
                  <div
                    key={c.id}
                    style={{ border: "1px solid #f1f5f9", borderRadius: 10, padding: 10 }}
                  >
                    <div style={{ display: "grid", gap: 2 }}>
                      <strong>{c.naam}</strong>
                      <span style={label}>
                        traject: {c.traject} · uitvoering: {c.uitvoeringId}
                      </span>
                      <span style={label}>
                        aangemaakt: {new Date(c.createdAt).toLocaleString("nl-NL")}
                      </span>
                    </div>

                    <div style={{ marginTop: 8 }}>
                      {cLinks.length === 0 ? (
                        <span style={{ ...label, color: "#9ca3af" }}>geen docenten</span>
                      ) : (
                        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                          {cLinks
                            .filter((e: any) => isTeacherRole(e.user?.role))
                            .map((e: any) => {
                              const t = e.user;
                              const tLabel = fullNameFromUser(t) || t.email || t.id;
                              return (
                                <Chip key={e.id}>
                                  {tLabel}
                                  <ChipUnlinkButton
                                    userId={e.userId}
                                    cohortId={c.id}
                                    title={`Ontkoppel ${tLabel} van ${cohortLabel(c)}`}
                                  />
                                </Chip>
                              );
                            })}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <div style={{ ...label, marginTop: 2 }}>
        v1: docenten = Users met role die “TEACH” of “DOCENT” bevat · koppeling via Enrollment (userId+cohortId)
      </div>
    </div>
  );
}