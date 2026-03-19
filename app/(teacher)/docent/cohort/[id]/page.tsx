import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import type { CSSProperties } from "react";
import { prisma } from "@/lib/prisma";
import { getSessionUserId } from "@/lib/auth/session";
import { ReviewStatus, Role } from "@prisma/client";

function fullName(u: {
  voornaam: string | null;
  tussenvoegsel: string | null;
  achternaam: string | null;
  email?: string | null;
}) {
  const parts = [u.voornaam, u.tussenvoegsel, u.achternaam].filter(Boolean);
  return parts.join(" ").trim() || u.email || "Onbekend";
}

function formatDateTime(value: Date | null | undefined) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("nl-NL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(value);
}

function formatDate(value: Date | null | undefined) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("nl-NL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(value);
}

function rubricLabel(rubricKey: string | null | undefined) {
  if (!rubricKey) return "—";
  const key = String(rubricKey).toLowerCase();
  if (key === "basisjaar") return "Basisjaar";
  if (key === "1vo") return "1VO";
  if (key === "2vo") return "2VO";
  if (key === "3vo") return "3VO";
  return rubricKey;
}

function momentLabel(moment: string | null | undefined) {
  if (!moment) return "—";
  return String(moment).toUpperCase();
}

export default async function DocentCohortPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const userId = await getSessionUserId();

  if (!userId) {
    redirect("/login");
  }

  const { id } = await params;

  const teacher = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      voornaam: true,
      tussenvoegsel: true,
      achternaam: true,
      email: true,
      enrollments: {
        where: { cohortId: id },
        select: { id: true },
      },
    },
  });

  if (!teacher) {
    redirect("/login");
  }

  const hasAccessToCohort = teacher.enrollments.length > 0;

  if (!hasAccessToCohort) {
    notFound();
  }

  const cohort = await prisma.cohort.findUnique({
    where: { id },
    select: {
      id: true,
      naam: true,
      traject: true,
      uitvoeringId: true,
      startDatum: true,
      eindDatum: true,
      enrollments: {
        select: {
          id: true,
          assessmentLocked: true,
          user: {
            select: {
              id: true,
              role: true,
              email: true,
              voornaam: true,
              tussenvoegsel: true,
              achternaam: true,
            },
          },
        },
      },
    },
  });

  if (!cohort) {
    notFound();
  }

  const studentEnrollments = cohort.enrollments.filter(
    (e) => e.user.role === Role.STUDENT
  );
  const teacherEnrollments = cohort.enrollments.filter(
    (e) => e.user.role === Role.TEACHER
  );

  const studentIds = studentEnrollments.map((e) => e.user.id);

  const assessments = await prisma.assessment.findMany({
    where: {
      studentId: { in: studentIds.length ? studentIds : ["__none__"] },
    },
    orderBy: [{ updatedAt: "desc" }],
    select: {
      id: true,
      studentId: true,
      rubricKey: true,
      moment: true,
      submittedAt: true,
      updatedAt: true,
      teacherReviews: {
        where: { teacherId: userId },
        select: {
          id: true,
          status: true,
          updatedAt: true,
          publishedAt: true,
        },
      },
    },
  });

  const assessmentsByStudent = new Map<string, typeof assessments>();
  for (const assessment of assessments) {
    const list = assessmentsByStudent.get(assessment.studentId) ?? [];
    list.push(assessment);
    assessmentsByStudent.set(assessment.studentId, list);
  }

  const rows = studentEnrollments
    .map((enrollment) => {
      const student = enrollment.user;
      const studentAssessments = assessmentsByStudent.get(student.id) ?? [];
      const latestAssessment = studentAssessments[0] ?? null;

      const pendingAssessment = studentAssessments.find(
        (a) => a.submittedAt && a.teacherReviews.length === 0
      );

      const draftReview = studentAssessments.find((a) =>
        a.teacherReviews.some((r) => r.status === ReviewStatus.DRAFT)
      );

      let statusText = "Nog geen assessmentactiviteit";
      let statusKind: "open" | "draft" | "done" | "idle" = "idle";

      if (pendingAssessment) {
        statusText = `Wacht op beoordeling • ${rubricLabel(
          pendingAssessment.rubricKey
        )} ${momentLabel(pendingAssessment.moment)}`;
        statusKind = "open";
      } else if (draftReview) {
        statusText = `Conceptfeedback open • ${rubricLabel(
          draftReview.rubricKey
        )} ${momentLabel(draftReview.moment)}`;
        statusKind = "draft";
      } else if (latestAssessment?.teacherReviews?.length) {
        statusText = `Beoordeeld • ${rubricLabel(
          latestAssessment.rubricKey
        )} ${momentLabel(latestAssessment.moment)}`;
        statusKind = "done";
      } else if (latestAssessment) {
        statusText = `Laatste activiteit • ${rubricLabel(
          latestAssessment.rubricKey
        )} ${momentLabel(latestAssessment.moment)}`;
        statusKind = "idle";
      }

      return {
        id: student.id,
        name: fullName(student),
        email: student.email,
        assessmentLocked: enrollment.assessmentLocked,
        latestAssessment,
        pendingAssessment,
        draftReview,
        assessmentCount: studentAssessments.length,
        statusText,
        statusKind,
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name, "nl"));

  const openCount = rows.filter((r) => r.statusKind === "open").length;
  const draftCount = rows.filter((r) => r.statusKind === "draft").length;
  const lockedCount = rows.filter((r) => r.assessmentLocked).length;

  return (
    <div style={pageStyle}>
      <div style={topBarStyle}>
        <div>
          <div style={crumbsStyle}>
            <Link href="/docent" style={crumbLinkStyle}>
              Docentdashboard
            </Link>
            <span> / </span>
            <span>{cohort.naam}</span>
          </div>

          <h1 style={h1Style}>{cohort.naam}</h1>
          <p style={subTextStyle}>
            {cohort.traject || "Traject onbekend"} • uitvoering {cohort.uitvoeringId}
          </p>
          <p style={tinyTextStyle}>
            Docent: {fullName(teacher)} • periode {formatDate(cohort.startDatum)} t/m{" "}
            {formatDate(cohort.eindDatum)}
          </p>
        </div>

        <div style={headerActionWrapStyle}>
          <Link href="/docent" style={backButtonStyle}>
            Terug naar dashboard
          </Link>
        </div>
      </div>

      <div style={statsGridStyle}>
        <div style={statCardStyle}>
          <div style={statLabelStyle}>Studenten</div>
          <div style={statValueStyle}>{rows.length}</div>
        </div>

        <div style={statCardStyle}>
          <div style={statLabelStyle}>Docenten</div>
          <div style={statValueStyle}>{teacherEnrollments.length}</div>
        </div>

        <div style={statCardStyle}>
          <div style={statLabelStyle}>Open beoordelingen</div>
          <div style={statValueStyle}>{openCount}</div>
        </div>

        <div style={statCardStyle}>
          <div style={statLabelStyle}>Conceptfeedback</div>
          <div style={statValueStyle}>{draftCount}</div>
        </div>

        <div style={statCardStyle}>
          <div style={statLabelStyle}>Afgesloten</div>
          <div style={statValueStyle}>{lockedCount}</div>
        </div>
      </div>

      <div style={contentGridStyle}>
        <section style={panelStyle}>
          <div style={panelHeaderStyle}>
            <div>
              <h2 style={sectionTitleStyle}>Studenten in dit cohort</h2>
              <p style={sectionTextStyle}>
                Vanuit hier kun je snel zien wie openstaat, wie conceptfeedback
                heeft en waar recente activiteit zit.
              </p>
            </div>
          </div>

          {rows.length === 0 ? (
            <div style={emptyStateStyle}>Geen studenten gevonden in dit cohort.</div>
          ) : (
            <div style={tableWrapStyle}>
              <table style={tableStyle}>
                <thead>
                  <tr style={theadRowStyle}>
                    <th style={thStyle}>Student</th>
                    <th style={thStyle}>Status</th>
                    <th style={thStyle}>Laatste activiteit</th>
                    <th style={thStyle}>Assessments</th>
                    <th style={thStyle}>Slot</th>
                    <th style={thStyle}>Actie</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.id}>
                      <td style={tdStyle}>
                        <div style={nameStyle}>{row.name}</div>
                        <div style={emailStyle}>{row.email || "—"}</div>
                      </td>

                      <td style={tdStyle}>
                        <span style={statusPillStyle(row.statusKind)}>
                          {row.statusText}
                        </span>
                      </td>

                      <td style={tdStyle}>
                        {row.latestAssessment ? (
                          <div>
                            <div style={activityMainStyle}>
                              {rubricLabel(row.latestAssessment.rubricKey)}{" "}
                              {momentLabel(row.latestAssessment.moment)}
                            </div>
                            <div style={activitySubStyle}>
                              bijgewerkt op {formatDateTime(row.latestAssessment.updatedAt)}
                            </div>
                          </div>
                        ) : (
                          <span style={mutedInlineStyle}>—</span>
                        )}
                      </td>

                      <td style={tdStyle}>{row.assessmentCount}</td>

                      <td style={tdStyle}>
                        {row.assessmentLocked ? (
                          <span style={lockedPillStyle}>Afgesloten</span>
                        ) : (
                          <span style={openPillStyle}>Open</span>
                        )}
                      </td>

                      <td style={tdStyle}>
                        <div style={actionColStyle}>
                          <Link
                            href={`/admin/users/${row.id}`}
                            style={tableLinkStyle}
                          >
                            Open student
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section style={sidePanelStyle}>
          <div style={panelStyle}>
            <h2 style={sectionTitleStyle}>Werkoverzicht</h2>
            <div style={sideListStyle}>
              <div style={sideItemStyle}>
                <div style={sideItemTitleStyle}>Open beoordelingen</div>
                <div style={sideItemValueStyle}>{openCount}</div>
              </div>
              <div style={sideItemStyle}>
                <div style={sideItemTitleStyle}>Conceptfeedback</div>
                <div style={sideItemValueStyle}>{draftCount}</div>
              </div>
              <div style={sideItemStyle}>
                <div style={sideItemTitleStyle}>Studenten actief</div>
                <div style={sideItemValueStyle}>{rows.length - lockedCount}</div>
              </div>
            </div>
          </div>

          <div style={panelStyle}>
            <h2 style={sectionTitleStyle}>Recente cohortactiviteit</h2>

            <div style={stackStyle}>
              {rows
                .filter((r) => r.latestAssessment)
                .sort((a, b) => {
                  const at = a.latestAssessment
                    ? new Date(a.latestAssessment.updatedAt).getTime()
                    : 0;
                  const bt = b.latestAssessment
                    ? new Date(b.latestAssessment.updatedAt).getTime()
                    : 0;
                  return bt - at;
                })
                .slice(0, 6)
                .map((row) => (
                  <div key={row.id} style={activityCardStyle}>
                    <div style={activityCardTitleStyle}>{row.name}</div>
                    <div style={activityCardMetaStyle}>
                      {rubricLabel(row.latestAssessment?.rubricKey)}{" "}
                      {momentLabel(row.latestAssessment?.moment)}
                    </div>
                    <div style={activityCardDateStyle}>
                      {formatDateTime(row.latestAssessment?.updatedAt)}
                    </div>
                  </div>
                ))}

              {rows.filter((r) => r.latestAssessment).length === 0 && (
                <div style={emptyStateStyle}>Nog geen recente activiteit zichtbaar.</div>
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

const pageStyle: CSSProperties = {
  padding: 32,
};

const topBarStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: 16,
  marginBottom: 24,
};

const crumbsStyle: CSSProperties = {
  fontSize: 13,
  color: "#6b7280",
  marginBottom: 10,
};

const crumbLinkStyle: CSSProperties = {
  color: "#374151",
  textDecoration: "none",
};

const h1Style: CSSProperties = {
  margin: 0,
  fontSize: 32,
};

const subTextStyle: CSSProperties = {
  marginTop: 8,
  marginBottom: 4,
  color: "#4b5563",
};

const tinyTextStyle: CSSProperties = {
  marginTop: 0,
  color: "#6b7280",
  fontSize: 13,
};

const headerActionWrapStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 10,
};

const backButtonStyle: CSSProperties = {
  display: "inline-block",
  padding: "10px 12px",
  border: "1px solid #e5e7eb",
  borderRadius: 10,
  textDecoration: "none",
  color: "#111827",
  background: "white",
};

const statsGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(5, minmax(0, 1fr))",
  gap: 16,
  marginBottom: 24,
};

const statCardStyle: CSSProperties = {
  border: "1px solid #e5e7eb",
  borderRadius: 16,
  padding: 18,
  background: "white",
};

const statLabelStyle: CSSProperties = {
  fontSize: 13,
  color: "#6b7280",
  marginBottom: 8,
};

const statValueStyle: CSSProperties = {
  fontSize: 28,
  fontWeight: 700,
  color: "#111827",
};

const contentGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "2fr 1fr",
  gap: 16,
};

const sidePanelStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 16,
};

