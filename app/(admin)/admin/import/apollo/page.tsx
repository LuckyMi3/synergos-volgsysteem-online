"use client";

import { useState } from "react";
import Link from "next/link";

export default function AdminApolloImportPage() {
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>("");
  const [result, setResult] = useState<any>(null);

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

      const res = await fetch("/api/admin/import/apollo", {
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
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12 }}>
        <h1 style={{ fontSize: 22, marginBottom: 8 }}>Admin · Apollo import</h1>
        <Link href="/admin/cohorts" style={{ fontSize: 12 }}>naar uitvoeringen →</Link>
      </div>

      <div style={{ fontSize: 12, color: "#666", marginBottom: 14, lineHeight: 1.5 }}>
        Upload de Apollo export als <strong>CSV</strong>.
        Deze import maakt/actualiseert:
        <ul style={{ margin: "6px 0 0 0", paddingLeft: 18 }}>
          <li>Uitvoeringen (cohorts) op <code>Uitvoering ID</code></li>
          <li>Gebruikers op <code>Emailadres</code></li>
          <li>Enrollments (koppeling gebruiker ↔ uitvoering)</li>
        </ul>
        <div style={{ marginTop: 10, fontWeight: 800 }}>Verplichte kolommen (exact Apollo)</div>
        <ul style={{ margin: "6px 0 0 0", paddingLeft: 18 }}>
          <li><code>Naam uitvoering</code></li>
          <li><code>Uitvoering ID</code></li>
          <li><code>Emailadres</code></li>
        </ul>
        <div style={{ marginTop: 6 }}>Overige kolommen die we meenemen: <code>Rol</code>, <code>Coach</code>, <code>Voornaam</code>, <code>van de</code>, <code>Achternaam</code>, <code>Klantnummer</code>, <code>Courses</code>, <code>TrajectStatus</code>.</div>
      </div>

      <div style={{ display: "grid", gap: 12, border: "1px solid #eee", borderRadius: 12, padding: 16 }}>
        <input type="file" accept=".csv,text/csv" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />

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
            fontWeight: 800,
            width: 180,
          }}
        >
          {busy ? "Bezig..." : "Importeer Apollo CSV"}
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
      </div>
    </main>
  );
}