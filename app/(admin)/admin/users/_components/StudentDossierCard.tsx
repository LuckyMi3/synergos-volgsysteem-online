"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

type Credential = {
  exam1Completed: boolean;
  exam2Completed: boolean;
  exam3Completed: boolean;
  mbkCompleted: boolean;
  psbkCompleted: boolean;
  leertherapieCount: number;
  intervisieCount: number;
  supervisieCount: number;
  eindsupervisieDone: boolean;
};

type UserInfo = {
  voornaam: string;
  tussenvoegsel: string | null;
  achternaam: string;
};

const REQUIRED = {
  leertherapie: 10,
  intervisie: 10,
  supervisie: 12,
};

function EditableNumber({
  value,
  required,
  onChange,
}: {
  value: number;
  required: number;
  onChange: (v: number) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [temp, setTemp] = useState(value);

  const color =
    value >= required ? "#2e7d32" : value === 0 ? "#c62828" : "#ef6c00";

  if (editing) {
    return (
      <input
        type="number"
        min={0}
        value={temp}
        autoFocus
        onChange={(e) => setTemp(Number(e.target.value))}
        onBlur={() => {
          setEditing(false);
          onChange(temp);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            setEditing(false);
            onChange(temp);
          }
        }}
        style={{ width: 60, padding: "6px 8px", borderRadius: 8, border: "1px solid #ddd" }}
      />
    );
  }

  return (
    <span
      onClick={() => {
        setTemp(value);
        setEditing(true);
      }}
      style={{
        cursor: "pointer",
        borderBottom: "1px dashed #aaa",
        color,
        fontWeight: 800,
      }}
      title="Klik om te wijzigen"
    >
      {value}
    </span>
  );
}

export default function StudentDossierCard({ userId }: { userId: string }) {
  const [cred, setCred] = useState<Credential | null>(null);
  const [user, setUser] = useState<UserInfo | null>(null);
  const [status, setStatus] = useState("Laden...");

  useEffect(() => {
    if (!userId) return;

    let cancelled = false;

    (async () => {
      try {
        const res = await fetch(`/api/admin/student-credential?userId=${encodeURIComponent(userId)}`, {
          cache: "no-store",
        });
        const json = await res.json().catch(() => ({}));

        if (cancelled) return;

        if (json?.ok) {
          setCred(json.credential);
          setUser(json.user);
          setStatus("");
        } else {
          setStatus("Niet gevonden");
        }
      } catch {
        if (!cancelled) setStatus("Laden faalde");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [userId]);

  async function update(field: string, value: any) {
    if (!cred) return;

    setCred({ ...cred, [field]: value });

    await fetch("/api/admin/student-credential", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, field, value }),
    });
  }

  const fullName = useMemo(() => {
    if (!user) return "";
    return [user.voornaam, user.tussenvoegsel, user.achternaam].filter(Boolean).join(" ");
  }, [user]);

  const praktijkfaseAfgerond = !!cred &&
    cred.leertherapieCount >= REQUIRED.leertherapie &&
    cred.intervisieCount >= REQUIRED.intervisie &&
    cred.supervisieCount >= REQUIRED.supervisie &&
    cred.eindsupervisieDone;

  return (
    <section style={{ marginTop: 14, border: "1px solid #eee", borderRadius: 12, padding: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "baseline", flexWrap: "wrap" }}>
        <h3 style={{ margin: 0 }}>Opleidingsdossier</h3>

        <Link
          href={`/admin/students/${userId}`}
          style={{ fontSize: 12, textDecoration: "none", fontWeight: 800 }}
          title="Open full-screen dossier"
        >
          Open dossier → 
        </Link>
      </div>

      {status ? (
        <div style={{ marginTop: 10, color: "#666" }}>{status}</div>
      ) : null}

      {!status && cred ? (
        <>
          <div style={{ marginTop: 10, fontSize: 12, color: "#666" }}>
            {fullName ? <strong>{fullName}</strong> : null}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginTop: 12 }}>
            <div style={{ border: "1px solid #eee", borderRadius: 12, padding: 12 }}>
              <div style={{ fontSize: 12, color: "#666", marginBottom: 10 }}>Bekwaamheidsvereisten</div>

              {[
                ["exam1Completed", "Tentamen Ontwikkelingspsychologie (1VO)"],
                ["exam2Completed", "Tentamen Haptonomische Fenomenen (2VO)"],
                ["exam3Completed", "Tentamen Psychopathologie (3VO)"],
                ["mbkCompleted", "Medische Basiskennis (MBK)"],
                ["psbkCompleted", "Psychosociale Basiskennis (PSBK)"],
              ].map(([field, label]) => (
                <div key={field} style={{ marginBottom: 8 }}>
                  <label style={{ cursor: "pointer" }}>
                    <input
                      type="checkbox"
                      checked={(cred as any)[field]}
                      onChange={(e) => update(field, e.target.checked)}
                    />{" "}
                    {label}
                  </label>
                </div>
              ))}
            </div>

            <div style={{ border: "1px solid #eee", borderRadius: 12, padding: 12 }}>
              <div style={{ fontSize: 12, color: "#666", marginBottom: 10 }}>Praktijkvorming</div>

              <div style={{ marginBottom: 10 }}>
                Leertherapie:{" "}
                <EditableNumber
                  value={cred.leertherapieCount}
                  required={REQUIRED.leertherapie}
                  onChange={(v) => update("leertherapieCount", v)}
                />{" "}
                / {REQUIRED.leertherapie}
              </div>

              <div style={{ marginBottom: 10 }}>
                Intervisie:{" "}
                <EditableNumber
                  value={cred.intervisieCount}
                  required={REQUIRED.intervisie}
                  onChange={(v) => update("intervisieCount", v)}
                />{" "}
                / {REQUIRED.intervisie}
              </div>

              <div style={{ marginBottom: 10 }}>
                Supervisie:{" "}
                <EditableNumber
                  value={cred.supervisieCount}
                  required={REQUIRED.supervisie}
                  onChange={(v) => update("supervisieCount", v)}
                />{" "}
                / {REQUIRED.supervisie}
              </div>

              <div style={{ marginTop: 8 }}>
                <label style={{ cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={cred.eindsupervisieDone}
                    onChange={(e) => update("eindsupervisieDone", e.target.checked)}
                  />{" "}
                  Eindsupervisie afgerond
                </label>
              </div>

              <div style={{ marginTop: 12, fontSize: 12 }}>
                Praktijkfase:{" "}
                <span style={{ color: praktijkfaseAfgerond ? "#2e7d32" : "#ef6c00", fontWeight: 900 }}>
                  {praktijkfaseAfgerond ? "Afgerond" : "In uitvoering"}
                </span>
              </div>
            </div>
          </div>
        </>
      ) : null}
    </section>
  );
}