"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type LoginResult = {
  ok: boolean;
  error?: string;
  user?: { id: string; role: string; email: string };
  breakGlass?: boolean;
};

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<"user" | "breakglass">("user");

  const canSubmit = useMemo(() => {
    if (mode === "breakglass") return password.trim().length > 0;
    return email.trim().length > 0 && password.trim().length > 0;
  }, [email, password, mode]);

  async function onLogin() {
    setLoading(true);
    setError(null);

    try {
      const body = mode === "breakglass" ? { password } : { email, password };

      const res = await fetch("/api/admin/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data: LoginResult = await res.json().catch(() => ({ ok: false } as any));

      if (!res.ok || !data?.ok) throw new Error(data?.error || "Login failed");

      const role = data?.user?.role;

      if (role === "STUDENT") router.push("/student");
      else if (role === "TEACHER") router.push("/docent");
      else router.push("/admin");

      router.refresh();
    } catch (e: any) {
      setError(e?.message ?? "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ padding: 24, maxWidth: 560 }}>
      <h1 style={{ fontSize: 26, fontWeight: 900, marginBottom: 10 }}>Inloggen</h1>
      <p style={{ opacity: 0.8, lineHeight: 1.4, marginTop: 0 }}>
        V1 (C2): accounts komen uit import. Admin zet/reset wachtwoorden. Geen Apollo/SSO.
      </p>

      <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
        <button onClick={() => setMode("user")} style={tabStyle(mode === "user")}>
          E-mail login
        </button>
        <button onClick={() => setMode("breakglass")} style={tabStyle(mode === "breakglass")}>
          Noodlogin (admin)
        </button>
      </div>

      {mode === "user" ? (
        <>
          <div style={{ marginTop: 16 }}>
            <div style={{ fontWeight: 800, marginBottom: 6 }}>E-mail</div>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={inputStyle}
              placeholder="naam@synergos.nl"
            />
          </div>

          <div style={{ marginTop: 12 }}>
            <div style={{ fontWeight: 800, marginBottom: 6 }}>Wachtwoord</div>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={inputStyle}
              placeholder="Wachtwoord"
            />
          </div>
        </>
      ) : (
        <>
          <div style={{ marginTop: 16, padding: 12, borderRadius: 12, border: "1px solid rgba(0,0,0,0.12)" }}>
            <div style={{ fontWeight: 900, marginBottom: 6 }}>Noodlogin</div>
            <div style={{ fontSize: 12, color: "#666", lineHeight: 1.4 }}>
              Alleen voor break-glass toegang met <code>ADMIN_PASSWORD</code>. Dit zet géén gebruikerssessie.
            </div>
          </div>

          <div style={{ marginTop: 12 }}>
            <div style={{ fontWeight: 800, marginBottom: 6 }}>Admin wachtwoord</div>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={inputStyle}
              placeholder="ADMIN_PASSWORD"
            />
          </div>
        </>
      )}

      <button
        onClick={onLogin}
        disabled={loading || !canSubmit}
        style={{
          marginTop: 14,
          padding: "10px 14px",
          borderRadius: 12,
          border: "1px solid rgba(0,0,0,0.15)",
          background: loading || !canSubmit ? "rgba(0,0,0,0.25)" : "black",
          color: "white",
          fontWeight: 900,
          cursor: loading || !canSubmit ? "not-allowed" : "pointer",
        }}
      >
        {loading ? "Inloggen..." : "Inloggen"}
      </button>

      {error && (
        <div style={{ marginTop: 14, color: "crimson" }}>
          <b>Fout:</b> {error}
        </div>
      )}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: 12,
  borderRadius: 12,
  border: "1px solid rgba(0,0,0,0.2)",
};

function tabStyle(active: boolean): React.CSSProperties {
  return {
    padding: "8px 12px",
    borderRadius: 999,
    border: "1px solid rgba(0,0,0,0.15)",
    background: active ? "black" : "white",
    color: active ? "white" : "black",
    fontWeight: 900,
    cursor: "pointer",
  };
}