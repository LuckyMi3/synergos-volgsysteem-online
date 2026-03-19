"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function StopImpersonationButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function stop() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/impersonate/stop", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        alert(data?.error || "Stop impersonation failed");
        return;
      }
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={stop}
      disabled={loading}
      style={{
        padding: "8px 12px",
        borderRadius: 12,
        border: "1px solid rgba(0,0,0,0.15)",
        background: "white",
        cursor: loading ? "not-allowed" : "pointer",
        fontWeight: 900,
      }}
      title="Stop impersonation"
    >
      {loading ? "..." : "Stop"}
    </button>
  );
}