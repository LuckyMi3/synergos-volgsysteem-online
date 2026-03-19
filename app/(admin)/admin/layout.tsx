import type { ReactNode } from "react";
import Link from "next/link";
import { cookies } from "next/headers";

import AdminNav from "./AdminNav";
import AdminLogoutButton from "./_components/AdminLogoutButton";
import StopImpersonationButton from "./_components/StopImpersonationButton";

import { prisma } from "@/lib/prisma";

function fullName(u: any) {
  const parts = [u.voornaam, u.tussenvoegsel, u.achternaam].filter(Boolean);
  return parts.join(" ").trim() || u.email || u.id;
}

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const c = await cookies();

  const isAdmin =
    c.get("synergos_is_admin")?.value === "1" &&
    !!c.get("synergos_admin_session")?.value;

  if (!isAdmin) {
    return (
      <main style={{ padding: 24, maxWidth: 720, margin: "0 auto" }}>
        <h1 style={{ marginTop: 0 }}>Geen toegang</h1>
        <p style={{ color: "#666" }}>
          Je hebt geen admin-rechten (admin cookie ontbreekt).
        </p>
        <Link href="/login" style={{ fontWeight: 900, textDecoration: "none" }}>
          ← Naar login
        </Link>
      </main>
    );
  }

  const actAsUserId = c.get("impersonate_user_id")?.value || "";

  const actAsUser = actAsUserId
    ? await prisma.user.findUnique({
        where: { id: actAsUserId },
        select: {
          id: true,
          email: true,
          role: true,
          voornaam: true,
          tussenvoegsel: true,
          achternaam: true,
        },
      })
    : null;

  const isImpersonating = !!actAsUser;

  return (
    <div style={{ padding: 24, maxWidth: 1100, margin: "0 auto" }}>
      <div
        style={{
          display: "flex",
          gap: 10,
          alignItems: "baseline",
          justifyContent: "space-between",
          marginBottom: 10,
        }}
      >
        <div style={{ display: "flex", gap: 10, alignItems: "baseline" }}>
          <h1 style={{ fontSize: 24, margin: 0 }}>Admin</h1>
          <div style={{ fontSize: 12, color: "#666" }}>v2.1</div>
        </div>

        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          {isImpersonating && <StopImpersonationButton />}
          <AdminLogoutButton />
        </div>
      </div>

      {isImpersonating && (
        <div
          style={{
            marginBottom: 12,
            padding: "10px 12px",
            borderRadius: 12,
            border: "1px solid rgba(220,120,0,0.35)",
            background: "rgba(220,120,0,0.08)",
            display: "flex",
            justifyContent: "space-between",
            gap: 12,
            alignItems: "center",
          }}
        >
          <div style={{ fontWeight: 900 }}>
            IMPERSONATING:{" "}
            <span style={{ fontWeight: 900 }}>
              {fullName(actAsUser)}{" "}
              <span style={{ fontWeight: 700, opacity: 0.75 }}>
                ({String(actAsUser?.role)})
              </span>
            </span>
          </div>

          <div style={{ fontSize: 12, opacity: 0.75 }}>
            Klik <b>Stop</b> om terug te gaan naar admin-context.
          </div>
        </div>
      )}

      <AdminNav />

      <div
        style={{
          border: "1px solid #eee",
          borderRadius: 12,
          padding: 16,
          background: "#fff",
        }}
      >
        {children}
      </div>
    </div>
  );
}
