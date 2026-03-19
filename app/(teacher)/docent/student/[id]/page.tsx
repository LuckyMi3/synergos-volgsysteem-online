import Link from "next/link";
import { notFound } from "next/navigation";
import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getSessionUserId } from "@/lib/auth/session";
import { getRubric } from "@/lib/rubrics";

export const runtime = "nodejs";

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

type MomentKey = "M1" | "M2" | "M3";

function fullName(user: {
  voornaam: string;
  tussenvoegsel: string | null;
  achternaam: string;
}) {
  return [user.voornaam, user.tussenvoegsel, user.achternaam].filter(Boolean).join(" ").trim();
}

function trajectToStage(traject: string | null | undefined) {
  const s = String(traject ?? "").toLowerCase();

  if (s.includes("3vo")) return "3VO";
  if (s.includes("2vo")) return "2VO";
  if (s.includes("1vo")) return "1VO";
  if (s.includes("basis")) return "BASISJAAR";

  return null;
}

function stageRank(stage: string | null) {
  if (stage === "BASISJAAR") return 0;
  if (stage === "1VO") return 1;
  if (stage === "2VO") return 2;
  if (stage === "3VO") return 3;
  return -1;
}

function uitvoeringRank(uitvoeringId: string | null | undefined) {
  const s = String(uitvoeringId ?? "").trim();
  const match = s.match(/^(\d{2})\s*\/\s*(\d{2})$/);

  if (!match) return -1;

  const start = Number(match[1]);
  const end = Number(match[2]);

  if (Number.isNaN(start) || Number.isNaN(end)) return -1;

  return start * 100 + end;
}

function chooseBestEnrollment<
  T extends {
    cohort: {
      id: string;
      naam: string;
      traject: string | null;
      uitvoeringId: string;
    };
  }
>(enrollments: T[]) {
  if (!enrollments.length) return null;

  const sorted = [...enrollments].sort((a, b) => {
    const aStage = stageRank(trajectToStage(a.cohort.traject));
    const bStage = stageRank(trajectToStage(b.cohort.traject));

    if (aStage !== bStage) return bStage - aStage;

    const aUitvoering = uitvoeringRank(a.cohort.uitvoeringId);
    const bUitvoering = uitvoeringRank(b.cohort.uitvoeringId);

    if (aUitvoering !== bUitvoering) return bUitvoering - aUitvoering;

    return a.cohort.naam.localeCompare(b.cohort.naam, "nl");
  });

  return sorted[0] ?? null;
}

function clamp(n: number, min: number, max: number) {
  if (n < min) return min;
  if (n > max) return max;
  return n;
}

function labelForValue(rubric: any, value: number | null | undefined) {
  if (value == null) return "—";

  const min = Number(rubric?.scale?.min ?? 0);
  const max = Number(rubric?.scale?.max ?? 10);
  const v = clamp(value, min, max);
  const labels = rubric?.scale?.labels;

  if (Array.isArray(labels)) {
    const idx = v - min;
    return labels[idx] ?? String(v);
  }

  if (labels && typeof labels === "object") {
    const keys = Object.keys(labels)
      .map((k) => Number(k))
      .filter((k) => Number.isFinite(k))
      .sort((a, b) => a - b);

    if (keys.length === 0) return String(v);
    if (labels[v] != null) return String(labels[v]);

    let chosen = keys[0];
    for (const k of keys) {
      if (k <= v) chosen = k;
      else break;
    }

    return String(labels[chosen] ?? v);
  }

  return String(v);
}

function colorForValue(rubric: any, value: number | null | undefined) {
  if (value == null) return "#9ca3af";

  const min = Number(rubric?.scale?.min ?? 0);
  const max = Number(rubric?.scale?.max ?? 10);
  const v = clamp(value, min, max);
  const ratio = max === min ? 1 : (v - min) / (max - min);

  if (ratio <= 0.3) return "#c0392b";
  if (ratio <= 0.7) return "#e67e22";
  return "#27ae60";
}

function chipStyle(background: string, color: string, border: string) {
  return {
    display: "inline-block",
    padding: "6px 10px",
    borderRadius: 999,
    background,
    color,
    border,
    fontSize: 13,
    fontWeight: 600 as const,
  };
}

