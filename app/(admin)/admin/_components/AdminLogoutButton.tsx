"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function AdminLogoutButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function logout() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/auth/logout", { method: "POST" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        alert(data?.error || "Logout failed");
        return;
      }
      router.push("/admin/login");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={logout}
      disabled={loading}
      style={{
        padding: "8px 12px",
        borderRadius: 12,
        border: "1px solid rgba(0,0,0,0.15)",
        background: "white",
        cursor: loading ? "not-allowed" : "pointer",
        fontWeight: 800,
      }}
      title="Uitloggen (admin)"
    >
      {loading ? "..." : "Uitloggen"}
    </button>
  );
}