// app/admin/cohorts/page.tsx
import Link from "next/link";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function AdminCohortsPage() {
  const cohorts = await prisma.cohort.findMany({
    orderBy: [{ createdAt: "desc" }, { naam: "asc" }],
    include: {
      enrollments: {
        include: { user: { select: { role: true } } },
      },
    },
  });

  function studentCount(c: { enrollments: { user: { role: string } }[] }) {
    return c.enrollments.filter((e) => e.user.role === "STUDENT").length;
  }

  return (
    <div style={{ padding: 24 }}>
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          justifyContent: "space-between",
          gap: 12,
        }}
      >
        <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
          <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>
            Uitvoeringen
          </h1>
          <span style={{ opacity: 0.7 }}>({cohorts.length})</span>
        </div>

        <Link
          href="/admin/cohorts/import"
          style={{
            fontSize: 12,
            textDecoration: "none",
            border: "1px solid rgba(0,0,0,0.18)",
            padding: "8px 10px",
            borderRadius: 10,
            background: "white",
          }}
        >
          Import (Apollo) →
        </Link>
      </div>

      <p style={{ marginTop: 8, marginBottom: 16, opacity: 0.8 }}>
        Overzicht van uitvoeringen. Klik door voor detail.
      </p>

      <div
        style={{
          border: "1px solid rgba(0,0,0,0.12)",
          borderRadius: 12,
          overflow: "hidden",
        }}
      >
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "rgba(0,0,0,0.04)", textAlign: "left" }}>
              <th style={{ padding: 12 }}>Naam</th>
              <th style={{ padding: 12 }}>Uitvoering</th>
              <th style={{ padding: 12 }}>Traject</th>
              <th style={{ padding: 12 }}>Studenten</th>
              <th style={{ padding: 12 }}>Aangemaakt</th>
            </tr>
          </thead>
          <tbody>
            {cohorts.map((c) => (
              <tr
                key={c.id}
                style={{ borderTop: "1px solid rgba(0,0,0,0.08)" }}
              >
                <td style={{ padding: 12, fontWeight: 600 }}>
                  <Link
                    href={`/admin/cohorts/${c.id}`}
                    style={{ textDecoration: "none" }}
                  >
                    {c.naam}
                  </Link>
                </td>
                <td style={{ padding: 12, opacity: 0.85 }}>{c.uitvoeringId}</td>
                <td style={{ padding: 12, opacity: 0.85 }}>{c.traject}</td>
                <td style={{ padding: 12 }}>{studentCount(c)}</td>
                <td style={{ padding: 12, opacity: 0.75 }}>
                  {new Date(c.createdAt).toLocaleString("nl-NL")}
                </td>
              </tr>
            ))}
            {cohorts.length === 0 && (
              <tr>
                <td style={{ padding: 12, opacity: 0.7 }} colSpan={5}>
                  Geen uitvoeringen gevonden.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}