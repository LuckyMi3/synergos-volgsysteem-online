"use client";

import { useState } from "react";

export default function SetPasswordCard({ userId, hasPassword }: { userId: string; hasPassword: boolean }) {
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);

  async function onSave() {
    setLoading(true);
    setError(null);
    setOkMsg(null);

    try {
      const res = await fetch(`/api/admin/users/${userId}/set-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) throw new Error(data?.error || "Password update failed");

      setPassword("");
      setOkMsg("Wachtwoord opgeslagen.");
    } catch (e: any) {
      setError(e?.message ?? "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ marginTop: 12, border: "1px solid #eee", borderRadius: 12, padding: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12 }}>
        <div style={{ fontWeight: 900 }}>Wachtwoord (C2)</div>
        <div style={{ fontSize: 12, color: hasPassword ? "#2f6f2f" : "#a05a00", fontWeight: 900 }}>
          {hasPassword ? "Heeft wachtwoord" : "Nog geen wachtwoord"}
        </div>
      </div>

      <div style={{ marginTop: 10 }}>
        <div style={{ fontSize: 12, color: "#666", marginBottom: 6, fontWeight: 800 }}>Nieuw wachtwoord</div>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Minimaal 8 tekens"
          style={{ width: "100%", padding: 12, borderRadius: 12, border: "1px solid rgba(0,0,0,0.2)" }}
        />
      </div>

      <button
        onClick={onSave}
        disabled={loading || password.trim().length < 8}
        style={{
          marginTop: 12,
          padding: "10px 14px",
          borderRadius: 12,
          border: "1px solid rgba(0,0,0,0.15)",
          background: loading || password.trim().length < 8 ? "rgba(0,0,0,0.25)" : "black",
          color: "white",
          fontWeight: 900,
          cursor: loading || password.trim().length < 8 ? "not-allowed" : "pointer",
        }}
      >
        {loading ? "Opslaan..." : "Wachtwoord opslaan"}
      </button>

      {okMsg && (
        <div style={{ marginTop: 10, color: "#2f6f2f" }}>
          <b>OK:</b> {okMsg}
        </div>
      )}

      {error && (
        <div style={{ marginTop: 10, color: "crimson" }}>
          <b>Fout:</b> {error}
        </div>
      )}

      <div style={{ marginTop: 10, fontSize: 12, color: "#666", lineHeight: 1.4 }}>
        Let op: dit is een V1-mechanisme. Accounts komen uit import; alleen admin kan wachtwoorden zetten/resetten.
      </div>
    </div>
  );
}