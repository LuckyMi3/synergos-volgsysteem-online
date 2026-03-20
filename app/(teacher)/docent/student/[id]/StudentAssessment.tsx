"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { getRubric } from "@/lib/rubrics";

type Moment = "M1" | "M2" | "M3";

type TeacherLite = {
  id?: string;
  voornaam?: string | null;
  tussenvoegsel?: string | null;
  achternaam?: string | null;
  email?: string | null;
};

type BundleScore = {
  id: string;
  themeId: string;
  questionId: string;
  score: number;
  comment: string | null;
  updatedAt: string;
};

type BundleTeacherScore = {
  id: string;
  themeId: string;
  questionId: string;
  correctedScore: number | null;
  feedback: string | null;
  updatedAt: string;
};

type BundleTeacherReview = {
  id: string;
  status: "DRAFT" | "PUBLISHED";
  feedback: string | null;
  correctedScore: number | null;
  publishedAt: string | null;
  updatedAt: string;
};

type BundleAssessment = {
  moment: Moment;
  assessmentId: string;
  studentId: string;
  rubricKey: string;
  scores: BundleScore[];
  teacherScores: BundleTeacherScore[];
  teacherReview: BundleTeacherReview | null;
};

type MeResponse = {
  id?: string;
  role?: string;
};

function clamp(n: number, min: number, max: number) {
  if (n < min) return min;
  if (n > max) return max;
  return n;
}

function labelForValue(rubric: any, value: number) {
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
    if ((labels as any)[v] != null) return String((labels as any)[v]);

    let chosen = keys[0];
    for (const k of keys) {
      if (k <= v) chosen = k;
      else break;
    }
    return String((labels as any)[chosen] ?? v);
  }

  return String(v);
}

function colorForValue(rubric: any, value: number) {
  const min = Number(rubric?.scale?.min ?? 0);
  const max = Number(rubric?.scale?.max ?? 10);
  const v = clamp(value, min, max);
  const ratio = max === min ? 1 : (v - min) / (max - min);

  if (ratio <= 0.3) return "#c0392b";
  if (ratio <= 0.7) return "#e67e22";
  return "#27ae60";
}

function defaultValueForRubric(rubric: any) {
  const min = Number(rubric?.scale?.min ?? 0);
  const max = Number(rubric?.scale?.max ?? 10);
  return Math.round((min + max) / 2);
}

function rowKey(themeId: string, questionId: string) {
  return `${themeId}__${questionId}`;
}

