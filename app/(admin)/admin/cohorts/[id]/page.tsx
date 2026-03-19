import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { redirect, notFound } from "next/navigation";
import React from "react";
import { revalidatePath } from "next/cache";

/* =========================
   Server Actions
========================= */

async function setActiveCohort(formData: FormData) {
  "use server";

  const cohortId = String(formData.get("cohortId") || "");
  if (!cohortId) return;

  const c = await cookies();

  c.set("activeCohortId", cohortId, {
    httpOnly: true,
    path: "/",
  });

  redirect(`/admin/cohorts/${cohortId}`);
}

async function unlinkTeacher(formData: FormData) {
  "use server";

  const cohortId = String(formData.get("cohortId") || "");
  const userId = String(formData.get("userId") || "");
  if (!cohortId || !userId) return;

  await prisma.enrollment.delete({
    where: { userId_cohortId: { userId, cohortId } },
  });

  revalidatePath(`/admin/cohorts/${cohortId}`);
}

async function updateCohortTraject(formData: FormData) {
  "use server";

  const cohortId = String(formData.get("cohortId") || "");
  const traject = String(formData.get("traject") || "").trim() || null;

  if (!cohortId) return;

  await prisma.cohort.update({
    where: { id: cohortId },
    data: { traject },
  });

  revalidatePath(`/admin/cohorts/${cohortId}`);
}

/* =========================
   Page
========================= */

