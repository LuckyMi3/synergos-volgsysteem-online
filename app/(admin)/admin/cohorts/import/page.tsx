"use client";

import { useState } from "react";

export default function AdminCohortsImportPage() {
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string>("");

  async function upload() {
    setError("");
    setResult(null);

    if (!file) {
      setError("Kies eerst een CSV bestand.");
      return;
    }

    setBusy(true);
    try {
      const fd = new FormData();
      fd.append("file", file);

      const res = await fetch("/api/admin/cohorts/import", {
        method: "POST",
        body: fd,
      });

      const j = await res.json().catch(() => ({}));
      if (!res.ok || !j?.ok) {
        setError(`Import faalde (${res.status}): ${j?.error ?? "onbekend"}`);
        setResult(j);
        return;
      }

      setResult(j);
    } catch (e: any) {
      setError(e?.message ?? "Import faalde.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main style={{ padding: 24, maxWidth: 900, margin: "0 auto" }}>
      <h1 style={{ fontSize: 22, marginBottom: 8 }}>Admin · Uitvoeringen import</h1>

      <div style={{ fontSize: 12, color: "#666", marginBottom: 16 }}>
        Upload een CSV export uit Apollo. Vereist minimaal kolommen voor <code>uitvoeringId</code> en <code>naam</code>.
        Optioneel: <code>traject</code> (bijv. <code>2vo</code>).
      </div>

      <div style={{ display: "grid", gap: 12, border: "1px solid #eee", borderRadius: 12, padding: 16 }}>
        <input
          type="file"
          accept=".csv,text/csv"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        />

        <button
          onClick={upload}
          disabled={busy}
          style={{
            padding: "10px 14px",
            borderRadius: 12,
            border: "1px solid #111",
            background: busy ? "#f5f5f5" : "#111",
            color: busy ? "#666" : "#fff",
            cursor: busy ? "not-allowed" : "pointer",
            fontWeight: 700,
            width: 160,
          }}
        >
          {busy ? "Bezig..." : "Importeer"}
        </button>

        {error ? (
          <div style={{ padding: 12, border: "1px solid #f3d0d0", background: "#fff5f5", borderRadius: 12 }}>
            {error}
          </div>
        ) : null}

        {result ? (
          <pre style={{ margin: 0, padding: 12, border: "1px solid #eee", background: "#fafafa", borderRadius: 12, overflow: "auto" }}>
            {JSON.stringify(result, null, 2)}
          </pre>
        ) : null}

        <div style={{ fontSize: 12, color: "#666" }}>
          Na import: ga naar <a href="/admin/cohorts">Uitvoeringen</a> en zet/of controleer het traject op <code>2vo</code> voor jouw 2VO uitvoering.
        </div>
      </div>
    </main>
  );
}