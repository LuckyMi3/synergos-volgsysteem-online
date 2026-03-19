"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function StopMeekijkenBannerClient({ label }: { label: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function stop() {
    if (busy) return;
    setBusy(true);

    try {
      const res = await fetch("/api/admin/impersonate/stop", { method: "POST" });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        alert(data?.error || "Stop meekijken mislukt");
        return;
      }

      router.push(data?.returnTo || "/admin/users");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      onClick={stop}
      role="button"
      tabIndex={0}
      style={{
        position: "sticky",
        top: 0,
        zIndex: 50,
        cursor: busy ? "not-allowed" : "pointer",
        borderBottom: "1px solid rgba(220,120,0,0.35)",
        background: "rgba(220,120,0,0.10)",
        padding: "10px 12px",
        fontWeight: 900,
        fontSize: 12,
        opacity: busy ? 0.6 : 1,
      }}
      title="Klik om meekijken te stoppen"
    >
      {busy ? "Stoppen..." : label}
    </div>
  );
}