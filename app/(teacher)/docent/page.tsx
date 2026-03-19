"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { getRubric } from "@/lib/rubrics";

type Moment = "M1" | "M2" | "M3";

type Cohort = {
  id: string;
  naam: string;
  traject?: string | null;
  uitvoeringId: string;
  createdAt: string;
};

type StudentOption = { id: string; name: string };

type ScoreRow = {
  id: string;
  assessmentId: string;
  themeId: string;
  questionId: string;
  score: number;
  comment: string | null;
  updatedAt: string;
};

type ReviewStatus = "DRAFT" | "PUBLISHED";

type TeacherReview = {
  id: string;
  assessmentId: string;
  teacherId: string;
  correctedScore: number | null;
  feedback: string | null;
  status: ReviewStatus;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

type TeacherScoreRow = {
  id: string;
  assessmentId: string;
  teacherId: string;
  themeId: string;
  questionId: string;
  correctedScore: number | null;
  feedback: string | null;
  createdAt: string;
  updatedAt: string;
};

type SaveState = "idle" | "saving" | "saved" | "error";

type MeUser = {
  id: string;
  role: string;
  name?: string;
  voornaam?: string;
  tussenvoegsel?: string | null;
  achternaam?: string;
  email?: string | null;
};

function badgeStyle(status: ReviewStatus | "NONE") {
  if (status === "PUBLISHED")
    return { background: "#111", color: "#fff", border: "1px solid #111" };
  if (status === "DRAFT")
    return {
      background: "#fff7e6",
      color: "#8a4b00",
      border: "1px solid #ffd8a8",
    };
  return { background: "#f3f4f6", color: "#374151", border: "1px solid #e5e7eb" };
}

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

function k(themeId: string, questionId: string) {
  return `${themeId}__${questionId}`;
}

function displayNameFromMe(me: MeUser | null) {
  if (!me) return "—";
  if (me.name && me.name.trim()) return me.name.trim();
  const parts = [me.voornaam, me.tussenvoegsel, me.achternaam].filter(Boolean);
  return parts.join(" ").trim() || "—";
}

function normalizeStudentOptions(json: any): StudentOption[] {
  // support: array OR { students: array }
  const raw: any[] = Array.isArray(json)
    ? json
    : Array.isArray(json?.students)
    ? json.students
    : [];

  const normalized = raw
    .map((x: any) => {
      // already { id, name }
      if (x?.id && typeof x?.name === "string") {
        return { id: String(x.id), name: x.name };
      }

      // { id, voornaam, tussenvoegsel?, achternaam }
      if (x?.id && (x?.voornaam || x?.achternaam)) {
        const name = [x.voornaam, x.tussenvoegsel, x.achternaam]
          .filter(Boolean)
          .join(" ")
          .trim();
        return { id: String(x.id), name: name || "—" };
      }

      // enrollment-ish: { user: { ... } }
      const u = x?.user;
      if (u?.id) {
        const name = [u.voornaam, u.tussenvoegsel, u.achternaam]
          .filter(Boolean)
          .join(" ")
          .trim();
        return { id: String(u.id), name: name || u.email || String(u.id) };
      }

      // fallback
      if (x?.id) return { id: String(x.id), name: x.email || String(x.id) };
      return null;
    })
    .filter(Boolean) as StudentOption[];

  return normalized;
}

export default function DocentPage() {
  const moments: Moment[] = useMemo(() => ["M1", "M2", "M3"], []);
  const [moment, setMoment] = useState<Moment>("M1");

  // ✅ effectieve user (impersonated of later real login)
  const [me, setMe] = useState<MeUser | null>(null);
  const teacherId = me?.id || ""; // als leeg: nog niet geladen

  // cohorts for this teacher
  const [cohorts, setCohorts] = useState<Cohort[]>([]);
  const [selectedCohortId, setSelectedCohortId] = useState<string>("");

  // students for selected cohort
  const [students, setStudents] = useState<StudentOption[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState<string>("");

  const [assessmentId, setAssessmentId] = useState<string | null>(null);
  const [scoreMap, setScoreMap] = useState<Record<string, number>>({});
  const [status, setStatus] = useState<string | null>(null);

  // TeacherReview = publish gate + optional overall feedback
  const [review, setReview] = useState<TeacherReview | null>(null);
  const [overallFeedback, setOverallFeedback] = useState<string>("");
  const [reviewMsg, setReviewMsg] = useState<string>("");
  const [busy, setBusy] = useState<boolean>(false);

  // ✅ Teacher scores per vraag
  const [teacherScoreMap, setTeacherScoreMap] = useState<
    Record<string, { correctedScore: number | null; feedback: string }>
  >({});
  const [rowSaveState, setRowSaveState] = useState<Record<string, SaveState>>({});
  const [openRow, setOpenRow] = useState<Record<string, boolean>>({});

  // debounce timers per row
  const saveTimersRef = useRef<Record<string, any>>({});

  const selectedStudent = students.find((s) => s.id === selectedStudentId) || null;
  const selectedCohort = cohorts.find((c) => c.id === selectedCohortId) || null;

  // ✅ rubricKey volgt gekozen cohort
  const rubricKey = (selectedCohort?.traject || "1vo").toLowerCase().trim();
  const rubric = useMemo(() => getRubric(rubricKey), [rubricKey]);

  function setRowState(key: string, state: SaveState) {
    setRowSaveState((prev) => ({ ...prev, [key]: state }));
  }

  function toggleRow(key: string) {
    setOpenRow((prev) => ({ ...prev, [key]: !(prev[key] ?? false) }));
  }

  // ✅ load effective user once
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const res = await fetch("/api/me");
        const data = await res.json().catch(() => ({}));
        if (cancelled) return;

        if (data?.ok && data?.user?.id) {
          setMe(data.user as MeUser);
        } else {
          setStatus("Geen ingelogde/impersonated user gevonden.");
        }
      } catch {
        if (!cancelled) setStatus("User laden faalde (netwerk/exception).");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  async function loadTeacherReview(forAssessmentId: string) {
    if (!teacherId) {
      setReview(null);
      setOverallFeedback("");
      setReviewMsg("teacherId ontbreekt.");
      return;
    }

    setReviewMsg("");

    // ✅ teacherId meegeven (multi-docent teacherReview)
    const res = await fetch(
      `/api/teacher-reviews?assessmentId=${encodeURIComponent(
        forAssessmentId
      )}&teacherId=${encodeURIComponent(teacherId)}`
    );

    if (!res.ok) {
      setReview(null);
      setOverallFeedback("");
      setReviewMsg(`Review laden faalde (${res.status}).`);
      return;
    }

    const data = (await res.json()) as TeacherReview | null;
    setReview(data);
    setOverallFeedback(data?.feedback ?? "");
    setReviewMsg(data ? `Review geladen (${data.status}).` : "Nog geen review (maak draft).");
  }

  async function loadTeacherScores(forAssessmentId: string) {
    if (!teacherId) return;

    setTeacherScoreMap({});
    setRowSaveState({});

    try {
      const res = await fetch(
        `/api/teacher-scores?assessmentId=${encodeURIComponent(
          forAssessmentId
        )}&teacherId=${encodeURIComponent(teacherId)}`
      );

      if (!res.ok) return;

      const rows = (await res.json()) as TeacherScoreRow[];

      const next: Record<string, { correctedScore: number | null; feedback: string }> = {};
      for (const r of rows) {
        next[k(r.themeId, r.questionId)] = {
          correctedScore: r.correctedScore ?? null,
          feedback: r.feedback ?? "",
        };
      }
      setTeacherScoreMap(next);
    } catch {
      // ignore
    }
  }

  function scheduleSaveTeacherScore(args: {
    themeId: string;
    questionId: string;
    correctedScore: number | null;
    feedback: string;
  }) {
    if (!assessmentId || !teacherId) return;

    const rowKey = k(args.themeId, args.questionId);

    setTeacherScoreMap((prev) => ({
      ...prev,
      [rowKey]: { correctedScore: args.correctedScore, feedback: args.feedback },
    }));

    setRowState(rowKey, "saving");

    if (saveTimersRef.current[rowKey]) clearTimeout(saveTimersRef.current[rowKey]);

    saveTimersRef.current[rowKey] = setTimeout(async () => {
      try {
        const res = await fetch("/api/teacher-scores", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            assessmentId,
            teacherId,
            themeId: args.themeId,
            questionId: args.questionId,
            correctedScore: args.correctedScore,
            feedback: args.feedback.trim() ? args.feedback : null,
          }),
        });

        if (!res.ok) {
          setRowState(rowKey, "error");
          return;
        }

        setRowState(rowKey, "saved");
        setTimeout(() => {
          setRowSaveState((prev) =>
            prev[rowKey] === "saved" ? { ...prev, [rowKey]: "idle" } : prev
          );
        }, 900);
      } catch {
        setRowState(rowKey, "error");
      }
    }, 300);
  }

  // 1) load cohorts for this teacher
  useEffect(() => {
    let cancelled = false;

    async function loadCohorts() {
      if (!teacherId) return;

      setStatus("Cohorts laden...");
      try {
        const res = await fetch(`/api/teachers/${encodeURIComponent(teacherId)}/cohorts`);
        if (!res.ok) {
          setStatus(`Cohorts laden faalde (${res.status}).`);
          return;
        }

        const json = await res.json();
        const data: Cohort[] = Array.isArray(json?.cohorts) ? json.cohorts : [];
        if (cancelled) return;

        setCohorts(data);
        setSelectedCohortId((prev) => (prev ? prev : data[0]?.id ?? ""));
        setStatus(null);
      } catch {
        if (!cancelled) setStatus("Cohorts laden faalde (netwerk/exception).");
      }
    }

    loadCohorts();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teacherId]);

  // 2) load students for selected cohort
  useEffect(() => {
    let cancelled = false;

    async function loadStudentsForCohort() {
      if (!teacherId) return;

      setStudents([]);
      setSelectedStudentId("");
      if (!selectedCohortId) return;

      setStatus("Studenten laden voor cohort...");
      try {
        const res = await fetch(
          `/api/teachers/${encodeURIComponent(teacherId)}/students?cohortId=${encodeURIComponent(
            selectedCohortId
          )}`
        );

        const json = await res.json().catch(() => ({}));

        if (!res.ok) {
          setStatus(`Studenten laden faalde (${res.status}): ${json?.error ?? "onbekend"}`);
          return;
        }

        const normalized = normalizeStudentOptions(json);
        if (cancelled) return;

        setStudents(normalized);
        if (normalized.length > 0) setSelectedStudentId(normalized[0].id);
        setStatus(null);
      } catch {
        if (!cancelled) setStatus("Studenten laden faalde (netwerk/exception).");
      }
    }

    loadStudentsForCohort();
    return () => {
      cancelled = true;
    };
  }, [selectedCohortId, teacherId]);

  // 3) Ensure assessment + load scores + load review + load teacher scores
  useEffect(() => {
    let cancelled = false;

    async function ensureAndLoadAll() {
      setAssessmentId(null);
      setScoreMap({});
      setReview(null);
      setOverallFeedback("");
      setReviewMsg("");
      setTeacherScoreMap({});
      setRowSaveState({});

      if (!teacherId) {
        setStatus("Docent laden...");
        return;
      }

      if (!selectedStudentId) {
        setStatus(selectedCohortId ? "Kies een student." : "Kies een cohort.");
        return;
      }

      setStatus("Assessment ophalen + scores laden...");

      try {
        const ensureRes = await fetch("/api/assessments/ensure", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            studentId: selectedStudentId,
            moment,
            rubricKey, // ✅ dynamisch per cohort
          }),
        });

        if (!ensureRes.ok) {
          setStatus(`Assessment ensure faalde (${ensureRes.status}).`);
          return;
        }

        const ensured = await ensureRes.json();
        const ensuredId = ensured?.id as string | undefined;

        if (!ensuredId) {
          setStatus("Assessment ensure gaf geen id terug.");
          return;
        }

        if (cancelled) return;
        setAssessmentId(ensuredId);

        const scoresRes = await fetch(`/api/scores?assessmentId=${encodeURIComponent(ensuredId)}`);
        if (!scoresRes.ok) {
          setStatus(`Scores laden faalde (${scoresRes.status}).`);
          return;
        }

        const rows: ScoreRow[] = await scoresRes.json();
        if (cancelled) return;

        const map: Record<string, number> = {};
        for (const r of rows) map[k(r.themeId, r.questionId)] = r.score;
        setScoreMap(map);

        setStatus(null);

        await loadTeacherReview(ensuredId);
        await loadTeacherScores(ensuredId);
      } catch {
        if (!cancelled) setStatus("Ensure/laden faalde (netwerk/exception).");
      }
    }

    ensureAndLoadAll();
    return () => {
      cancelled = true;
    };
  }, [selectedStudentId, moment, selectedCohortId, teacherId, rubricKey]);

  function getStudentScore(themeId: string, questionId: string) {
    return scoreMap[k(themeId, questionId)];
  }

  function getTeacherRow(themeId: string, questionId: string) {
    return teacherScoreMap[k(themeId, questionId)] ?? { correctedScore: null, feedback: "" };
  }

  async function saveDraftGate() {
    if (!assessmentId) {
      setReviewMsg("assessmentId ontbreekt.");
      return;
    }
    if (!teacherId) {
      setReviewMsg("teacherId ontbreekt.");
      return;
    }

    setBusy(true);
    setReviewMsg("Opslaan als draft...");
    try {
      const res = await fetch("/api/teacher-reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assessmentId,
          teacherId,
          correctedScore: null,
          feedback: overallFeedback.trim() ? overallFeedback : null,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setReviewMsg(`Opslaan faalde (${res.status}): ${data?.error ?? "onbekend"}`);
        return;
      }

      setReview(data);
      setReviewMsg("Draft opgeslagen (student ziet dit nog niet).");
    } catch {
      setReviewMsg("Opslaan faalde (netwerk/exception).");
    } finally {
      setBusy(false);
    }
  }

  async function publishGate() {
    if (!assessmentId) {
      setReviewMsg("assessmentId ontbreekt.");
      return;
    }
    if (!teacherId) {
      setReviewMsg("teacherId ontbreekt.");
      return;
    }

    setBusy(true);
    setReviewMsg("Publiceren...");
    try {
      const res = await fetch("/api/teacher-reviews/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assessmentId, teacherId }),
      });

      const data = await res.json();

      if (!res.ok) {
        setReviewMsg(`Publiceren faalde (${res.status}): ${data?.error ?? "onbekend"}`);
        return;
      }

      setReview(data);
      setReviewMsg("Gepubliceerd (student kan dit zien).");
    } catch {
      setReviewMsg("Publiceren faalde (netwerk/exception).");
    } finally {
      setBusy(false);
    }
  }

  function saveBadgeText(state: SaveState | undefined) {
    if (!state || state === "idle") return "";
    if (state === "saving") return "opslaan…";
    if (state === "saved") return "aangepast";
    return "niet opgeslagen";
  }

  function saveBadgeStyle(state: SaveState | undefined) {
    if (!state || state === "idle") return { display: "none" as const };

    if (state === "saving")
      return {
        display: "inline-block",
        padding: "2px 8px",
        borderRadius: 999,
        fontSize: 12,
        border: "1px solid #ddd",
        background: "#fff",
        color: "#666",
        marginLeft: 8,
      };

    if (state === "saved")
      return {
        display: "inline-block",
        padding: "2px 8px",
        borderRadius: 999,
        fontSize: 12,
        border: "1px solid #d1fae5",
        background: "#ecfdf5",
        color: "#065f46",
        marginLeft: 8,
      };

    return {
      display: "inline-block",
      padding: "2px 8px",
      borderRadius: 999,
      fontSize: 12,
      border: "1px solid #fde68a",
      background: "#fffbeb",
      color: "#92400e",
      marginLeft: 8,
    };
  }

  return (
    <main style={{ padding: 32, maxWidth: 900, margin: "0 auto" }}>
      <h1 style={{ fontSize: 24, marginBottom: 16 }}>Volgsysteem docentenfeedback</h1>

      {/* status */}
      <div style={{ marginBottom: 16, fontSize: 12, color: "#666" }}>
        <div>
          <strong>Teacher:</strong> {displayNameFromMe(me)}
        </div>
        <div>
          <strong>Cohort:</strong>{" "}
          {selectedCohort ? `${selectedCohort.naam} (${selectedCohort.id})` : "—"}
        </div>
        <div>
          <strong>Traject/rubricKey:</strong>{" "}
          <span style={{ fontFamily: "monospace" }}>{rubricKey}</span>
        </div>
        <div>
          <strong>Student:</strong>{" "}
          {selectedStudent ? `${selectedStudent.name} (${selectedStudent.id})` : "—"}
        </div>
        <div>
          <strong>Moment:</strong> {moment}
        </div>
        <div>
          <strong>AssessmentId:</strong>{" "}
          <span style={{ fontFamily: "monospace" }}>{assessmentId ?? "—"}</span>
        </div>
        {status ? <div style={{ marginTop: 6 }}>{status}</div> : null}
      </div>

      {/* Cohort selectie */}
      <div style={{ marginBottom: 14 }}>
        <label style={{ marginRight: 8 }}>Cohort:</label>
        <select
          value={selectedCohortId}
          onChange={(e) => setSelectedCohortId(e.target.value)}
          disabled={cohorts.length === 0}
        >
          {cohorts.length === 0 ? (
            <option value="">(geen cohorts)</option>
          ) : (
            cohorts.map((c) => (
              <option key={c.id} value={c.id}>
                {c.naam}
                {c.traject ? ` · ${c.traject}` : ""}
                {c.uitvoeringId ? ` · ${c.uitvoeringId}` : ""}
              </option>
            ))
          )}
        </select>
      </div>

      {/* Student selectie */}
      <div style={{ marginBottom: 20 }}>
        <label style={{ marginRight: 8 }}>Student:</label>
        <select
          value={selectedStudentId}
          onChange={(e) => setSelectedStudentId(e.target.value)}
          disabled={students.length === 0}
        >
          {students.length === 0 ? (
            <option value="">(geen studenten)</option>
          ) : (
            students.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))
          )}
        </select>
      </div>

      {/* Moment selectie */}
      <div style={{ marginBottom: 20 }}>
        {moments.map((m) => (
          <button
            key={m}
            onClick={() => setMoment(m)}
            style={{
              marginRight: 8,
              padding: "6px 12px",
              background: moment === m ? "#111" : "#eee",
              color: moment === m ? "#fff" : "#000",
              border: "none",
              cursor: "pointer",
            }}
          >
            {m}
          </button>
        ))}
      </div>

      {/* TeacherReview gate card */}
      <div
        style={{
          border: "1px solid #ddd",
          borderRadius: 12,
          padding: 16,
          marginBottom: 24,
          background: "#fafafa",
          overflow: "hidden",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
          <div style={{ fontSize: 16, fontWeight: 800 }}>Publicatie (draft/publish)</div>

          <span
            style={{
              padding: "6px 10px",
              borderRadius: 999,
              fontSize: 12,
              fontWeight: 800,
              ...badgeStyle(review?.status ?? "NONE"),
            }}
          >
            {review?.status ?? "GEEN REVIEW"}
          </span>

          {review?.publishedAt ? (
            <span style={{ fontSize: 12, color: "#666" }}>
              publishedAt: {new Date(review.publishedAt).toLocaleString("nl-NL")}
            </span>
          ) : null}

          <span style={{ marginLeft: "auto", fontSize: 12, color: "#666" }}>{reviewMsg}</span>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "260px minmax(0, 1fr)",
            gap: 16,
            alignItems: "start",
          }}
        >
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 12, color: "#666", marginBottom: 6 }}>teacher</div>
            <input
              value={displayNameFromMe(me)}
              readOnly
              style={{
                width: "100%",
                padding: 10,
                border: "1px solid #ddd",
                borderRadius: 10,
                boxSizing: "border-box",
                background: "#f6f6f6",
                color: "#444",
              }}
            />
            <div style={{ fontSize: 12, color: "#666", marginTop: 10 }}>
              Publiceren zet álle per-vraag correcties + feedback zichtbaar voor student.
            </div>
          </div>

          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 12, color: "#666", marginBottom: 6 }}>
              Algemene feedback (optioneel)
            </div>

            <textarea
              value={overallFeedback}
              onChange={(e) => setOverallFeedback(e.target.value)}
              rows={4}
              disabled={!assessmentId || busy}
              style={{
                width: "100%",
                maxWidth: "100%",
                boxSizing: "border-box",
                padding: 12,
                border: "1px solid #ddd",
                borderRadius: 10,
                resize: "vertical",
                background: "#fff",
                display: "block",
              }}
            />

            <div style={{ display: "flex", gap: 10, marginTop: 10, flexWrap: "wrap" }}>
              <button
                onClick={saveDraftGate}
                disabled={!assessmentId || busy}
                style={{
                  padding: "10px 14px",
                  borderRadius: 10,
                  border: "1px solid #ddd",
                  background: "#fff",
                  cursor: !assessmentId || busy ? "not-allowed" : "pointer",
                  fontWeight: 700,
                }}
              >
                Opslaan als draft
              </button>

              <button
                onClick={publishGate}
                disabled={!assessmentId || busy || !review}
                style={{
                  padding: "10px 14px",
                  borderRadius: 10,
                  border: "none",
                  background: "#111",
                  color: "#fff",
                  cursor: !assessmentId || busy || !review ? "not-allowed" : "pointer",
                  fontWeight: 800,
                }}
                title={!review ? "Maak eerst een draft aan" : "Publiceer de review"}
              >
                Publish
              </button>

              <button
                type="button"
                onClick={() => assessmentId && loadTeacherReview(assessmentId)}
                disabled={!assessmentId || busy}
                style={{
                  padding: "10px 14px",
                  borderRadius: 10,
                  border: "1px solid #ddd",
                  background: "#fff",
                  cursor: !assessmentId || busy ? "not-allowed" : "pointer",
                  fontWeight: 700,
                }}
              >
                Ververs
              </button>

              <button
                type="button"
                onClick={() => assessmentId && loadTeacherScores(assessmentId)}
                disabled={!assessmentId || busy}
                style={{
                  padding: "10px 14px",
                  borderRadius: 10,
                  border: "1px solid #ddd",
                  background: "#fff",
                  cursor: !assessmentId || busy ? "not-allowed" : "pointer",
                  fontWeight: 700,
                }}
              >
                Ververs per-vraag
              </button>
            </div>

            <div style={{ fontSize: 12, color: "#666", marginTop: 10 }}>
              Let op: “Opslaan als draft” zorgt dat student niets ziet (ook per-vraag niet).
            </div>
          </div>
        </div>
      </div>

      {/* Per theme cards, per vraag docentcorrectie */}
      {rubric.themes.map((theme: any) => (
        <div
          key={theme.id}
          style={{
            border: "1px solid #ddd",
            borderRadius: 12,
            marginBottom: 16,
            overflow: "hidden",
          }}
        >
          <div style={{ padding: 14, background: "#f5f5f5", fontWeight: 800 }}>
            {theme.title}
          </div>

          <div style={{ padding: 14 }}>
            {theme.questions.map((q: any) => {
              const rowKey = k(theme.id, q.id);
              const sScore = getStudentScore(theme.id, q.id);
              const tRow = getTeacherRow(theme.id, q.id);

              const isOpen = openRow[rowKey] ?? false;
              const saveState = rowSaveState[rowKey];

              const studentScoreText =
                typeof sScore === "number" ? `${labelForValue(rubric, sScore)} (${sScore})` : "—";

              const teacherScoreValue = tRow.correctedScore;
              const teacherScoreText =
                teacherScoreValue === null
                  ? "—"
                  : `${labelForValue(rubric, teacherScoreValue)} (${teacherScoreValue})`;

              const min = Number(rubric?.scale?.min ?? 0);
              const max = Number(rubric?.scale?.max ?? 10);
              const sliderValue = clamp(
                teacherScoreValue ?? defaultValueForRubric(rubric),
                min,
                max
              );

              return (
                <div
                  key={rowKey}
                  style={{
                    padding: "12px 0",
                    borderBottom: "1px solid #eee",
                  }}
                >
                  <div style={{ fontWeight: 700, marginBottom: 6 }}>
                    {q.text ?? q.title ?? q.label ?? q.id}
                    <span style={saveBadgeStyle(saveState)}>{saveBadgeText(saveState)}</span>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    <div
                      style={{
                        padding: 12,
                        border: "1px solid #eee",
                        borderRadius: 12,
                        background: "#fafafa",
                      }}
                    >
                      <div style={{ fontSize: 12, color: "#666", marginBottom: 6 }}>
                        Student score
                      </div>
                      <div style={{ fontSize: 13 }}>
                        <span
                          style={{
                            color: typeof sScore === "number" ? colorForValue(rubric, sScore) : "#666",
                          }}
                        >
                          {studentScoreText}
                        </span>
                      </div>
                    </div>

                    <div
                      style={{
                        padding: 12,
                        border: "1px solid #eee",
                        borderRadius: 12,
                        background: "#fff",
                        overflow: "hidden",
                      }}
                    >
                      <div style={{ fontSize: 12, color: "#666", marginBottom: 6 }}>
                        Docent correctie (per vraag)
                      </div>

                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div
                          style={{
                            fontSize: 13,
                            fontWeight: 700,
                            color:
                              teacherScoreValue === null ? "#666" : colorForValue(rubric, teacherScoreValue),
                          }}
                        >
                          {teacherScoreText}
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            scheduleSaveTeacherScore({
                              themeId: theme.id,
                              questionId: q.id,
                              correctedScore: null,
                              feedback: tRow.feedback ?? "",
                            });
                          }}
                          disabled={!assessmentId || busy}
                          style={{
                            marginLeft: "auto",
                            padding: "6px 10px",
                            borderRadius: 10,
                            border: "1px solid #ddd",
                            background: "#fff",
                            cursor: !assessmentId || busy ? "not-allowed" : "pointer",
                            fontSize: 12,
                            fontWeight: 700,
                          }}
                          title="Maak docentcorrectie leeg voor deze vraag"
                        >
                          Maak leeg
                        </button>

                        <button
                          type="button"
                          onClick={() => toggleRow(rowKey)}
                          style={{
                            padding: "6px 10px",
                            borderRadius: 10,
                            border: "1px solid #ddd",
                            background: "#fff",
                            cursor: "pointer",
                            fontSize: 12,
                            fontWeight: 700,
                          }}
                        >
                          {isOpen ? "▾" : "▸"} Feedback
                        </button>
                      </div>

                      <input
                        type="range"
                        min={min}
                        max={max}
                        value={sliderValue}
                        onChange={(e) => {
                          const v = clamp(Number(e.target.value), min, max);
                          scheduleSaveTeacherScore({
                            themeId: theme.id,
                            questionId: q.id,
                            correctedScore: v,
                            feedback: tRow.feedback ?? "",
                          });
                        }}
                        disabled={!assessmentId || busy}
                        style={{ width: "100%", marginTop: 10 }}
                      />

                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          fontSize: 12,
                          color: "#666",
                          marginTop: 6,
                        }}
                      >
                        <span>{min}</span>
                        <span style={{ fontFamily: "monospace" }}>{teacherScoreValue ?? "—"}</span>
                        <span>{max}</span>
                      </div>

                      {isOpen && (
                        <div style={{ marginTop: 10 }}>
                          <textarea
                            value={tRow.feedback ?? ""}
                            onChange={(e) => {
                              scheduleSaveTeacherScore({
                                themeId: theme.id,
                                questionId: q.id,
                                correctedScore: tRow.correctedScore ?? null,
                                feedback: e.target.value,
                              });
                            }}
                            rows={3}
                            disabled={!assessmentId || busy}
                            placeholder="Docentfeedback per vraag (optioneel)"
                            style={{
                              width: "100%",
                              maxWidth: "100%",
                              boxSizing: "border-box",
                              padding: 12,
                              border: "1px solid #ddd",
                              borderRadius: 12,
                              resize: "vertical",
                              background: "#fff",
                              display: "block",
                            }}
                          />

                          <div style={{ fontSize: 12, color: "#666", marginTop: 6 }}>
                            Tip: feedback autosaved (draft/publish bepaalt zichtbaarheid voor student).
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </main>
  );
}