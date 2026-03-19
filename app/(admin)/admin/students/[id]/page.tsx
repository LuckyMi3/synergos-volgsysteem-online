"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

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
    value >= required
      ? "#2e7d32"
      : value === 0
      ? "#c62828"
      : "#ef6c00";

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
        style={{ width: 40 }}
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
      }}
    >
      {value}
    </span>
  );
}

export default function StudentDetailPage() {
  const params = useParams();
  const userId = String(params?.id ?? "");

  const [cred, setCred] = useState<Credential | null>(null);
  const [user, setUser] = useState<UserInfo | null>(null);
  const [status, setStatus] = useState("Laden...");

  useEffect(() => {
    if (!userId) return;

    (async () => {
      const res = await fetch(`/api/admin/student-credential?userId=${userId}`);
      const json = await res.json();
      if (json?.ok) {
        setCred(json.credential);
        setUser(json.user);
        setStatus("");
      } else {
        setStatus("Niet gevonden");
      }
    })();
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

  if (status) return <div style={{ padding: 30 }}>{status}</div>;
  if (!cred || !user) return null;

  const fullName = [user.voornaam, user.tussenvoegsel, user.achternaam]
    .filter(Boolean)
    .join(" ");

  const praktijkfaseAfgerond =
    cred.leertherapieCount >= REQUIRED.leertherapie &&
    cred.intervisieCount >= REQUIRED.intervisie &&
    cred.supervisieCount >= REQUIRED.supervisie &&
    cred.eindsupervisieDone;

  return (
    <main style={{ padding: 40, maxWidth: 900, margin: "0 auto" }}>
      <h1 style={{ marginBottom: 30 }}>
        Opleidingsdossier · {fullName}
      </h1>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 40 }}>
        <section>
          <div style={{ marginBottom: 15 }}>Bekwaamheidsvereisten</div>

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
        </section>

        <section>
          <div style={{ marginBottom: 15 }}>Praktijkvorming</div>

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
                onChange={(e) =>
                  update("eindsupervisieDone", e.target.checked)
                }
              />{" "}
              Eindsupervisie afgerond
            </label>
          </div>
        </section>
      </div>

      <hr style={{ margin: "40px 0" }} />

      <div>
        Praktijkfase:{" "}
        <span
          style={{
            color: praktijkfaseAfgerond ? "#2e7d32" : "#ef6c00",
          }}
        >
          {praktijkfaseAfgerond ? "Afgerond" : "In uitvoering"}
        </span>
      </div>
    </main>
  );
}