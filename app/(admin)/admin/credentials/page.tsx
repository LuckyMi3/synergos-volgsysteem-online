"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

type Cohort = {
  id: string;
  naam: string;
  traject?: string | null;
  uitvoeringId: string;
  createdAt?: string;
};

type Row = {
  userId: string;
  name: string;
  email: string | null;

  // bekwaamheid
  mbkCompleted: boolean;
  psbkCompleted: boolean;
  exam1Completed: boolean;
  exam2Completed: boolean;
  exam3Completed: boolean;

  // praktijkvorming
  leertherapieCount: number;
  intervisieCount: number;
  supervisieCount: number;
  eindsupervisieDone: boolean;
};

const REQUIRED = {
  leertherapie: 10,
  intervisie: 10,
  supervisie: 12,
};

function StatusDot({ ok }: { ok: boolean }) {
  return (
    <span
      title={ok ? "Afgerond" : "Nog niet"}
      style={{
        display: "inline-block",
        width: 12,
        height: 12,
        borderRadius: 999,
        background: ok ? "#2e7d32" : "#ef6c00",
      }}
    />
  );
}

function Check({ checked }: { checked: boolean }) {
  return (
    <input
      type="checkbox"
      checked={checked}
      readOnly
      disabled
      style={{ width: 18, height: 18 }}
    />
  );
}

export default function AdminCredentialsPage() {
  const [status, setStatus] = useState<string>("Laden...");
  const [cohorts, setCohorts] = useState<Cohort[]>([]);
  const [cohortId, setCohortId] = useState<string>("");

  const [rows, setRows] = useState<Row[]>([]);

  const selectedCohort = useMemo(
    () => cohorts.find((c) => c.id === cohortId) ?? null,
    [cohorts, cohortId]
  );

  // Load cohorts
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const res = await fetch("/api/admin/cohorts");
        const json = await res.json().catch(() => []);
        const list: Cohort[] = Array.isArray(json) ? json : [];

        if (cancelled) return;

        setCohorts(list);
        setCohortId((prev) => prev || list[0]?.id || "");
        setStatus(list.length ? "" : "Geen cohorts gevonden.");
      } catch {
        if (!cancelled) setStatus("Cohorts laden faalde.");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  // Load students + status
  useEffect(() => {
    let cancelled = false;

    async function load() {
      setRows([]);
      if (!cohortId) return;

      setStatus("Studenten laden...");
      try {
        const res = await fetch(
          `/api/admin/credentials?cohortId=${encodeURIComponent(cohortId)}`
        );
        const json = await res.json().catch(() => ({}));

        if (!res.ok || !json?.ok) {
          setStatus(`Laden faalde (${res.status}): ${json?.error ?? "onbekend"}`);
          return;
        }

        if (cancelled) return;

        setRows(Array.isArray(json?.rows) ? json.rows : []);
        setStatus("");
      } catch {
        if (!cancelled) setStatus("Laden faalde.");
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [cohortId]);

  return (
    <main style={{ padding: 24, maxWidth: 1200, margin: "0 auto" }}>
      <h1 style={{ fontSize: 24, marginBottom: 10 }}>
        Admin · Bekwaamheidsstatus
      </h1>

      <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 16, flexWrap: "wrap" }}>
        <label style={{ fontWeight: 700 }}>Cohort:</label>
        <select
          value={cohortId}
          onChange={(e) => setCohortId(e.target.value)}
          style={{ padding: "8px 10px", borderRadius: 10, border: "1px solid #ddd" }}
        >
          {cohorts.map((c) => (
            <option key={c.id} value={c.id}>
              {c.naam} {c.traject ? `· ${c.traject}` : ""} {c.uitvoeringId ? `· ${c.uitvoeringId}` : ""}
            </option>
          ))}
        </select>

        <div style={{ marginLeft: "auto", fontSize: 12, color: "#666" }}>
          {selectedCohort ? (
            <>
              <strong>{selectedCohort.naam}</strong> ·{" "}
              <span style={{ fontFamily: "monospace" }}>{selectedCohort.id}</span>
            </>
          ) : (
            "—"
          )}
        </div>
      </div>

      {status ? (
        <div style={{ padding: 12, border: "1px solid #eee", borderRadius: 12, background: "#fafafa", marginBottom: 16 }}>
          {status}
        </div>
      ) : null}

      <div style={{ overflowX: "auto", border: "1px solid #eee", borderRadius: 12 }}>
        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 980 }}>
          <thead>
            <tr style={{ background: "#f7f7f7" }}>
              <th style={{ textAlign: "left", padding: 12, borderBottom: "1px solid #eee" }}>Student</th>
              <th style={{ textAlign: "center", padding: 12, borderBottom: "1px solid #eee" }}>Tentamens</th>
              <th style={{ textAlign: "center", padding: 12, borderBottom: "1px solid #eee" }}>MBK</th>
              <th style={{ textAlign: "center", padding: 12, borderBottom: "1px solid #eee" }}>PSBK</th>
              <th style={{ textAlign: "center", padding: 12, borderBottom: "1px solid #eee" }}>Praktijkfase</th>
            </tr>
          </thead>

          <tbody>
            {rows.map((r) => {
              const allExams = r.exam1Completed && r.exam2Completed && r.exam3Completed;

              const praktijkfaseAfgerond =
                (r.leertherapieCount ?? 0) >= REQUIRED.leertherapie &&
                (r.intervisieCount ?? 0) >= REQUIRED.intervisie &&
                (r.supervisieCount ?? 0) >= REQUIRED.supervisie &&
                Boolean(r.eindsupervisieDone);

              return (
                <tr key={r.userId}>
                  <td style={{ padding: 12, borderBottom: "1px solid #f0f0f0" }}>
                    <Link
                      href={`/admin/students/${r.userId}`}
                      style={{ fontWeight: 700, textDecoration: "underline", color: "#111" }}
                    >
                      {r.name}
                    </Link>
                    <div style={{ fontSize: 12, color: "#666" }}>{r.email ?? "—"}</div>
                  </td>

                  <td style={{ padding: 12, textAlign: "center", borderBottom: "1px solid #f0f0f0" }}>
                    <Check checked={allExams} />
                  </td>

                  <td style={{ padding: 12, textAlign: "center", borderBottom: "1px solid #f0f0f0" }}>
                    <Check checked={r.mbkCompleted} />
                  </td>

                  <td style={{ padding: 12, textAlign: "center", borderBottom: "1px solid #f0f0f0" }}>
                    <Check checked={r.psbkCompleted} />
                  </td>

                  <td style={{ padding: 12, textAlign: "center", borderBottom: "1px solid #f0f0f0" }}>
                    <StatusDot ok={praktijkfaseAfgerond} />
                  </td>
                </tr>
              );
            })}

            {rows.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ padding: 16, color: "#666" }}>
                  Geen studenten in dit cohort (of nog niet geladen).
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </main>
  );
}