export default async function DocentStudentPage({ params }: PageProps) {
  const { id: studentId } = await params;

  const meId = await getSessionUserId();

  if (!meId) {
    return (
      <main style={{ padding: 24 }}>
        <h1 style={{ fontSize: 28, marginBottom: 12 }}>Geen toegang</h1>
        <p>Je bent niet ingelogd.</p>
      </main>
    );
  }

  const me = await prisma.user.findUnique({
    where: { id: meId },
    select: {
      id: true,
      role: true,
      voornaam: true,
      tussenvoegsel: true,
      achternaam: true,
      email: true,
      enrollments: {
        select: {
          id: true,
          cohortId: true,
          cohort: {
            select: {
              id: true,
              naam: true,
              traject: true,
              uitvoeringId: true,
            },
          },
        },
      },
    },
  });

  if (!me) {
    return (
      <main style={{ padding: 24 }}>
        <h1 style={{ fontSize: 28, marginBottom: 12 }}>Geen toegang</h1>
        <p>Gebruiker niet gevonden.</p>
      </main>
    );
  }

  if (me.role !== Role.TEACHER && me.role !== Role.ADMIN) {
    return (
      <main style={{ padding: 24 }}>
        <h1 style={{ fontSize: 28, marginBottom: 12 }}>Geen toegang</h1>
        <p>Alleen docenten en admins kunnen deze pagina bekijken.</p>
      </main>
    );
  }

  const student = await prisma.user.findUnique({
    where: { id: studentId },
    select: {
      id: true,
      role: true,
      voornaam: true,
      tussenvoegsel: true,
      achternaam: true,
      email: true,
      createdAt: true,
      enrollments: {
        select: {
          id: true,
          cohortId: true,
          coachNaam: true,
          trajectStatus: true,
          assessmentLocked: true,
          cohort: {
            select: {
              id: true,
              naam: true,
              traject: true,
              uitvoeringId: true,
            },
          },
        },
      },
      credential: {
        select: {
          id: true,
          exam1Completed: true,
          exam2Completed: true,
          exam3Completed: true,
          mbkCompleted: true,
          psbkCompleted: true,
          leertherapieCount: true,
          intervisieCount: true,
          supervisieCount: true,
          eindsupervisieDone: true,
          updatedAt: true,
        },
      },
    },
  });

  if (!student) {
    notFound();
  }

  if (student.role !== Role.STUDENT) {
    return (
      <main style={{ padding: 24 }}>
        <h1 style={{ fontSize: 28, marginBottom: 12 }}>Geen student</h1>
        <p>Dit gebruiker-ID hoort niet bij een student.</p>
      </main>
    );
  }

  const myCohortIds = new Set(me.enrollments.map((e) => e.cohortId));

  const sharedEnrollments = student.enrollments.filter((e) => myCohortIds.has(e.cohortId));

  if (me.role !== Role.ADMIN && sharedEnrollments.length === 0) {
    return (
      <main style={{ padding: 24, maxWidth: 1000, margin: "0 auto" }}>
        <Link
          href="/docent"
          style={{
            display: "inline-block",
            marginBottom: 16,
            textDecoration: "none",
            color: "#374151",
          }}
        >
          ← Terug naar docent dashboard
        </Link>

        <h1 style={{ fontSize: 28, marginBottom: 12 }}>Geen toegang</h1>
        <p>Je bent niet gekoppeld aan een cohort waarin deze student zit.</p>
      </main>
    );
  }

  const bestEnrollment =
    me.role === Role.ADMIN
      ? chooseBestEnrollment(student.enrollments)
      : chooseBestEnrollment(sharedEnrollments);

  const activeCohort = bestEnrollment?.cohort ?? null;
  const rubricKey = (activeCohort?.traject || "1vo").toLowerCase().trim();
  const rubric = getRubric(rubricKey);

  const moments: MomentKey[] = ["M1", "M2", "M3"];

  const assessments = await prisma.assessment.findMany({
    where: {
      studentId: student.id,
      rubricKey,
      moment: {
        in: moments,
      },
    },
    include: {
      scores: {
        orderBy: [{ themeId: "asc" }, { questionId: "asc" }],
      },
      teacherScores: {
        where: { teacherId: me.id },
        orderBy: [{ themeId: "asc" }, { questionId: "asc" }],
      },
      teacherReviews: {
        where: { teacherId: me.id },
        orderBy: { updatedAt: "desc" },
        take: 1,
      },
    },
    orderBy: { createdAt: "asc" },
  });

  const assessmentByMoment = new Map<MomentKey, (typeof assessments)[number]>();
  for (const assessment of assessments) {
    assessmentByMoment.set(assessment.moment as MomentKey, assessment);
  }

  const studentName = fullName(student);

  return (
    <main style={{ padding: 24, maxWidth: 1100, margin: "0 auto" }}>
      <div style={{ marginBottom: 20 }}>
        <div
          style={{
            display: "flex",
            gap: 10,
            flexWrap: "wrap",
            alignItems: "center",
            marginBottom: 16,
          }}
        >
          <Link
            href={
              activeCohort
                ? `/docent/cohort/${activeCohort.id}`
                : "/docent"
            }
            style={{
              textDecoration: "none",
              color: "#374151",
            }}
          >
            ← Terug
          </Link>

          <Link
            href="/docent"
            style={{
              textDecoration: "none",
              color: "#374151",
            }}
          >
            Naar docent dashboard
          </Link>
        </div>

        <h1 style={{ fontSize: 32, fontWeight: 700, margin: 0 }}>{studentName}</h1>

        <p style={{ margin: "8px 0 0 0", color: "#6b7280" }}>{student.email}</p>

        <div
          style={{
            display: "flex",
            gap: 10,
            flexWrap: "wrap",
            marginTop: 14,
          }}
        >
          {activeCohort ? (
            <span style={chipStyle("#f3f4f6", "#111827", "1px solid #e5e7eb")}>
              Cohort: {activeCohort.naam}
            </span>
          ) : null}

          {activeCohort?.uitvoeringId ? (
            <span style={chipStyle("#f3f4f6", "#111827", "1px solid #e5e7eb")}>
              Uitvoering: {activeCohort.uitvoeringId}
            </span>
          ) : null}

          {activeCohort?.traject ? (
            <span style={chipStyle("#eff6ff", "#1d4ed8", "1px solid #bfdbfe")}>
              Traject: {activeCohort.traject}
            </span>
          ) : null}

          {bestEnrollment?.assessmentLocked ? (
            <span style={chipStyle("#fff7ed", "#9a3412", "1px solid #fdba74")}>
              Volgsysteem vergrendeld
            </span>
          ) : (
            <span style={chipStyle("#ecfdf5", "#166534", "1px solid #86efac")}>
              Volgsysteem beschikbaar
            </span>
          )}
        </div>
      </div>

      {student.enrollments.length > 0 ? (
        <section
          style={{
            border: "1px solid #e5e7eb",
            borderRadius: 16,
            background: "#fff",
            padding: 18,
            marginBottom: 20,
          }}
        >
          <h2 style={{ fontSize: 18, margin: "0 0 12px 0" }}>Cohorts</h2>

          <div style={{ display: "grid", gap: 10 }}>
            {student.enrollments.map((enrollment) => {
              const shared = myCohortIds.has(enrollment.cohortId) || me.role === Role.ADMIN;

              return (
                <div
                  key={enrollment.id}
                  style={{
                    border: "1px solid #e5e7eb",
                    borderRadius: 12,
                    padding: 12,
                    background: shared ? "#ffffff" : "#fafafa",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      gap: 10,
                      flexWrap: "wrap",
                      alignItems: "center",
                    }}
                  >
                    <strong>{enrollment.cohort.naam}</strong>

                    <span style={chipStyle("#f3f4f6", "#374151", "1px solid #e5e7eb")}>
                      {enrollment.cohort.uitvoeringId}
                    </span>

                    {enrollment.cohort.traject ? (
                      <span style={chipStyle("#f9fafb", "#374151", "1px solid #e5e7eb")}>
                        {enrollment.cohort.traject}
                      </span>
                    ) : null}

                    {shared ? (
                      <span style={chipStyle("#ecfdf5", "#166534", "1px solid #86efac")}>
                        Jouw cohort
                      </span>
                    ) : (
                      <span style={chipStyle("#f3f4f6", "#6b7280", "1px solid #e5e7eb")}>
                        Niet jouw cohort
                      </span>
                    )}
                  </div>

                  <div
                    style={{
                      display: "flex",
                      gap: 10,
                      flexWrap: "wrap",
                      marginTop: 10,
                      fontSize: 14,
                      color: "#4b5563",
                    }}
                  >
                    {enrollment.coachNaam ? <span>Coach: {enrollment.coachNaam}</span> : null}
                    {enrollment.trajectStatus ? <span>Status: {enrollment.trajectStatus}</span> : null}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      ) : null}

      {student.credential ? (
        <section
          style={{
            border: "1px solid #e5e7eb",
            borderRadius: 16,
            background: "#fff",
            padding: 18,
            marginBottom: 20,
          }}
        >
          <h2 style={{ fontSize: 18, margin: "0 0 12px 0" }}>Dossierstatus</h2>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: 12,
            }}
          >
            <div style={{ border: "1px solid #e5e7eb", borderRadius: 12, padding: 12 }}>
              <strong>Tentamens</strong>
              <div style={{ marginTop: 8, fontSize: 14, color: "#374151", lineHeight: 1.8 }}>
                <div>Ontwikkelingspsychologie: {student.credential.exam1Completed ? "Ja" : "Nee"}</div>
                <div>Haptonomische fenomenen: {student.credential.exam2Completed ? "Ja" : "Nee"}</div>
                <div>Psychopathologie: {student.credential.exam3Completed ? "Ja" : "Nee"}</div>
              </div>
            </div>

            <div style={{ border: "1px solid #e5e7eb", borderRadius: 12, padding: 12 }}>
              <strong>Basiskennis</strong>
              <div style={{ marginTop: 8, fontSize: 14, color: "#374151", lineHeight: 1.8 }}>
                <div>MBK: {student.credential.mbkCompleted ? "Ja" : "Nee"}</div>
                <div>PSBK: {student.credential.psbkCompleted ? "Ja" : "Nee"}</div>
              </div>
            </div>

            <div style={{ border: "1px solid #e5e7eb", borderRadius: 12, padding: 12 }}>
              <strong>Praktijkvorming</strong>
              <div style={{ marginTop: 8, fontSize: 14, color: "#374151", lineHeight: 1.8 }}>
                <div>Leertherapie: {student.credential.leertherapieCount}/10</div>
                <div>Intervisie: {student.credential.intervisieCount}/10</div>
                <div>Supervisie: {student.credential.supervisieCount}/12</div>
                <div>Eindsupervisie: {student.credential.eindsupervisieDone ? "Ja" : "Nee"}</div>
              </div>
            </div>
          </div>
        </section>
      ) : null}

      <section
        style={{
          border: "1px solid #e5e7eb",
          borderRadius: 16,
          background: "#fff",
          padding: 18,
        }}
      >
        <div
          style={{
            display: "flex",
            gap: 10,
            flexWrap: "wrap",
            alignItems: "center",
            marginBottom: 16,
          }}
        >
          <h2 style={{ fontSize: 20, margin: 0 }}>Volgsysteem</h2>

          <span style={chipStyle("#f3f4f6", "#111827", "1px solid #e5e7eb")}>
            Rubric: {rubric?.title ?? rubricKey}
          </span>
        </div>

        <div style={{ display: "grid", gap: 18 }}>
          {moments.map((moment) => {
            const assessment = assessmentByMoment.get(moment);

            const scoreMap = new Map(
              (assessment?.scores ?? []).map((row) => [`${row.themeId}__${row.questionId}`, row])
            );

            const teacherScoreMap = new Map(
              (assessment?.teacherScores ?? []).map((row) => [
                `${row.themeId}__${row.questionId}`,
                row,
              ])
            );

            const teacherReview = assessment?.teacherReviews?.[0] ?? null;

            return (
              <section
                key={moment}
                style={{
                  border: "1px solid #e5e7eb",
                  borderRadius: 14,
                  padding: 16,
                  background: "#fcfcfd",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    gap: 10,
                    flexWrap: "wrap",
                    alignItems: "center",
                    marginBottom: 14,
                  }}
                >
                  <h3 style={{ margin: 0, fontSize: 18 }}>{moment}</h3>

                  {assessment ? (
                    <span style={chipStyle("#ecfdf5", "#166534", "1px solid #86efac")}>
                      Assessment aanwezig
                    </span>
                  ) : (
                    <span style={chipStyle("#f3f4f6", "#6b7280", "1px solid #e5e7eb")}>
                      Nog geen assessment
                    </span>
                  )}

                  {assessment?.submittedAt ? (
                    <span style={chipStyle("#111827", "#ffffff", "1px solid #111827")}>
                      Ingeleverd
                    </span>
                  ) : assessment ? (
                    <span style={chipStyle("#fff7ed", "#9a3412", "1px solid #fdba74")}>
                      Nog niet ingeleverd
                    </span>
                  ) : null}

                  {teacherReview?.status === "PUBLISHED" ? (
                    <span style={chipStyle("#111827", "#ffffff", "1px solid #111827")}>
                      Docentreview gepubliceerd
                    </span>
                  ) : teacherReview ? (
                    <span style={chipStyle("#fff7e6", "#8a4b00", "1px solid #ffd8a8")}>
                      Docentreview concept
                    </span>
                  ) : null}
                </div>

                {assessment ? (
                  <div style={{ display: "grid", gap: 14 }}>
                    {rubric?.themes?.map((theme: any) => (
                      <div
                        key={theme.id}
                        style={{
                          border: "1px solid #e5e7eb",
                          borderRadius: 12,
                          overflow: "hidden",
                          background: "#fff",
                        }}
                      >
                        <div
                          style={{
                            padding: "12px 14px",
                            borderBottom: "1px solid #e5e7eb",
                            background: "#f9fafb",
                            fontWeight: 700,
                          }}
                        >
                          {theme.title}
                        </div>

                        <div style={{ display: "grid" }}>
                          {theme.questions.map((question: any, index: number) => {
                            const key = `${theme.id}__${question.id}`;
                            const studentScore = scoreMap.get(key);
                            const teacherScore = teacherScoreMap.get(key);

                            return (
                              <div
                                key={question.id}
                                style={{
                                  padding: "14px",
                                  borderTop: index === 0 ? "none" : "1px solid #f1f5f9",
                                }}
                              >
                                <div style={{ fontWeight: 600, color: "#111827", marginBottom: 10 }}>
                                  {question.text}
                                </div>

                                <div
                                  style={{
                                    display: "grid",
                                    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                                    gap: 12,
                                  }}
                                >
                                  <div
                                    style={{
                                      border: "1px solid #e5e7eb",
                                      borderRadius: 10,
                                      padding: 12,
                                    }}
                                  >
                                    <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 6 }}>
                                      Studentscore
                                    </div>

                                    <div
                                      style={{
                                        fontSize: 16,
                                        fontWeight: 700,
                                        color: colorForValue(rubric, studentScore?.score),
                                      }}
                                    >
                                      {studentScore
                                        ? `${labelForValue(rubric, studentScore.score)} (${studentScore.score})`
                                        : "—"}
                                    </div>

                                    {studentScore?.comment ? (
                                      <div
                                        style={{
                                          marginTop: 8,
                                          fontSize: 14,
                                          color: "#374151",
                                          whiteSpace: "pre-wrap",
                                        }}
                                      >
                                        {studentScore.comment}
                                      </div>
                                    ) : null}
                                  </div>

                                  <div
                                    style={{
                                      border: "1px solid #e5e7eb",
                                      borderRadius: 10,
                                      padding: 12,
                                    }}
                                  >
                                    <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 6 }}>
                                      Jouw docentscore
                                    </div>

                                    <div
                                      style={{
                                        fontSize: 16,
                                        fontWeight: 700,
                                        color: colorForValue(rubric, teacherScore?.correctedScore),
                                      }}
                                    >
                                      {teacherScore?.correctedScore != null
                                        ? `${labelForValue(rubric, teacherScore.correctedScore)} (${teacherScore.correctedScore})`
                                        : "—"}
                                    </div>

                                    {teacherScore?.feedback ? (
                                      <div
                                        style={{
                                          marginTop: 8,
                                          fontSize: 14,
                                          color: "#374151",
                                          whiteSpace: "pre-wrap",
                                        }}
                                      >
                                        {teacherScore.feedback}
                                      </div>
                                    ) : null}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}

                    {teacherReview?.feedback ? (
                      <div
                        style={{
                          border: "1px solid #e5e7eb",
                          borderRadius: 12,
                          padding: 14,
                          background: "#fff",
                        }}
                      >
                        <div style={{ fontWeight: 700, marginBottom: 8 }}>Algemene docentfeedback</div>
                        <div style={{ whiteSpace: "pre-wrap", color: "#374151" }}>
                          {teacherReview.feedback}
                        </div>
                      </div>
                    ) : null}
                  </div>
                ) : (
                  <p style={{ margin: 0, color: "#6b7280" }}>
                    Voor dit meetmoment is nog geen assessment aangemaakt of ingevuld.
                  </p>
                )}
              </section>
            );
          })}
        </div>
      </section>
    </main>
  );
}