export default async function AdminCohortDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const c = await cookies();
  const activeCohortId = c.get("activeCohortId")?.value ?? null;
  const cohort = await prisma.cohort.findUnique({
    where: { id },
    include: {
      enrollments: {
        include: { user: true },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!cohort) return notFound();

  const isActive = cohort.id === activeCohortId;

  const teacherEnrollments = cohort.enrollments.filter((e) => e.user.role === "TEACHER");
  const studentEnrollments = cohort.enrollments.filter((e) => e.user.role === "STUDENT");
  const adminEnrollments = cohort.enrollments.filter((e) => e.user.role === "ADMIN");

  const card: React.CSSProperties = {
    border: "1px solid #e5e7eb",
    borderRadius: 10,
    padding: 14,
    background: "white",
  };

  const label: React.CSSProperties = { fontSize: 12, color: "#6b7280" };

  function fullName(u: any) {
    return [u.voornaam, u.tussenvoegsel, u.achternaam].filter(Boolean).join(" ");
  }

  const trajectValue = (cohort.traject || "").toLowerCase().trim();

  return (
    <div style={{ padding: 18, display: "grid", gap: 12, maxWidth: 1000 }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
        <h1 style={{ margin: 0, fontSize: 20 }}>Schooljaar / uitvoering</h1>
        <div style={label}>{cohort.enrollments.length} inschrijvingen</div>

        <div style={{ marginLeft: "auto", display: "flex", gap: 12 }}>
          <a href="/admin/cohorts" style={{ fontSize: 12 }}>
            ← terug naar schooljaren
          </a>
          <a href="/admin/teachers" style={{ fontSize: 12 }}>
            naar docentenpool →
          </a>
        </div>
      </div>

      <div
        style={{
          ...card,
          borderColor: isActive ? "#2563eb" : "#e5e7eb",
          background: isActive ? "#eff6ff" : "white",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: 12,
        }}
      >
        <div style={{ display: "grid", gap: 10, flex: 1 }}>
          <div>
            <strong style={{ fontSize: 16 }}>{cohort.naam}</strong>
          </div>

          <div style={label}>
            traject/rubricKey:{" "}
            <strong style={{ fontFamily: "monospace" }}>{cohort.traject ?? "—"}</strong> · uitvoering:{" "}
            <strong>{cohort.uitvoeringId}</strong>
          </div>

          <form action={updateCohortTraject} style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            <input type="hidden" name="cohortId" value={cohort.id} />

            <div style={{ ...label, minWidth: 140 }}>Zet traject:</div>

            <select
              name="traject"
              defaultValue={trajectValue || ""}
              style={{
                padding: "8px 10px",
                borderRadius: 10,
                border: "1px solid #d1d5db",
                background: "white",
                minWidth: 220,
                fontFamily: "monospace",
              }}
            >
              <option value="">(leeg / default 1vo)</option>
              <option value="basisjaar">basisjaar</option>
              <option value="1vo">1vo</option>
              <option value="2vo">2vo</option>
              <option value="3vo">3vo</option>
            </select>

            <button
              type="submit"
              style={{
                padding: "8px 12px",
                borderRadius: 10,
                border: "1px solid #111",
                background: "#111",
                color: "white",
                cursor: "pointer",
                fontWeight: 700,
              }}
            >
              Opslaan
            </button>

            <div style={{ ...label }}>
              Tip: voor 2VO kies <strong style={{ fontFamily: "monospace" }}>2vo</strong>
            </div>
          </form>

          <div style={label}>
            aangemaakt: <strong>{new Date(cohort.createdAt).toLocaleString("nl-NL")}</strong>
          </div>

          <div style={{ display: "grid", gap: 6, marginTop: 6 }}>
            <div style={{ ...label, fontSize: 12 }}>docenten ({teacherEnrollments.length})</div>

            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {teacherEnrollments.length === 0 ? (
                <div style={label}>Nog geen docenten gekoppeld.</div>
              ) : (
                teacherEnrollments.map((e) => {
                  const u = e.user;
                  return (
                    <span
                      key={e.id}
                      title={u.email}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 8,
                        border: "1px solid #e5e7eb",
                        borderRadius: 999,
                        padding: "6px 10px",
                        fontSize: 12,
                        background: "white",
                      }}
                    >
                      {fullName(u) || u.email || u.id}

                      <form action={unlinkTeacher} style={{ margin: 0 }}>
                        <input type="hidden" name="cohortId" value={cohort.id} />
                        <input type="hidden" name="userId" value={e.userId} />
                        <button
                          type="submit"
                          aria-label="Docent ontkoppelen"
                          title="Ontkoppelen"
                          style={{
                            border: "none",
                            background: "transparent",
                            cursor: "pointer",
                            color: "#6b7280",
                            fontSize: 16,
                            lineHeight: "12px",
                            padding: "0 2px",
                          }}
                        >
                          ×
                        </button>
                      </form>
                    </span>
                  );
                })
              )}

              <a
                href={`/admin/teachers?cohortId=${encodeURIComponent(cohort.id)}`}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  border: "1px solid #e5e7eb",
                  borderRadius: 999,
                  padding: "6px 10px",
                  fontSize: 12,
                  textDecoration: "none",
                  background: "white",
                }}
                title="Docent koppelen"
              >
                + docent
              </a>
            </div>

            {adminEnrollments.length > 0 && (
              <div style={label}>
                admins gekoppeld:{" "}
                <strong>
                  {adminEnrollments.map((e) => fullName(e.user) || e.user.email || e.user.id).join(", ")}
                </strong>
              </div>
            )}

            {isActive && <div style={{ ...label, color: "#2563eb" }}>actief schooljaar</div>}
          </div>
        </div>

        <form action={setActiveCohort}>
          <input type="hidden" name="cohortId" value={cohort.id} />
          <button type="submit" style={{ fontSize: 12 }}>
            {isActive ? "actief" : "maak actief"}
          </button>
        </form>
      </div>

      <div style={card}>
        <h2 style={{ margin: 0, fontSize: 16 }}>Studenten ({studentEnrollments.length})</h2>
        <div style={{ height: 10 }} />

        {studentEnrollments.length === 0 ? (
          <div style={label}>Nog geen studenten gekoppeld aan dit schooljaar.</div>
        ) : (
          <div style={{ display: "grid", gap: 10 }}>
            {studentEnrollments.map((e) => {
              const u = e.user;

              return (
                <div
                  key={e.id}
                  style={{
                    border: "1px solid #e5e7eb",
                    borderRadius: 10,
                    padding: 12,
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: 12,
                  }}
                >
                  <div style={{ display: "grid", gap: 2 }}>
                    <div>
                      <strong>{fullName(u) || u.email || u.id}</strong>
                    </div>

                    <div style={label}>
                      status: {e.trajectStatus ?? "—"}
                      {e.coachNaam ? ` · coach: ${e.coachNaam}` : ""}
                    </div>

                    <div style={label}>
                      crmCustomerId: {u.crmCustomerId ?? "—"} · userId: {u.id}
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "flex-end" }}>
                    <a
                      href={`/admin/users/${u.id}`}
                      style={{
                        fontSize: 12,
                        textDecoration: "none",
                        border: "1px solid #e5e7eb",
                        padding: "8px 10px",
                        borderRadius: 10,
                        background: "white",
                        fontWeight: 800,
                      }}
                    >
                      Gebruiker →
                    </a>

                    <a
                      href={`/admin/students/${u.id}`}
                      style={{
                        fontSize: 12,
                        textDecoration: "none",
                        border: "1px solid #111",
                        padding: "8px 10px",
                        borderRadius: 10,
                        background: "#111",
                        color: "white",
                        fontWeight: 800,
                      }}
                      title="Opleidingsdossier / invulkaart"
                    >
                      Dossier →
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}