export default function StudentAssessment({
  studentId,
  rubricKey,
}: {
  studentId: string;
  rubricKey: string;
}) {
  const moments: Moment[] = useMemo(() => ["M1", "M2", "M3"], []);
  const rubric = useMemo(() => getRubric(rubricKey), [rubricKey]);

  const [moment, setMoment] = useState<Moment>("M1");
  const [teacherId, setTeacherId] = useState<string>("");
  const [assessmentId, setAssessmentId] = useState<string>("");
  const [reviewStatus, setReviewStatus] = useState<"DRAFT" | "PUBLISHED" | "NONE">("NONE");
  const [generalFeedback, setGeneralFeedback] = useState("");
  const [studentScores, setStudentScores] = useState<Record<string, BundleScore>>({});
  const [teacherScores, setTeacherScores] = useState<
    Record<string, { correctedScore: number | null; feedback: string }>
  >({});
  const [openTheme, setOpenTheme] = useState<string | null>(null);
  const [status, setStatus] = useState<string>("Laden...");
  const [loading, setLoading] = useState<boolean>(true);

  const questionTimers = useRef<Record<string, ReturnType<typeof setTimeout> | null>>({});
  const reviewTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const min = Number(rubric?.scale?.min ?? 0);
  const max = Number(rubric?.scale?.max ?? 10);
  const mid = defaultValueForRubric(rubric);

  async function fetchMe() {
    const res = await fetch("/api/me");
    const me = (await res.json().catch(() => ({}))) as MeResponse;
    return me?.id ?? "";
  }

  async function ensureAssessment(activeMoment: Moment) {
    const res = await fetch("/api/assessments/ensure", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        studentId,
        rubricKey,
        moment: activeMoment,
      }),
    });

    const json = await res.json().catch(() => ({}));

    if (!res.ok || !json?.id) {
      throw new Error(json?.error ?? "Assessment ensure faalde.");
    }

    return json.id as string;
  }

  async function loadBundle(activeTeacherId: string, activeMoment: Moment) {
    const query = new URLSearchParams({
      studentId,
      rubricKey,
      teacherId: activeTeacherId,
      moments: activeMoment,
    });

    const res = await fetch(`/api/assessments/bundle?${query.toString()}`);
    const json = await res.json().catch(() => ({}));

    if (!res.ok) {
      throw new Error(json?.error ?? "Bundle laden faalde.");
    }

    const assessment = (json?.assessments?.[0] ?? null) as BundleAssessment | null;
    return assessment;
  }

  async function bootstrap(activeMoment: Moment) {
    try {
      setLoading(true);
      setStatus("Assessment laden...");

      const meId = teacherId || (await fetchMe());
      if (!meId) {
        setStatus("Docent kon niet worden bepaald.");
        setLoading(false);
        return;
      }

      setTeacherId(meId);

      const ensuredId = await ensureAssessment(activeMoment);
      const bundle = await loadBundle(meId, activeMoment);

      const effectiveAssessmentId = bundle?.assessmentId ?? ensuredId;
      setAssessmentId(effectiveAssessmentId);

      const nextStudentScores: Record<string, BundleScore> = {};
      for (const row of bundle?.scores ?? []) {
        nextStudentScores[rowKey(row.themeId, row.questionId)] = row;
      }
      setStudentScores(nextStudentScores);

      const nextTeacherScores: Record<string, { correctedScore: number | null; feedback: string }> = {};
      for (const row of bundle?.teacherScores ?? []) {
        nextTeacherScores[rowKey(row.themeId, row.questionId)] = {
          correctedScore: row.correctedScore,
          feedback: row.feedback ?? "",
        };
      }

      for (const theme of rubric?.themes ?? []) {
        for (const question of theme.questions ?? []) {
          const key = rowKey(theme.id, question.id);
          if (!nextTeacherScores[key]) {
            nextTeacherScores[key] = {
              correctedScore: nextStudentScores[key]?.score ?? mid,
              feedback: "",
            };
          }
        }
      }

      setTeacherScores(nextTeacherScores);
      setGeneralFeedback(bundle?.teacherReview?.feedback ?? "");
      setReviewStatus(bundle?.teacherReview?.status ?? "NONE");
      setStatus(`Assessment geladen voor ${activeMoment}.`);
      setLoading(false);
    } catch (error: any) {
      setStatus(error?.message ?? "Laden faalde.");
      setLoading(false);
    }
  }

  useEffect(() => {
    bootstrap(moment);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [moment, studentId, rubricKey]);

  async function saveQuestion(themeId: string, questionId: string) {
    if (!assessmentId || !teacherId) return;

    const key = rowKey(themeId, questionId);
    const row = teacherScores[key];

    await fetch("/api/teacher-scores", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        assessmentId,
        teacherId,
        themeId,
        questionId,
        correctedScore: row?.correctedScore ?? null,
        feedback: row?.feedback?.trim() ? row.feedback.trim() : null,
      }),
    });

    setStatus(`Docentscore opgeslagen (${moment}).`);
  }

  function scheduleQuestionSave(themeId: string, questionId: string) {
    const key = rowKey(themeId, questionId);

    if (questionTimers.current[key]) {
      clearTimeout(questionTimers.current[key]!);
    }

    questionTimers.current[key] = setTimeout(() => {
      saveQuestion(themeId, questionId);
    }, 600);
  }

  async function saveGeneralFeedback(value: string) {
    if (!assessmentId || !teacherId) return;

    const res = await fetch("/api/teacher-reviews", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        assessmentId,
        teacherId,
        feedback: value.trim() ? value.trim() : null,
        correctedScore: null,
      }),
    });

    if (res.ok) {
      setReviewStatus("DRAFT");
      setStatus(`Algemene feedback opgeslagen (${moment}).`);
    } else {
      setStatus("Algemene feedback opslaan faalde.");
    }
  }

  function scheduleGeneralFeedbackSave(value: string) {
    if (reviewTimer.current) {
      clearTimeout(reviewTimer.current);
    }

    reviewTimer.current = setTimeout(() => {
      saveGeneralFeedback(value);
    }, 700);
  }

  async function publishReview() {
    if (!assessmentId || !teacherId) return;

    try {
      setStatus("Publiceren...");
      const res = await fetch("/api/teacher-reviews/publish", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          assessmentId,
          teacherId,
        }),
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok) {
        setStatus(json?.error ?? "Publiceren faalde.");
        return;
      }

      setReviewStatus("PUBLISHED");
      setStatus(`Gepubliceerd (${moment}).`);
    } catch {
      setStatus("Publiceren faalde.");
    }
  }

  const minLabel = labelForValue(rubric, min);
  const midLabel = labelForValue(rubric, mid);
  const maxLabel = labelForValue(rubric, max);

  return (
    <section className="bg-white border rounded-xl p-6 shadow-sm space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <div className="font-semibold text-lg">Professioneel Ontwikkelprofiel</div>

        <div className="ml-auto flex gap-2">
          {moments.map((m) => (
            <button
              key={m}
              onClick={() => setMoment(m)}
              className={`px-4 py-2 rounded-lg border text-sm font-medium ${
                moment === m
                  ? "bg-black text-white border-black"
                  : "bg-white text-black border-gray-300"
              }`}
            >
              {m}
            </button>
          ))}
        </div>
      </div>

      <div className="text-sm text-gray-500">
        {loading ? "Laden..." : status}
      </div>

      <div className="border rounded-xl p-4 bg-gray-50 space-y-3">
        <div className="flex items-center gap-3">
          <div className="font-semibold">Algemene feedback</div>

          <div className="ml-auto text-xs px-2 py-1 rounded-full border bg-white">
            {reviewStatus === "PUBLISHED"
              ? "Gepubliceerd"
              : reviewStatus === "DRAFT"
              ? "Concept"
              : "Nog niet gepubliceerd"}
          </div>
        </div>

        <textarea
          value={generalFeedback}
          onChange={(e) => {
            const value = e.target.value;
            setGeneralFeedback(value);
            scheduleGeneralFeedbackSave(value);
          }}
          className="w-full min-h-[140px] rounded-lg border border-gray-300 p-3 bg-white"
          placeholder="Algemene feedback van docent voor dit meetmoment..."
        />

        <div className="flex justify-end">
          <button
            onClick={publishReview}
            disabled={!assessmentId || !teacherId}
            className="px-4 py-2 rounded-lg bg-green-600 text-white disabled:opacity-50"
          >
            Publiceren
          </button>
        </div>
      </div>

      <div className="space-y-4">
        {(rubric?.themes ?? []).map((theme: any) => (
          <div
            key={theme.id}
            className="border rounded-xl overflow-hidden"
          >
            <button
              type="button"
              onClick={() => setOpenTheme(openTheme === theme.id ? null : theme.id)}
              className="w-full text-left px-4 py-4 bg-gray-50 font-semibold"
            >
              {theme.title}
            </button>

            {openTheme === theme.id && (
              <div className="p-4 space-y-6">
                {theme.questions.map((q: any) => {
                  const key = rowKey(theme.id, q.id);
                  const studentRow = studentScores[key] ?? null;
                  const teacherRow = teacherScores[key] ?? {
                    correctedScore: studentRow?.score ?? mid,
                    feedback: "",
                  };

                  const studentValue = studentRow?.score ?? mid;
                  const teacherValue = teacherRow.correctedScore ?? studentValue;

                  return (
                    <div
                      key={key}
                      className="border-b last:border-b-0 pb-6 last:pb-0 space-y-4"
                    >
                      <div className="font-medium">{q.text}</div>

                      <div className="grid md:grid-cols-2 gap-4">
                        <div className="rounded-lg border p-4 bg-gray-50">
                          <div className="text-sm text-gray-500 mb-2">Studentscore</div>

                          <div
                            className="font-semibold mb-2"
                            style={{ color: colorForValue(rubric, studentValue) }}
                          >
                            {labelForValue(rubric, studentValue)} ({studentValue})
                          </div>

                          <input
                            type="range"
                            min={min}
                            max={max}
                            value={studentValue}
                            disabled
                            className="w-full opacity-70"
                          />

                          <div className="flex justify-between text-xs mt-2">
                            <span style={{ color: "#c0392b" }}>{minLabel}</span>
                            <span style={{ color: "#e67e22" }}>{midLabel}</span>
                            <span style={{ color: "#27ae60" }}>{maxLabel}</span>
                          </div>

                          {studentRow?.comment ? (
                            <div className="mt-3 text-sm text-gray-700 whitespace-pre-wrap">
                              {studentRow.comment}
                            </div>
                          ) : null}
                        </div>

                        <div className="rounded-lg border p-4 bg-white">
                          <div className="text-sm text-gray-500 mb-2">Docentcorrectie</div>

                          <div
                            className="font-semibold mb-2"
                            style={{ color: colorForValue(rubric, teacherValue) }}
                          >
                            {labelForValue(rubric, teacherValue)} ({teacherValue})
                          </div>

                          <input
                            type="range"
                            min={min}
                            max={max}
                            value={teacherValue}
                            onChange={(e) => {
                              const newValue = Number(e.target.value);
                              setTeacherScores((prev) => ({
                                ...prev,
                                [key]: {
                                  correctedScore: newValue,
                                  feedback: prev[key]?.feedback ?? "",
                                },
                              }));

                              setStatus(`Opslaan docentscore (${moment})...`);

                              fetch("/api/teacher-scores", {
                                method: "POST",
                                headers: {
                                  "Content-Type": "application/json",
                                },
                                body: JSON.stringify({
                                  assessmentId,
                                  teacherId,
                                  themeId: theme.id,
                                  questionId: q.id,
                                  correctedScore: newValue,
                                  feedback: teacherScores[key]?.feedback?.trim()
                                    ? teacherScores[key].feedback.trim()
                                    : null,
                                }),
                              })
                                .then((res) => {
                                  if (res.ok) {
                                    setStatus(`Docentscore opgeslagen (${moment}).`);
                                  } else {
                                    setStatus("Docentscore opslaan faalde.");
                                  }
                                })
                                .catch(() => {
                                  setStatus("Docentscore opslaan faalde.");
                                });
                            }}
                            className="w-full"
                          />

                          <div className="flex justify-between text-xs mt-2">
                            <span style={{ color: "#c0392b" }}>{minLabel}</span>
                            <span style={{ color: "#e67e22" }}>{midLabel}</span>
                            <span style={{ color: "#27ae60" }}>{maxLabel}</span>
                          </div>

                          <textarea
                            value={teacherRow.feedback}
                            onChange={(e) => {
                              const value = e.target.value;
                              setTeacherScores((prev) => ({
                                ...prev,
                                [key]: {
                                  correctedScore: prev[key]?.correctedScore ?? studentValue,
                                  feedback: value,
                                },
                              }));
                              setStatus(`Opslaan vraagfeedback (${moment})...`);
                              scheduleQuestionSave(theme.id, q.id);
                            }}
                            className="w-full min-h-[100px] rounded-lg border border-gray-300 p-3 mt-4"
                            placeholder="Extra feedback van docent bij deze vraag..."
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}