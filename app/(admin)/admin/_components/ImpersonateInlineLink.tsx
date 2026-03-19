"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function ImpersonateInlineLink({
  userId,
  label = "meekijken",
  redirectTo = "/", // fallback only
  returnTo, // optional override
}: {
  userId: string;
  label?: string;
  redirectTo?: string;
  returnTo?: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function onClick(e: React.MouseEvent) {
    e.preventDefault();
    if (busy) return;

    setBusy(true);
    try {
      const res = await fetch("/api/admin/impersonate/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          returnTo: returnTo ?? `/admin/users/${userId}`,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        alert(data?.error || "Meekijken mislukt");
        return;
      }

      // ✅ prefer server-decided redirect based on target.role
      router.push(data?.redirectTo || redirectTo);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <a
      href="#"
      onClick={onClick}
      style={{
        fontSize: 12,
        fontWeight: 900,
        textDecoration: "none",
        opacity: busy ? 0.5 : 0.9,
        cursor: busy ? "not-allowed" : "pointer",
      }}
      title="Meekijken als deze user (impersonation)"
    >
      {busy ? "..." : label}
    </a>
  );
}