const panelStyle: CSSProperties = {
  border: "1px solid #e5e7eb",
  borderRadius: 16,
  padding: 20,
  background: "white",
};

const panelHeaderStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: 12,
  marginBottom: 12,
};

const sectionTitleStyle: CSSProperties = {
  marginTop: 0,
  marginBottom: 8,
  fontSize: 20,
};

const sectionTextStyle: CSSProperties = {
  margin: 0,
  color: "#6b7280",
  fontSize: 14,
};

const emptyStateStyle: CSSProperties = {
  border: "1px dashed #d1d5db",
  borderRadius: 12,
  padding: 16,
  color: "#6b7280",
  background: "#fafafa",
};

const tableWrapStyle: CSSProperties = {
  overflowX: "auto",
};

const tableStyle: CSSProperties = {
  width: "100%",
  borderCollapse: "collapse",
};

const theadRowStyle: CSSProperties = {
  background: "#fafafa",
};

const thStyle: CSSProperties = {
  textAlign: "left",
  padding: "12px 10px",
  fontSize: 12,
  color: "#6b7280",
  borderBottom: "1px solid #e5e7eb",
};

const tdStyle: CSSProperties = {
  padding: "14px 10px",
  verticalAlign: "top",
  borderBottom: "1px solid #f1f5f9",
};

