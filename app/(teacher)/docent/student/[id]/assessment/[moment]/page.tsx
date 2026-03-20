import Link from "next/link";
import { notFound } from "next/navigation";
import { revalidatePath } from "next/cache";
import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getSessionUserId } from "@/lib/auth/session";
import { getRubric } from "@/lib/rubrics";

export const runtime = "nodejs";

type PageProps = {
  params: Promise<{
    id: string;
    moment: string;
  }>;
};

type MomentKey = "M1" | "M2" | "M3";

function fullName(user: {
  voornaam: string;
  tussenvoegsel: string | null;
  achternaam: string;
}) {
  return [user.voornaam, user.tussenvoegsel, user.achternaam]
    .filter(Boolean)
    .join(" ")
    .trim();
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

function scoreOptions(rubric: any) {
  const min = Number(rubric?.scale?.min ?? 0);
  const max = Number(rubric?.scale?.max ?? 10);
  const items: number[] = [];

  for (let i = min; i <= max; i += 1) {
    items.push(i);
  }

  return items;
}

export default async function DocentAssessmentMomentPage({ params }: PageProps) {
  const { id: studentId, moment } = await params;

  if (moment !== "M1" && moment !== "M2" && moment !== "M3") {
    notFound();
  }

  const activeMoment = moment as MomentKey;
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

  const assessment = await prisma.assessment.upsert({
    where: {
      student_rubric_moment: {
        studentId: student.id,
        rubricKey,
        moment: activeMoment,
      },
    },
    update: {},
    create: {
      studentId: student.id,
      rubricKey,
      moment: activeMoment,
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
  });

  const basePath = `/docent/student/${student.id}/assessment/${activeMoment}`;
  const studentName = fullName(student);
  const teacherReview = assessment.teacherReviews[0] ?? null;

  async function saveTeacherScore(formData: FormData) {
    "use server";

    const assessmentId = String(formData.get("assessmentId") ?? "").trim();
    const teacherId = String(formData.get("teacherId") ?? "").trim();
    const themeId = String(formData.get("themeId") ?? "").trim();
    const questionId = String(formData.get("questionId") ?? "").trim();

    const correctedScoreRaw = String(formData.get("correctedScore") ?? "").trim();
    const feedbackRaw = String(formData.get("feedback") ?? "");

    const correctedScore =
      correctedScoreRaw === "" ? null : Number(correctedScoreRaw);

    if (!assessmentId || !teacherId || !themeId || !questionId) {
      return;
    }

    await prisma.teacherScore.upsert({
      where: {
        assessment_teacher_theme_question: {
          assessmentId,
          teacherId,
          themeId,
          questionId,
        },
      },
      create: {
        assessmentId,
        teacherId,
        themeId,
        questionId,
        correctedScore,
        feedback: feedbackRaw.trim() ? feedbackRaw.trim() : null,
      },
      update: {
        correctedScore,
        feedback: feedbackRaw.trim() ? feedbackRaw.trim() : null,
      },
    });

    revalidatePath(basePath);
  }

  async function saveTeacherReview(formData: FormData) {
    "use server";

    const assessmentId = String(formData.get("assessmentId") ?? "").trim();
    const teacherId = String(formData.get("teacherId") ?? "").trim();
    const feedbackRaw = String(formData.get("feedback") ?? "");

    if (!assessmentId || !teacherId) {
      return;
    }

    await prisma.teacherReview.upsert({
      where: {
        assessment_teacher: {
          assessmentId,
          teacherId,
        },
      },
      create: {
        assessmentId,
        teacherId,
        correctedScore: null,
        feedback: feedbackRaw.trim() ? feedbackRaw.trim() : null,
        status: "DRAFT",
        publishedAt: null,
      },
      update: {
        correctedScore: null,
        feedback: feedbackRaw.trim() ? feedbackRaw.trim() : null,
        status: "DRAFT",
        publishedAt: null,
      },
    });

    revalidatePath(basePath);
  }

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
            href={`/docent/student/${student.id}`}
            style={{
              textDecoration: "none",
              color: "#374151",
            }}
          >
            ← Terug naar student
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

          <span style={chipStyle("#f3f4f6", "#111827", "1px solid #e5e7eb")}>
            Meetmoment: {activeMoment}
          </span>

          {assessment.submittedAt ? (
            <span style={chipStyle("#111827", "#ffffff", "1px solid #111827")}>
              Student heeft ingeleverd
            </span>
          ) : (
            <span style={chipStyle("#fff7ed", "#9a3412", "1px solid #fdba74")}>
              Assessment staat open
            </span>
          )}

          {teacherReview?.status === "PUBLISHED" ? (
            <span style={chipStyle("#111827", "#ffffff", "1px solid #111827")}>
              Docentreview gepubliceerd
            </span>
          ) : teacherReview ? (
            <span style={chipStyle("#fff7e6", "#8a4b00", "1px solid #ffd8a8")}>
              Docentreview concept
            </span>
          ) : (
            <span style={chipStyle("#f3f4f6", "#6b7280", "1px solid #e5e7eb")}>
              Nog geen docentreview
            </span>
          )}
        </div>
      </div>

      <section
        style={{
          border: "1px solid #e5e7eb",
          borderRadius: 16,
          background: "#fff",
          padding: 18,
          marginBottom: 20,
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
          <h2 style={{ fontSize: 22, margin: 0 }}>Professioneel Ontwikkelprofiel</h2>

          <span style={chipStyle("#f3f4f6", "#111827", "1px solid #e5e7eb")}>
            Rubric: {rubric?.title ?? rubricKey}
          </span>
        </div>

        <div
          style={{
            display: "flex",
            gap: 10,
            flexWrap: "wrap",
            marginBottom: 18,
          }}
        >
          {(["M1", "M2", "M3"] as MomentKey[]).map((m) => {
            const active = m === activeMoment;

            return (
              <Link
                key={m}
                href={`/docent/student/${student.id}/assessment/${m}`}
                style={{
                  display: "inline-block",
                  padding: "10px 14px",
                  borderRadius: 12,
                  textDecoration: "none",
                  border: active ? "1px solid #111827" : "1px solid #e5e7eb",
                  background: active ? "#111827" : "#ffffff",
                  color: active ? "#ffffff" : "#111827",
                  fontWeight: 700,
                }}
              >
                {m}
              </Link>
            );
          })}
        </div>

        <div style={{ display: "grid", gap: 16 }}>
          {rubric?.themes?.map((theme: any) => (
            <section
              key={theme.id}
              style={{
                border: "1px solid #e5e7eb",
                borderRadius: 16,
                overflow: "hidden",
                background: "#fcfcfd",
              }}
            >
              <div
                style={{
                  padding: "14px 16px",
                  borderBottom: "1px solid #e5e7eb",
                  background: "#f9fafb",
                  fontWeight: 700,
                  fontSize: 17,
                }}
              >
                {theme.title}
              </div>

              <div style={{ display: "grid" }}>
                {theme.questions.map((question: any, index: number) => {
                  const key = `${theme.id}__${question.id}`;

                  const studentScore =
                    assessment.scores.find(
                      (row) => row.themeId === theme.id && row.questionId === question.id
                    ) ?? null;

                  const teacherScore =
                    assessment.teacherScores.find(
                      (row) => row.themeId === theme.id && row.questionId === question.id
                    ) ?? null;

                  return (
                    <div
                      key={key}
                      style={{
                        padding: 16,
                        borderTop: index === 0 ? "none" : "1px solid #eef2f7",
                      }}
                    >
                      <div
                        style={{
                          fontWeight: 700,
                          color: "#111827",
                          marginBottom: 12,
                          fontSize: 16,
                        }}
                      >
                        {question.text}
                      </div>

                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
                          gap: 14,
                        }}
                      >
                        <div
                          style={{
                            border: "1px solid #e5e7eb",
                            borderRadius: 12,
                            padding: 14,
                            background: "#ffffff",
                          }}
                        >
                          <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 6 }}>
                            Studentscore
                          </div>

                          <div
                            style={{
                              fontSize: 18,
                              fontWeight: 700,
                              color: colorForValue(rubric, studentScore?.score),
                            }}
                          >
                            {studentScore
                              ? `${labelForValue(rubric, studentScore.score)} (${studentScore.score})`
                              : "Nog niet ingevuld"}
                          </div>

                          {studentScore?.comment ? (
                            <div
                              style={{
                                marginTop: 10,
                                padding: 10,
                                borderRadius: 10,
                                background: "#f9fafb",
                                fontSize: 14,
                                color: "#374151",
                                whiteSpace: "pre-wrap",
                              }}
                            >
                              {studentScore.comment}
                            </div>
                          ) : (
                            <div
                              style={{
                                marginTop: 10,
                                fontSize: 13,
                                color: "#9ca3af",
                              }}
                            >
                              Geen studentfeedback
                            </div>
                          )}
                        </div>

                        <form
                          action={saveTeacherScore}
                          style={{
                            border: "1px solid #e5e7eb",
                            borderRadius: 12,
                            padding: 14,
                            background: "#ffffff",
                          }}
                        >
                          <input type="hidden" name="assessmentId" value={assessment.id} />
                          <input type="hidden" name="teacherId" value={me.id} />
                          <input type="hidden" name="themeId" value={theme.id} />
                          <input type="hidden" name="questionId" value={question.id} />

                          <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 8 }}>
                            Jouw docentscore
                          </div>

                          <div
                            style={{
                              display: "grid",
                              gridTemplateColumns: "repeat(auto-fit, minmax(64px, 1fr))",
                              gap: 8,
                              marginBottom: 12,
                            }}
                          >
                            {scoreOptions(rubric).map((option) => {
                              const selected = teacherScore?.correctedScore === option;

                              return (
                                <label
                                  key={option}
                                  style={{
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    gap: 6,
                                    minHeight: 44,
                                    borderRadius: 10,
                                    border: selected ? "1px solid #111827" : "1px solid #d1d5db",
                                    background: selected ? "#111827" : "#ffffff",
                                    color: selected ? "#ffffff" : "#111827",
                                    cursor: "pointer",
                                    fontWeight: 700,
                                  }}
                                >
                                  <input
                                    type="radio"
                                    name="correctedScore"
                                    value={option}
                                    defaultChecked={selected}
                                    style={{ display: "none" }}
                                  />
                                  {option}
                                </label>
                              );
                            })}
                          </div>

                          <div
                            style={{
                              fontSize: 13,
                              color: teacherScore?.correctedScore != null
                                ? colorForValue(rubric, teacherScore.correctedScore)
                                : "#9ca3af",
                              fontWeight: 700,
                              marginBottom: 10,
                            }}
                          >
                            {teacherScore?.correctedScore != null
                              ? `${labelForValue(rubric, teacherScore.correctedScore)} (${teacherScore.correctedScore})`
                              : "Nog geen docentscore gekozen"}
                          </div>

                          <textarea
                            name="feedback"
                            defaultValue={teacherScore?.feedback ?? ""}
                            placeholder="Feedback van docent bij deze vraag"
                            style={{
                              width: "100%",
                              minHeight: 110,
                              border: "1px solid #d1d5db",
                              borderRadius: 10,
                              padding: 12,
                              fontSize: 14,
                              resize: "vertical",
                              fontFamily: "inherit",
                              marginBottom: 10,
                            }}
                          />

                          <button
                            type="submit"
                            style={{
                              display: "inline-block",
                              padding: "10px 14px",
                              borderRadius: 10,
                              border: "1px solid #111827",
                              background: "#111827",
                              color: "#ffffff",
                              fontWeight: 700,
                              cursor: "pointer",
                            }}
                          >
                            Score opslaan
                          </button>
                        </form>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      </section>

      <section
        style={{
          border: "1px solid #e5e7eb",
          borderRadius: 16,
          background: "#fff",
          padding: 18,
        }}
      >
        <h2 style={{ fontSize: 18, margin: "0 0 12px 0" }}>Algemene docentfeedback</h2>

        <form action={saveTeacherReview}>
          <input type="hidden" name="assessmentId" value={assessment.id} />
          <input type="hidden" name="teacherId" value={me.id} />

          <textarea
            name="feedback"
            defaultValue={teacherReview?.feedback ?? ""}
            placeholder="Algemene feedback voor dit meetmoment"
            style={{
              width: "100%",
              minHeight: 160,
              border: "1px solid #d1d5db",
              borderRadius: 12,
              padding: 12,
              fontSize: 14,
              resize: "vertical",
              fontFamily: "inherit",
              marginBottom: 12,
            }}
          />

          <div
            style={{
              display: "flex",
              gap: 10,
              flexWrap: "wrap",
              alignItems: "center",
            }}
          >
            <button
              type="submit"
              style={{
                display: "inline-block",
                padding: "10px 14px",
                borderRadius: 10,
                border: "1px solid #111827",
                background: "#111827",
                color: "#ffffff",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              Feedback opslaan als concept
            </button>

            <span style={{ color: "#6b7280", fontSize: 13 }}>
              Publiceren koppelen we hierna aan de bestaande publish-route.
            </span>
          </div>
        </form>
      </section>
    </main>
  );
}