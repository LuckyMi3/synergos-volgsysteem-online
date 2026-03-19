"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type LoginMode = "STUDENT" | "TEACHER" | "ADMIN";

const MODES: Array<{
  value: LoginMode;
  label: string;
  endpoint: string;
  redirectTo: string;
}> = [
  { value: "STUDENT", label: "Cursist", endpoint: "/api/auth/login", redirectTo: "/student" },
  { value: "TEACHER", label: "Docent", endpoint: "/api/auth/login", redirectTo: "/docent" },
  { value: "ADMIN", label: "Admin", endpoint: "/api/admin/auth/login", redirectTo: "/admin" },
];

function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

export default function LoginPage() {
  const router = useRouter();

  const [mode, setMode] = useState<LoginMode>("STUDENT");
  const active = useMemo(() => MODES.find((m) => m.value === mode)!, [mode]);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const res = await fetch(active.endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          password,
        }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        setError(
          String(data?.error || data?.message || data?.detail || `Inloggen mislukt (${res.status}).`)
        );
        setSubmitting(false);
        return;
      }

      router.push(active.redirectTo);
      router.refresh();
    } catch {
      setError("Inloggen faalde (netwerkfout).");
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white flex items-center justify-center p-6">
      <div className="w-full max-w-lg">
        {/* Card */}
        <div className="rounded-2xl border border-slate-200 bg-white shadow-[0_12px_35px_-20px_rgba(2,6,23,0.35)] overflow-hidden">
          {/* Header */}
          <div className="px-7 py-6 border-b border-slate-100">
            <div className="text-center">
              <h1 className="text-3xl font-semibold tracking-tight text-slate-900">
                Mijn Synergos
              </h1>
              <p className="mt-1 text-sm text-slate-500">
                Log in op je omgeving
              </p>
            </div>
          </div>

          {/* Body */}
          <div className="px-7 py-6">
            {/* Tabs */}
            <div className="grid grid-cols-3 gap-2 rounded-xl bg-slate-50 p-2 border border-slate-200">
              {MODES.map((m) => {
                const selected = m.value === mode;
                return (
                  <button
                    key={m.value}
                    type="button"
                    onClick={() => {
                      setMode(m.value);
                      setError(null);
                    }}
                    className={cx(
                      "h-11 rounded-lg text-sm font-semibold transition select-none",
                      "focus:outline-none focus:ring-2 focus:ring-slate-300",
                      selected
                        ? "bg-slate-900 text-white shadow-sm"
                        : "bg-transparent text-slate-700 hover:bg-white hover:text-slate-900"
                    )}
                    aria-pressed={selected}
                  >
                    {m.label}
                  </button>
                );
              })}
            </div>

            {/* Form */}
            <form onSubmit={onSubmit} className="mt-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-800 mb-1">
                  Emailadres
                </label>
                <input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  inputMode="email"
                  className="w-full h-12 rounded-xl border border-slate-200 bg-white px-4 text-slate-900 shadow-sm outline-none transition
                             focus:border-slate-300 focus:ring-2 focus:ring-slate-200"
                  placeholder="naam@email.nl"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-800 mb-1">
                  Wachtwoord
                </label>
                <input
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  type="password"
                  autoComplete="current-password"
                  className="w-full h-12 rounded-xl border border-slate-200 bg-white px-4 text-slate-900 shadow-sm outline-none transition
                             focus:border-slate-300 focus:ring-2 focus:ring-slate-200"
                  placeholder="••••••••"
                />
              </div>

              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={() => setError("Wachtwoord vergeten is nog niet gekoppeld.")}
                  className="text-sm text-slate-600 hover:text-slate-900 underline underline-offset-4"
                >
                  Wachtwoord vergeten
                </button>

                <button
                  type="submit"
                  disabled={submitting}
                  className={cx(
                    "h-11 px-6 rounded-xl font-semibold text-white transition shadow-sm",
                    "bg-slate-900 hover:bg-slate-800",
                    "focus:outline-none focus:ring-2 focus:ring-slate-300",
                    submitting && "opacity-60 cursor-not-allowed"
                  )}
                >
                  {submitting ? "Bezig..." : "Inloggen"}
                </button>
              </div>

              {error && (
                <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
                  {error}
                </div>
              )}

              <div className="text-xs text-slate-500 pt-2">
                Gekozen omgeving:{" "}
                <span className="font-semibold text-slate-700">{active.label}</span>
              </div>
            </form>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 text-center text-xs text-slate-400">
          © {new Date().getFullYear()} Synergos
        </div>
      </div>
    </div>
  );
}