const nameStyle: CSSProperties = {
  fontWeight: 700,
  color: "#111827",
  marginBottom: 4,
};

const emailStyle: CSSProperties = {
  fontSize: 13,
  color: "#6b7280",
};

const activityMainStyle: CSSProperties = {
  color: "#111827",
  fontWeight: 600,
};

const activitySubStyle: CSSProperties = {
  color: "#6b7280",
  fontSize: 13,
  marginTop: 3,
};

const mutedInlineStyle: CSSProperties = {
  color: "#9ca3af",
};

const lockedPillStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  borderRadius: 999,
  padding: "6px 10px",
  fontSize: 12,
  background: "#f3f4f6",
  color: "#374151",
};

const openPillStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  borderRadius: 999,
  padding: "6px 10px",
  fontSize: 12,
  background: "#111827",
  color: "white",
};

function statusPillStyle(kind: "open" | "draft" | "done" | "idle"): CSSProperties {
  if (kind === "open") {
    return {
      display: "inline-flex",
      alignItems: "center",
      borderRadius: 999,
      padding: "6px 10px",
      fontSize: 12,
      background: "#111827",
      color: "white",
    };
  }

  if (kind === "draft") {
    return {
      display: "inline-flex",
      alignItems: "center",
      borderRadius: 999,
      padding: "6px 10px",
      fontSize: 12,
      background: "#e5e7eb",
      color: "#111827",
    };
  }

  if (kind === "done") {
    return {
      display: "inline-flex",
      alignItems: "center",
      borderRadius: 999,
      padding: "6px 10px",
      fontSize: 12,
      background: "#f3f4f6",
      color: "#374151",
    };
  }

  return {
    display: "inline-flex",
    alignItems: "center",
    borderRadius: 999,
    padding: "6px 10px",
    fontSize: 12,
    background: "#fafafa",
    color: "#6b7280",
    border: "1px solid #e5e7eb",
  };
}

const actionColStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 8,
};

const tableLinkStyle: CSSProperties = {
  color: "#111827",
  textDecoration: "none",
  fontWeight: 600,
};

const sideListStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 10,
};

const sideItemStyle: CSSProperties = {
  border: "1px solid #f0f0f0",
  borderRadius: 12,
  padding: 12,
  background: "#fafafa",
};

const sideItemTitleStyle: CSSProperties = {
  fontSize: 13,
  color: "#6b7280",
  marginBottom: 6,
};

const sideItemValueStyle: CSSProperties = {
  fontSize: 24,
  fontWeight: 700,
  color: "#111827",
};

const stackStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 10,
};

const activityCardStyle: CSSProperties = {
  border: "1px solid #e5e7eb",
  borderRadius: 12,
  padding: 12,
  background: "white",
};

const activityCardTitleStyle: CSSProperties = {
  fontWeight: 700,
  color: "#111827",
  marginBottom: 4,
};

const activityCardMetaStyle: CSSProperties = {
  fontSize: 14,
  color: "#374151",
  marginBottom: 4,
};

const activityCardDateStyle: CSSProperties = {
  fontSize: 13,
  color: "#6b7280",
};