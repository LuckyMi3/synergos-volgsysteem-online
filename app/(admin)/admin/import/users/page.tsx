"use client";

import { useMemo, useState } from "react";

type ImportResult = {
  ok: boolean;
  results?: {
    total: number;
    created: number;
    updated: number;
    skipped: number;
    errors: { email?: string; message: string }[];
  };
  error?: string;
};

export default function ImportUsersPage() {
  const [fileName, setFileName] = useState<string>("");
  const [csvText, setCsvText] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [resp, setResp] = useState<ImportResult | null>(null);

  const canImport = useMemo(() => csvText.trim().length > 0 && !loading, [csvText, loading]);

  async function onPickFile(e: React.ChangeEvent<HTMLInputElement>) {
    setResp(null);

    const file = e.target.files?.[0];
    if (!file) {
      setFileName("");
      setCsvText("");
      return;
    }

    setFileName(file.name);
    const text = await file.text();
    setCsvText(text);
  }

  async function onImport() {
    setLoading(true);
    setResp(null);

    try {
      const r = await fetch("/api/admin/import/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ csvText }),
      });

      const data = (await r.json()) as ImportResult;
      if (!r.ok) setResp({ ok: false, error: (data as any)?.error || "Import mislukt" });
      else setResp(data);
    } catch (e: any) {
      setResp({ ok: false, error: e?.message ?? "Unknown error" });
    } finally {
      setLoading(false);
    }
  }

  function downloadTemplate() {
    const template =
      "email,voornaam,tussenvoegsel,achternaam,crmCustomerId,role\n" +
      "student1@synergos.nl,Student,,Voorbeeld,1001,STUDENT\n" +
      "nico@synergos.nl,Nico,,Pronk,4,TEACHER\n" +
      "admin@synergos.nl,Admin,,Synergos,1,ADMIN\n";

    const blob = new Blob([template], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "users_template.csv";
    a.click();

    URL.revokeObjectURL(url);
  }

  return (
    <div style={{ padding: 24, maxWidth: 980 }}>
      <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 8 }}>Users import (CSV)</h1>

      <p style={{ marginTop: 0, opacity: 0.85, lineHeight: 1.4 }}>
        Upload een CSV om <b>studenten</b> en <b>docenten</b> (en optioneel admins) te importeren.
        De import doet een <b>upsert op email</b>. Als je geen <code>role</code> kolom meegeeft, dan
        blijft de bestaande role ongemoeid.
      </p>

      <div style={{ display: "flex", gap: 12, alignItems: "center", marginTop: 16, flexWrap: "wrap" }}>
        <label
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 10,
            padding: "10px 14px",
            borderRadius: 12,
            border: "1px solid rgba(0,0,0,0.15)",
            cursor: "pointer",
            background: "white",
          }}
        >
          <input type="file" accept=".csv,text/csv" onChange={onPickFile} style={{ display: "none" }} />
          <span style={{ fontWeight: 700 }}>Kies CSV-bestand</span>
          <span style={{ opacity: 0.7 }}>{fileName ? fileName : "geen bestand gekozen"}</span>
        </label>

        <button
          onClick={downloadTemplate}
          style={{
            padding: "10px 14px",
            borderRadius: 12,
            border: "1px solid rgba(0,0,0,0.15)",
            background: "white",
            cursor: "pointer",
            fontWeight: 700,
          }}
          type="button"
        >
          Download template
        </button>

        <button
          onClick={onImport}
          disabled={!canImport}
          style={{
            padding: "10px 14px",
            borderRadius: 12,
            border: "1px solid rgba(0,0,0,0.15)",
            background: canImport ? "black" : "rgba(0,0,0,0.25)",
            color: "white",
            cursor: canImport ? "pointer" : "not-allowed",
            fontWeight: 800,
          }}
          type="button"
        >
          {loading ? "Importeren..." : "Importeer users"}
        </button>
      </div>

      <div style={{ marginTop: 16 }}>
        <div style={{ fontWeight: 800, marginBottom: 6 }}>Preview (eerste ~30 regels)</div>
        <pre
          style={{
            margin: 0,
            padding: 12,
            borderRadius: 12,
            border: "1px solid rgba(0,0,0,0.15)",
            background: "white",
            maxHeight: 300,
            overflow: "auto",
            fontSize: 12,
          }}
        >
          {csvText ? csvText.split(/\r?\n/).slice(0, 30).join("\n") : "Kies een CSV om hier een preview te zien."}
        </pre>
      </div>

      {resp && (
        <div style={{ marginTop: 16 }}>
          {!resp.ok ? (
            <div
              style={{
                padding: 12,
                borderRadius: 12,
                border: "1px solid rgba(220,0,0,0.35)",
                background: "rgba(220,0,0,0.06)",
              }}
            >
              <div style={{ fontWeight: 900, color: "crimson" }}>Import fout</div>
              <div style={{ marginTop: 6 }}>{resp.error ?? "Onbekende fout"}</div>
            </div>
          ) : (
            <div
              style={{
                padding: 12,
                borderRadius: 12,
                border: "1px solid rgba(0,0,0,0.15)",
                background: "white",
              }}
            >
              <div style={{ fontWeight: 900 }}>Resultaat</div>
              <div style={{ marginTop: 8, display: "flex", gap: 16, flexWrap: "wrap" }}>
                <Stat label="Totaal" value={resp.results?.total ?? 0} />
                <Stat label="Aangemaakt" value={resp.results?.created ?? 0} />
                <Stat label="Geüpdatet" value={resp.results?.updated ?? 0} />
                <Stat label="Overgeslagen" value={resp.results?.skipped ?? 0} />
                <Stat label="Errors" value={resp.results?.errors?.length ?? 0} />
              </div>

              {(resp.results?.errors?.length ?? 0) > 0 && (
                <div style={{ marginTop: 12 }}>
                  <div style={{ fontWeight: 800, marginBottom: 6 }}>Errors</div>
                  <pre
                    style={{
                      margin: 0,
                      padding: 12,
                      borderRadius: 12,
                      border: "1px solid rgba(0,0,0,0.15)",
                      background: "#111",
                      color: "#eee",
                      overflow: "auto",
                      fontSize: 12,
                    }}
                  >
                    {JSON.stringify(resp.results?.errors ?? [], null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <div style={{ marginTop: 18, opacity: 0.75, fontSize: 13, lineHeight: 1.4 }}>
        <b>Route:</b> <code>/admin/import/users</code> <br />
        <b>API:</b> <code>/api/admin/import/users</code>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div
      style={{
        padding: "10px 12px",
        borderRadius: 12,
        border: "1px solid rgba(0,0,0,0.12)",
        minWidth: 120,
      }}
    >
      <div style={{ fontSize: 12, opacity: 0.7 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 900 }}>{value}</div>
    </div>
  );
}