"use client";

import { useEffect, useMemo, useState } from "react";

type Cohort = {
  id: string;
  naam: string;
  uitvoeringId: string;
  traject?: string | null;
};

export default function AdminSystemPage() {
  const [status, setStatus] = useState<string>("Laden...");
  const [current, setCurrent] = useState<string>("");
  const [input, setInput] = useState<string>("");
  const [cohorts, setCohorts] = useState<Cohort[]>([]);
  const [saving, setSaving] = useState(false);

  const uitvoeringOptions = useMemo(() => {
    const set = new Set<string>();
    for (const c of cohorts) {
      if (c.uitvoeringId) set.add(String(c.uitvoeringId).trim());
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [cohorts]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const base = window.location.origin;

        const [r1, r2] = await Promise.all([
          fetch(`${base}/api/admin/system/current-uitvoering`, {
            cache: "no-store",
            credentials: "include",
          }),
          fetch(`${base}/api/admin/cohorts`, {
            cache: "no-store",
            credentials: "include",
          }),
        ]);

        // DEBUG (open DevTools Console)
        console.log("SYSTEM r1", r1.status, r1.url);
        if (!r1.ok) {
          const t1 = await r1.text().catch(() => "");
          console.log("SYSTEM r1 body", t1);
        }
        console.log("SYSTEM r2", r2.status, r2.url);

        const j1 = await r1.json().catch(() => ({}));
        const j2 = await r2.json().catch(() => ({}));

        if (cancelled) return;

        if (r1.ok && j1?.ok) {
          setCurrent(j1.uitvoeringId ?? "");
          setInput(j1.uitvoeringId ?? "");
        } else {
          setStatus(`Instelling laden faalde (${r1.status})`);
          return;
        }

        // /api/admin/cohorts is bij jou soms array, soms {cohorts: []}
        const list: Cohort[] = Array.isArray(j2)
          ? j2
          : Array.isArray(j2?.cohorts)
          ? j2.cohorts
          : [];

        setCohorts(list);
        setStatus("");
      } catch (e) {
        console.log("SYSTEM exception", e);
        if (!cancelled) setStatus("Laden faalde.");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  async function save() {
    const v = input.trim();
    if (!v) {
      setStatus("Vul een uitvoeringId in (bijv. 25/26).");
      return;
    }

    setSaving(true);
    setStatus("Opslaan...");

    try {
      const base = window.location.origin;

      const res = await fetch(`${base}/api/admin/system/current-uitvoering`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        cache: "no-store",
        body: JSON.stringify({ uitvoeringId: v }),
      });

      console.log("SYSTEM save", res.status, res.url);
      if (!res.ok) {
        const t = await res.text().catch(() => "");
        console.log("SYSTEM save body", t);
      }

      const j = await res.json().catch(() => ({}));

      if (!res.ok || !j?.ok) {
        setStatus(`Opslaan faalde (${res.status}): ${j?.error ?? "onbekend"}`);
        return;
      }

      setCurrent(j.uitvoeringId);
      setInput(j.uitvoeringId);
      setStatus("Opgeslagen.");
      setTimeout(() => setStatus(""), 1200);
    } catch (e) {
      console.log("SYSTEM save exception", e);
      setStatus("Opslaan faalde (netwerk/exception).");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main style={{ padding: 24, maxWidth: 900, margin: "0 auto" }}>
      <h1 style={{ fontSize: 24, marginBottom: 10 }}>Admin · Systeem</h1>

      <div style={{ fontSize: 12, color: "#666", marginBottom: 16 }}>
        Bepaalt wat “huidige uitvoering” is (schooljaar), bijv. <code>25/26</code>.
        Studentdashboard en cohortgroepering kunnen hierop leunen.
      </div>

      {status ? (
        <div
          style={{
            padding: 12,
            border: "1px solid #eee",
            borderRadius: 12,
            background: "#fafafa",
            marginBottom: 16,
          }}
        >
          {status}
        </div>
      ) : null}

      <section style={{ border: "1px solid #eee", borderRadius: 14, padding: 16 }}>
        <div style={{ marginBottom: 10 }}>
          <strong>Huidige uitvoering</strong>
        </div>

        <div style={{ fontSize: 12, color: "#666", marginBottom: 12 }}>
          Huidig ingesteld:{" "}
          <span style={{ fontFamily: "monospace" }}>{current || "—"}</span>
        </div>

        <div style={{ display: "grid", gap: 12 }}>
          <div>
            <div style={{ fontSize: 12, color: "#666", marginBottom: 6 }}>
              Kies uit bestaande uitvoeringen (gevonden in cohorts):
            </div>

            <select
              value={input}
              onChange={(e) => setInput(e.target.value)}
              style={{
                padding: "8px 10px",
                borderRadius: 10,
                border: "1px solid #ddd",
                width: "100%",
                maxWidth: 260,
              }}
            >
              {!uitvoeringOptions.includes(input.trim()) && input.trim() ? (
                <option value={input.trim()}>{input.trim()} (custom)</option>
              ) : null}

              {uitvoeringOptions.map((u) => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </select>
          </div>

          <div>
            <div style={{ fontSize: 12, color: "#666", marginBottom: 6 }}>
              Of vul handmatig in:
            </div>
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="bijv. 25/26"
              style={{
                padding: "8px 10px",
                borderRadius: 10,
                border: "1px solid #ddd",
                width: "100%",
                maxWidth: 260,
              }}
            />
          </div>

          <div>
            <button
              onClick={save}
              disabled={saving}
              style={{
                padding: "10px 14px",
                borderRadius: 12,
                border: "1px solid #111",
                background: saving ? "#f5f5f5" : "#111",
                color: saving ? "#666" : "#fff",
                cursor: saving ? "not-allowed" : "pointer",
                fontWeight: 700,
              }}
            >
              Opslaan
            </button>
          </div>
        </div>
      </section>
    </main>
  );
}