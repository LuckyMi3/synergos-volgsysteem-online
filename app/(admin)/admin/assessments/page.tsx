"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Row = {
  id: string; // enrollmentId
  studentName: string;
  userId: string;
  cohortName: string;
  cohortId: string;
  uitvoeringId: string;
  assessmentLocked: boolean;
};

export default function AdminAssessmentsPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [status, setStatus] = useState<string>("Laden...");

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const res = await fetch("/api/admin/assessments-data", { cache: "no-store" });
        const data = await res.json().catch(() => []);
        if (cancelled) return;

        if (!res.ok) {
          setStatus(`Laden faalde (${res.status})`);
          return;
        }

        setRows(Array.isArray(data) ? data : []);
        setStatus("");
      } catch {
        if (!cancelled) setStatus("Laden faalde.");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  async function unlock(enrollmentId: string) {
    await fetch(`/api/admin/enrollments/${enrollmentId}/unlock`, { method: "POST" });
    setRows((prev) =>
      prev.map((r) => (r.id === enrollmentId ? { ...r, assessmentLocked: false } : r))
    );
  }

  return (
    <div style={{ padding: 24 }}>
      <h1 style={{ marginTop: 0 }}>Assessments</h1>

      {status && <div style={{ marginTop: 8, opacity: 0.8 }}>{status}</div>}

      <table style={{ width: "100%", marginTop: 20 }}>
        <thead>
          <tr style={{ textAlign: "left" }}>
            <th>Student</th>
            <th>Cohort</th>
            <th>Uitvoering</th>
            <th>Status</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {rows.map((e) => (
            <tr key={e.id}>
              <td>
                <Link href={`/admin/users/${e.userId}`}>{e.studentName}</Link>
              </td>
              <td>
                <Link href={`/admin/cohorts/${e.cohortId}`}>{e.cohortName}</Link>
              </td>
              <td>{e.uitvoeringId}</td>
              <td>
                {e.assessmentLocked ? (
                  <span style={{ color: "red", fontWeight: 700 }}>LOCKED</span>
                ) : (
                  <span style={{ color: "green", fontWeight: 700 }}>OPEN</span>
                )}
              </td>
              <td>
                {e.assessmentLocked && (
                  <button
                    onClick={() => unlock(e.id)}
                    style={{
                      padding: "4px 8px",
                      borderRadius: 6,
                      cursor: "pointer",
                    }}
                  >
                    Unlock
                  </button>
                )}
              </td>
            </tr>
          ))}
          {rows.length === 0 && !status && (
            <tr>
              <td colSpan={5} style={{ paddingTop: 12, opacity: 0.75 }}>
                Geen assessments gevonden.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}