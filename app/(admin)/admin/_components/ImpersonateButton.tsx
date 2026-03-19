"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function ImpersonateButton({ userId }: { userId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function start() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/impersonate/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        alert(data?.error || "Impersonate failed");
        return;
      }
      router.push("/");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={start}
      disabled={loading}
      style={{
        padding: "10px 14px",
        borderRadius: 12,
        border: "1px solid rgba(0,0,0,0.15)",
        background: "black",
        color: "white",
        cursor: loading ? "not-allowed" : "pointer",
        fontWeight: 800,
      }}
    >
      {loading ? "Start..." : "Meekijken als deze user"}
    </button>
  );
}