import Link from "next/link";
import { redirect } from "next/navigation";
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
  return parts.join(" ").trim() || u.email || "Docent";
}

function uniqueById<T extends { id: string }>(items: T[]) {
  const seen = new Set<string>();
  return items.filter((item) => {
    if (seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
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

export default async function DocentDashboardPage() {
  const userId = await getSessionUserId();

  if (!userId) {
    redirect("/login");
  }

  const teacher = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      voornaam: true,
      tussenvoegsel: true,
      achternaam: true,
      role: true,
      enrollments: {
        select: {
          cohort: {
            select: {
              id: true,
              naam: true,
              traject: true,
              uitvoeringId: true,
              createdAt: true,
              enrollments: {
                select: {
                  id: true,
                  assessmentLocked: true,
                  user: {
                    select: {
                      id: true,
                      role: true,
                      voornaam: true,
                      tussenvoegsel: true,
                      achternaam: true,
                      email: true,
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  });

  if (!teacher) {
    redirect("/login");
  }

  const cohorts = uniqueById(
    teacher.enrollments.map((e) => e.cohort).filter(Boolean)
  );

  const cohortIds = cohorts.map((c) => c.id);

  const students = await prisma.user.findMany({
    where: {
      role: Role.STUDENT,
      enrollments: {
        some: {
          cohortId: { in: cohortIds.length ? cohortIds : ["__none__"] },
        },
      },
    },
    select: {
      id: true,
      email: true,
      voornaam: true,
      tussenvoegsel: true,
      achternaam: true,
      enrollments: {
        where: {
          cohortId: { in: cohortIds.length ? cohortIds : ["__none__"] },
        },
        select: {
          assessmentLocked: true,
          cohort: {
            select: {
              id: true,
              naam: true,
              traject: true,
            },
          },
        },
      },
      assessments: {
        orderBy: { updatedAt: "desc" },
        take: 5,
        select: {
          id: true,
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
      },
    },
  });

  const studentIds = students.map((s) => s.id);

  const submittedAssessments = await prisma.assessment.findMany({
    where: {
      studentId: { in: studentIds.length ? studentIds : ["__none__"] },
      submittedAt: { not: null },
    },
    orderBy: [{ submittedAt: "desc" }, { updatedAt: "desc" }],
    select: {
      id: true,
      rubricKey: true,
      moment: true,
      submittedAt: true,
      updatedAt: true,
      student: {
        select: {
          id: true,
          voornaam: true,
          tussenvoegsel: true,
          achternaam: true,
          email: true,
          enrollments: {
            where: {
              cohortId: { in: cohortIds.length ? cohortIds : ["__none__"] },
            },
            select: {
              cohort: {
                select: {
                  id: true,
                  naam: true,
                  traject: true,
                },
              },
            },
          },
        },
      },
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

  const draftTeacherReviews = await prisma.teacherReview.findMany({
    where: {
      teacherId: userId,
      status: ReviewStatus.DRAFT,
      assessment: {
        studentId: { in: studentIds.length ? studentIds : ["__none__"] },
      },
    },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      updatedAt: true,
      assessment: {
        select: {
          id: true,
          rubricKey: true,
          moment: true,
          submittedAt: true,
          student: {
            select: {
              id: true,
              voornaam: true,
              tussenvoegsel: true,
              achternaam: true,
              email: true,
              enrollments: {
                where: {
                  cohortId: { in: cohortIds.length ? cohortIds : ["__none__"] },
                },
                select: {
                  cohort: {
                    select: {
                      id: true,
                      naam: true,
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  });

  const missingReviewAssessments = submittedAssessments.filter(
    (a) => a.teacherReviews.length === 0
  );

  const actionableAssessmentIds = new Set<string>();
  for (const a of missingReviewAssessments) actionableAssessmentIds.add(a.id);
  for (const r of draftTeacherReviews) actionableAssessmentIds.add(r.assessment.id);

  const openActions = actionableAssessmentIds.size;

  const recentActivity = submittedAssessments.slice(0, 6).map((a) => {
    const cohortName = a.student.enrollments[0]?.cohort?.naam ?? "Onbekend cohort";
    return {
      id: a.id,
      title: `${fullName(a.student)} heeft ${rubricLabel(a.rubricKey)} ${momentLabel(a.moment)} ingediend`,
      meta: `${cohortName} • ${formatDateTime(a.submittedAt)}`,
    };
  });

  const studentsNeedingAttention = students
    .map((student) => {
      const latest = student.assessments[0] ?? null;
      const cohortName = student.enrollments[0]?.cohort?.naam ?? "Onbekend cohort";

      const latestSubmittedWithoutReview = student.assessments.find(
        (a) => a.submittedAt && a.teacherReviews.length === 0
      );

      const latestDraft = student.assessments.find((a) =>
        a.teacherReviews.some((r) => r.status === ReviewStatus.DRAFT)
      );

      let reason = "";
      let sortScore = 0;
      let updatedAt: Date | null = null;

      if (latestSubmittedWithoutReview) {
        reason = `Nieuwe studentinvoer wacht op beoordeling • ${rubricLabel(
          latestSubmittedWithoutReview.rubricKey
        )} ${momentLabel(latestSubmittedWithoutReview.moment)}`;
        sortScore = 3;
        updatedAt =
          latestSubmittedWithoutReview.submittedAt ??
          latestSubmittedWithoutReview.updatedAt;
      } else if (latestDraft) {
        reason = `Conceptfeedback staat nog open • ${rubricLabel(
          latestDraft.rubricKey
        )} ${momentLabel(latestDraft.moment)}`;
        sortScore = 2;
        updatedAt = latestDraft.updatedAt;
      } else if (latest) {
        reason = `Laatste activiteit op ${formatDate(latest.updatedAt)}`;
        sortScore = 1;
        updatedAt = latest.updatedAt;
      } else {
        reason = "Nog geen assessmentactiviteit zichtbaar";
        sortScore = 0;
        updatedAt = null;
      }

      return {
        id: student.id,
        name: fullName(student),
        cohortName,
        reason,
        sortScore,
        updatedAt,
      };
    })
    .sort((a, b) => {
      if (b.sortScore !== a.sortScore) return b.sortScore - a.sortScore;
      const at = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
      const bt = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
      return bt - at;
    })
    .slice(0, 6);

  const cohortCards = cohorts.map((cohort) => {
    const studentEnrollments = cohort.enrollments.filter(
      (e) => e.user.role === Role.STUDENT
    );
    const teacherEnrollments = cohort.enrollments.filter(
      (e) => e.user.role === Role.TEACHER
    );
    const unlockedCount = studentEnrollments.filter(
      (e) => !e.assessmentLocked
    ).length;

    return {
      id: cohort.id,
      naam: cohort.naam,
      traject: cohort.traject || "Traject onbekend",
      uitvoeringId: cohort.uitvoeringId,
      studentCount: studentEnrollments.length,
      teacherCount: teacherEnrollments.length,
      openCount: unlockedCount,
    };
  });

  const groupCount = cohortCards.length;
  const studentCount = students.length;
  const recentUpdates = recentActivity.length;
  const draftCount = draftTeacherReviews.length;
  const waitingCount = missingReviewAssessments.length;

  return (
    <div style={pageStyle}>
      <div style={heroStyle}>
        <div>
          <h1 style={h1Style}>Docentdashboard</h1>
          <p style={heroTextStyle}>Welkom, {fullName(teacher)}</p>
          <p style={heroSubtleStyle}>
            Dit is je werkstartscherm: groepen, open beoordelingen en recente
            studentactiviteit in één overzicht.
          </p>
        </div>
      </div>

      <div style={statsGridStyle}>
        <div style={cardStyle}>
          <div style={cardLabel}>Mijn groepen</div>
          <div style={cardValue}>{groupCount}</div>
          <div style={cardHint}>Cohorts waar je nu aan gekoppeld bent</div>
        </div>

        <div style={cardStyle}>
          <div style={cardLabel}>Studenten</div>
          <div style={cardValue}>{studentCount}</div>
          <div style={cardHint}>Unieke studenten binnen jouw groepen</div>
        </div>

        <div style={cardStyle}>
          <div style={cardLabel}>Open acties</div>
          <div style={cardValue}>{openActions}</div>
          <div style={cardHint}>
            {waitingCount} wachtend • {draftCount} in concept
          </div>
        </div>

        <div style={cardStyle}>
          <div style={cardLabel}>Recente updates</div>
          <div style={cardValue}>{recentUpdates}</div>
          <div style={cardHint}>Laatste ingediende assessments</div>
        </div>
      </div>

      <div style={topGridStyle}>
        <section style={panelStyle}>
          <div style={panelHeaderStyle}>
            <div>
              <h2 style={sectionTitle}>Mijn groepen</h2>
              <p style={mutedText}>
                Overzicht van de cohorts waar jij als docent aan gekoppeld bent.
              </p>
            </div>
          </div>

          {cohortCards.length === 0 ? (
            <div style={emptyStateStyle}>Nog geen groepen gekoppeld.</div>
          ) : (
            <div style={groupGridStyle}>
              {cohortCards.map((c) => (
                <Link
                  key={c.id}
                  href={`/docent/cohort/${c.id}`}
                  style={groupCardLinkStyle}
                >
                  <div style={groupCardStyle}>
                    <div style={groupTitleStyle}>{c.naam}</div>
                    <div style={groupMetaStyle}>
                      {c.traject} • uitvoering {c.uitvoeringId}
                    </div>

                    <div style={groupStatsRowStyle}>
                      <div style={miniStatStyle}>
                        <div style={miniStatValueStyle}>{c.studentCount}</div>
                        <div style={miniStatLabelStyle}>studenten</div>
                      </div>
                      <div style={miniStatStyle}>
                        <div style={miniStatValueStyle}>{c.teacherCount}</div>
                        <div style={miniStatLabelStyle}>docenten</div>
                      </div>
                      <div style={miniStatStyle}>
                        <div style={miniStatValueStyle}>{c.openCount}</div>
                        <div style={miniStatLabelStyle}>open</div>
                      </div>
                    </div>

                    <div style={groupFooterStyle}>
                      <span style={softBadgeStyle}>
                        {c.openCount > 0
                          ? `${c.openCount} studenten nog actief`
                          : "Geen open studentslots"}
                      </span>

                      <span style={groupOpenStyle}>Open groep →</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>

        <section style={panelStyle}>
          <h2 style={sectionTitle}>Snelle acties</h2>
          <div style={actionListStyle}>
            <Link href="/docent" style={actionLinkStyle}>
              Dashboard verversen
            </Link>
            <Link href="/login" style={actionLinkStyle}>
              Wissel van account
            </Link>
            <div style={actionGhostStyle}>
              {waitingCount > 0
                ? `${waitingCount} ingediende assessments wachten nog op jouw review`
                : "Geen onbeoordeelde ingediende assessments"}
            </div>
            <div style={actionGhostStyle}>
              {draftCount > 0
                ? `${draftCount} conceptbeoordelingen zijn nog niet gepubliceerd`
                : "Geen open conceptfeedback"}
            </div>
          </div>
        </section>
      </div>

      <div style={middleGridStyle}>
        <section style={panelStyle}>
          <div style={panelHeaderStyle}>
            <div>
              <h2 style={sectionTitle}>Open acties</h2>
              <p style={mutedText}>
                Werk dat nu direct jouw aandacht vraagt.
              </p>
            </div>
          </div>

          {openActions === 0 ? (
            <div style={emptyStateStyle}>Er staan nu geen open acties klaar.</div>
          ) : (
            <div style={stackStyle}>
              {missingReviewAssessments.slice(0, 5).map((a) => {
                const cohortName =
                  a.student.enrollments[0]?.cohort?.naam ?? "Onbekend cohort";

                return (
                  <div key={a.id} style={listCardStyle}>
                    <div style={listCardTitleStyle}>
                      Beoordeling starten voor {fullName(a.student)}
                    </div>
                    <div style={listCardMetaStyle}>
                      {cohortName} • {rubricLabel(a.rubricKey)}{" "}
                      {momentLabel(a.moment)}
                    </div>
                    <div style={listCardHintStyle}>
                      Ingediend op {formatDateTime(a.submittedAt)}
                    </div>
                  </div>
                );
              })}

              {draftTeacherReviews.slice(0, 5).map((r) => {
                const cohortName =
                  r.assessment.student.enrollments[0]?.cohort?.naam ??
                  "Onbekend cohort";

                return (
                  <div key={r.id} style={listCardStyle}>
                    <div style={listCardTitleStyle}>
                      Concept afronden voor {fullName(r.assessment.student)}
                    </div>
                    <div style={listCardMetaStyle}>
                      {cohortName} • {rubricLabel(r.assessment.rubricKey)}{" "}
                      {momentLabel(r.assessment.moment)}
                    </div>
                    <div style={listCardHintStyle}>
                      Laatst bijgewerkt op {formatDateTime(r.updatedAt)}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <section style={panelStyle}>
          <div style={panelHeaderStyle}>
            <div>
              <h2 style={sectionTitle}>Studenten die aandacht vragen</h2>
              <p style={mutedText}>
                Korte shortlist van studenten waar iets open of actueel is.
              </p>
            </div>
          </div>

          {studentsNeedingAttention.length === 0 ? (
            <div style={emptyStateStyle}>
              Nog geen studenten met zichtbare activiteit of open acties.
            </div>
          ) : (
            <div style={stackStyle}>
              {studentsNeedingAttention.map((student) => (
                <div key={student.id} style={listCardStyle}>
                  <div style={listCardTitleStyle}>{student.name}</div>
                  <div style={listCardMetaStyle}>{student.cohortName}</div>
                  <div style={listCardHintStyle}>{student.reason}</div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      <div style={{ marginTop: 16 }}>
        <section style={panelStyle}>
          <div style={panelHeaderStyle}>
            <div>
              <h2 style={sectionTitle}>Recente activiteit</h2>
              <p style={mutedText}>
                Laatste studentinvoer binnen jouw groepen.
              </p>
            </div>
          </div>

          {recentActivity.length === 0 ? (
            <div style={emptyStateStyle}>
              Er is nog geen recente studentactiviteit gevonden.
            </div>
          ) : (
            <div style={stackStyle}>
              {recentActivity.map((item) => (
                <div key={item.id} style={activityRowStyle}>
                  <div style={activityDotStyle} />
                  <div>
                    <div style={activityTitleStyle}>{item.title}</div>
                    <div style={activityMetaStyle}>{item.meta}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

const pageStyle: CSSProperties = {
  padding: 32,
};

const heroStyle: CSSProperties = {
  marginBottom: 24,
};

const h1Style: CSSProperties = {
  margin: 0,
  fontSize: 32,
};

const heroTextStyle: CSSProperties = {
  marginTop: 8,
  marginBottom: 6,
  color: "#374151",
  fontSize: 16,
};

const heroSubtleStyle: CSSProperties = {
  margin: 0,
  color: "#6b7280",
  fontSize: 14,
  maxWidth: 760,
};

const statsGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
  gap: 16,
  marginBottom: 24,
};

const topGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "2fr 1fr",
  gap: 16,
};

const middleGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: 16,
  marginTop: 16,
};

const cardStyle: CSSProperties = {
  border: "1px solid #e5e7eb",
  borderRadius: 16,
  padding: 18,
  background: "white",
};

const cardLabel: CSSProperties = {
  fontSize: 13,
  color: "#6b7280",
  marginBottom: 8,
};

const cardValue: CSSProperties = {
  fontSize: 30,
  fontWeight: 700,
  color: "#111827",
  lineHeight: 1.1,
};

const cardHint: CSSProperties = {
  marginTop: 8,
  color: "#6b7280",
  fontSize: 13,
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

const sectionTitle: CSSProperties = {
  marginTop: 0,
  marginBottom: 8,
  fontSize: 20,
};

const mutedText: CSSProperties = {
  color: "#6b7280",
  marginTop: 0,
  marginBottom: 0,
  fontSize: 14,
};

const emptyStateStyle: CSSProperties = {
  border: "1px dashed #d1d5db",
  borderRadius: 12,
  padding: 16,
  color: "#6b7280",
  background: "#fafafa",
};

const actionListStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 10,
};

const actionLinkStyle: CSSProperties = {
  display: "inline-block",
  padding: "10px 12px",
  border: "1px solid #e5e7eb",
  borderRadius: 10,
  textDecoration: "none",
  color: "#111827",
  background: "white",
};

const actionGhostStyle: CSSProperties = {
  padding: "10px 12px",
  border: "1px dashed #d1d5db",
  borderRadius: 10,
  color: "#6b7280",
  background: "#fafafa",
  fontSize: 14,
};

const groupGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
  gap: 12,
};

const groupCardLinkStyle: CSSProperties = {
  textDecoration: "none",
  color: "inherit",
  display: "block",
};

const groupCardStyle: CSSProperties = {
  border: "1px solid #e5e7eb",
  borderRadius: 14,
  padding: 16,
  background: "#fff",
  height: "100%",
};

const groupTitleStyle: CSSProperties = {
  fontSize: 18,
  fontWeight: 700,
  marginBottom: 6,
  color: "#111827",
};

const groupMetaStyle: CSSProperties = {
  color: "#6b7280",
  fontSize: 14,
  marginBottom: 12,
};

const groupStatsRowStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
  gap: 10,
};

const miniStatStyle: CSSProperties = {
  border: "1px solid #f0f0f0",
  borderRadius: 12,
  padding: 10,
  background: "#fafafa",
};

const miniStatValueStyle: CSSProperties = {
  fontSize: 20,
  fontWeight: 700,
  color: "#111827",
};

const miniStatLabelStyle: CSSProperties = {
  fontSize: 12,
  color: "#6b7280",
  marginTop: 4,
};

const groupFooterStyle: CSSProperties = {
  marginTop: 14,
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 10,
};

const softBadgeStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  borderRadius: 999,
  padding: "6px 10px",
  fontSize: 12,
  background: "#f3f4f6",
  color: "#374151",
};

const groupOpenStyle: CSSProperties = {
  fontSize: 13,
  fontWeight: 700,
  color: "#111827",
};

const stackStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 10,
};

const listCardStyle: CSSProperties = {
  border: "1px solid #e5e7eb",
  borderRadius: 12,
  padding: 14,
  background: "#fff",
};

const listCardTitleStyle: CSSProperties = {
  fontWeight: 700,
  color: "#111827",
  marginBottom: 4,
};

const listCardMetaStyle: CSSProperties = {
  color: "#374151",
  fontSize: 14,
  marginBottom: 4,
};

const listCardHintStyle: CSSProperties = {
  color: "#6b7280",
  fontSize: 13,
};

const activityRowStyle: CSSProperties = {
  display: "flex",
  alignItems: "flex-start",
  gap: 10,
  padding: "8px 0",
};

const activityDotStyle: CSSProperties = {
  width: 10,
  height: 10,
  borderRadius: 999,
  background: "#111827",
  marginTop: 6,
  flexShrink: 0,
};

const activityTitleStyle: CSSProperties = {
  fontWeight: 600,
  color: "#111827",
};

const activityMetaStyle: CSSProperties = {
  color: "#6b7280",
  fontSize: 13,
  marginTop: 2,
};