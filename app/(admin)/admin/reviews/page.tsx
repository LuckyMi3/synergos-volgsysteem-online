"use client";

import { useEffect, useState } from "react";

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

function showAssessmentNotFoundPopup() {
  alert(
    "Feedback kan nog niet worden opgeslagen.\n\n" +
      "Deze student heeft het volgsysteem nog niet geopend voor dit onderdeel.\n" +
      "Benader de student rechtstreeks en motiveer om het volgsysteem te bekijken, " +
      "anders ontvangt de student geen feedback van de vakopleiding."
  );
}

export default function AdminReviewsPage() {
  const [assessmentId, setAssessmentId] = useState<string>("");
  const [teacherId, setTeacherId] = useState<string>("docent-1");

  const [review, setReview] = useState<TeacherReview | null>(null);
  const [correctedScore, setCorrectedScore] = useState<string>("");
  const [feedback, setFeedback] = useState<string>("");

  const [status, setStatus] = useState<string>("");
  const [busy, setBusy] = useState<boolean>(false);

  async function loadReview(id: string) {
    setStatus("");
    if (!id.trim()) return;

    const res = await fetch(
      `/api/teacher-reviews?assessmentId=${encodeURIComponent(id)}`
    );

    if (!res.ok) {
      setReview(null);
      setCorrectedScore("");
      setFeedback("");
      setStatus(`Laden faalde (${res.status}).`);
      return;
    }

    const data = (await res.json()) as TeacherReview | null;

    setReview(data);
    setCorrectedScore(data?.correctedScore != null ? String(data.correctedScore) : "");
    setFeedback(data?.feedback ?? "");
    setStatus(data ? `Review geladen (${data.status}).` : "Nog geen review (maak draft aan).");
  }

  async function saveDraft() {
    if (!assessmentId.trim()) {
      setStatus("assessmentId ontbreekt.");
      return;
    }

    setBusy(true);
    setStatus("Opslaan (draft)...");
    try {
      const res = await fetch("/api/teacher-reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assessmentId,
          teacherId,
          correctedScore: correctedScore.trim() === "" ? null : Number(correctedScore),
          feedback: feedback.trim() === "" ? null : feedback,
        }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        const code = data?.code;
        const err = data?.error;
        const message = data?.message;

        if (
          res.status === 400 &&
          (code === "ASSESSMENT_NOT_FOUND" ||
            err === "ASSESSMENT_NOT_FOUND" ||
            message?.toString()?.includes("ASSESSMENT_NOT_FOUND"))
        ) {
          showAssessmentNotFoundPopup();
          setStatus("Opslaan geblokkeerd: assessment bestaat nog niet (student heeft nog niet gestart).");
          return;
        }

        const display = message ?? err ?? "onbekend";
        setStatus(`Opslaan faalde (${res.status}): ${display}`);
        return;
      }

      setReview(data);
      setStatus("Draft opgeslagen.");
    } catch {
      setStatus("Opslaan faalde (netwerk/exception).");
    } finally {
      setBusy(false);
    }
  }

  async function publish() {
    if (!assessmentId.trim()) {
      setStatus("assessmentId ontbreekt.");
      return;
    }

    setBusy(true);
    setStatus("Publiceren...");
    try {
      const res = await fetch("/api/teacher-reviews/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assessmentId, teacherId }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        const code = data?.code;
        const err = data?.error;
        const message = data?.message;

        if (
          res.status === 400 &&
          (code === "ASSESSMENT_NOT_FOUND" ||
            err === "ASSESSMENT_NOT_FOUND" ||
            message?.toString()?.includes("ASSESSMENT_NOT_FOUND"))
        ) {
          showAssessmentNotFoundPopup();
          setStatus("Publiceren geblokkeerd: assessment bestaat nog niet (student heeft nog niet gestart).");
          return;
        }

        const display = message ?? err ?? "onbekend";
        setStatus(`Publiceren faalde (${res.status}): ${display}`);
        return;
      }

      setReview(data);
      setStatus("Gepubliceerd.");
    } catch {
      setStatus("Publiceren faalde (netwerk/exception).");
    } finally {
      setBusy(false);
    }
  }

  // Auto-load when assessmentId changes (met kleine debounce)
  useEffect(() => {
    const t = setTimeout(() => {
      loadReview(assessmentId);
    }, 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assessmentId]);

  return (
    <div style={{ padding: 8, maxWidth: 900 }}>
      <h2 style={{ marginTop: 0 }}>Reviews</h2>
      <div style={{ fontSize: 12, color: "#666", marginBottom: 14 }}>
        Beheer teacher-reviews direct op assessmentId (handig voor admin/debug).
      </div>

      <div style={{ display: "grid", gap: 12, marginBottom: 18 }}>
        <label style={{ display: "grid", gap: 6 }}>
          <div style={{ fontWeight: 600 }}>assessmentId</div>
          <input
            value={assessmentId}
            onChange={(e) => setAssessmentId(e.target.value)}
            placeholder="Plak hier assessmentId"
            style={{
              padding: 10,
              borderRadius: 10,
              border: "1px solid #ddd",
              fontFamily: "monospace",
            }}
          />
        </label>

        <label style={{ display: "grid", gap: 6, maxWidth: 260 }}>
          <div style={{ fontWeight: 600 }}>teacherId</div>
          <input
            value={teacherId}
            onChange={(e) => setTeacherId(e.target.value)}
            style={{
              padding: 10,
              borderRadius: 10,
              border: "1px solid #ddd",
            }}
          />
        </label>
      </div>

      <div
        style={{
          padding: 14,
          border: "1px solid #eee",
          borderRadius: 12,
          background: "#fafafa",
          marginBottom: 18,
        }}
      >
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <div style={{ fontWeight: 700 }}>
            Status:{" "}
            <span style={{ fontFamily: "monospace" }}>
              {review?.status ?? "—"}
            </span>
          </div>
          {review?.publishedAt ? (
            <div style={{ fontSize: 12, color: "#666" }}>
              gepubliceerd: {new Date(review.publishedAt).toLocaleString("nl-NL")}
            </div>
          ) : null}
        </div>

        <div style={{ fontSize: 12, color: "#666", marginTop: 8 }}>{status}</div>
      </div>

      <div style={{ display: "grid", gap: 12, marginBottom: 18 }}>
        <label style={{ display: "grid", gap: 6, maxWidth: 220 }}>
          <div style={{ fontWeight: 600 }}>Corrected score (optioneel)</div>
          <input
            value={correctedScore}
            onChange={(e) => setCorrectedScore(e.target.value)}
            placeholder="bijv. 7"
            inputMode="numeric"
            style={{
              padding: 10,
              borderRadius: 10,
              border: "1px solid #ddd",
            }}
          />
        </label>

        <label style={{ display: "grid", gap: 6 }}>
          <div style={{ fontWeight: 600 }}>Feedback (optioneel)</div>
          <textarea
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            rows={6}
            style={{
              padding: 10,
              borderRadius: 10,
              border: "1px solid #ddd",
              resize: "vertical",
            }}
          />
        </label>
      </div>

      <div style={{ display: "flex", gap: 10 }}>
        <button
          onClick={saveDraft}
          disabled={busy}
          style={{
            padding: "10px 14px",
            borderRadius: 10,
            border: "1px solid #ddd",
            background: "#fff",
            cursor: busy ? "not-allowed" : "pointer",
          }}
        >
          Opslaan als draft
        </button>

        <button
          onClick={publish}
          disabled={busy || !review}
          style={{
            padding: "10px 14px",
            borderRadius: 10,
            border: "none",
            background: "#111",
            color: "#fff",
            cursor: busy || !review ? "not-allowed" : "pointer",
          }}
          title={!review ? "Maak eerst een draft aan" : "Publiceer de review"}
        >
          Publish
        </button>
      </div>

      <div style={{ marginTop: 22, fontSize: 12, color: "#666" }}>
        Tip: plak het assessmentId uit de student view.
      </div>
    </div>
  );
}