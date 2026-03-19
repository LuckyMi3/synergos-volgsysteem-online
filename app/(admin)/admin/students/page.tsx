// app/admin/students/page.tsx
import Link from "next/link";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function AdminStudentsPage() {
  const students = await prisma.user.findMany({
    where: {
      OR: [
        // 1) Als je role goed staat
        { role: "STUDENT" as any },
        // 2) Als role (nog) niet klopt maar ze wel in cohorts zitten
        { enrollments: { some: {} } },
      ],
    },
    orderBy: [{ achternaam: "asc" }, { voornaam: "asc" }],
    include: {
      enrollments: {
        include: { cohort: true },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>Students</h1>
        <span style={{ opacity: 0.7 }}>({students.length})</span>
      </div>

      <p style={{ marginTop: 8, marginBottom: 16, opacity: 0.8 }}>
        Dit overzicht toont users met role <code>STUDENT</code> óf users met minimaal 1 enrollment.
        (Handig om import issues direct te zien.)
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
              <th style={{ padding: 12 }}>Email</th>
              <th style={{ padding: 12 }}>Role</th>
              <th style={{ padding: 12 }}>CRM</th>
              <th style={{ padding: 12 }}>Cohorts</th>
            </tr>
          </thead>

          <tbody>
            {students.map((u) => {
              const fullName = [u.voornaam, u.tussenvoegsel, u.achternaam]
                .filter(Boolean)
                .join(" ");

              const cohortLabels =
                u.enrollments?.slice(0, 2).map((e) => e.cohort?.naam || e.cohort?.uitvoeringId).filter(Boolean) ?? [];

              const moreCount = Math.max(0, (u.enrollments?.length ?? 0) - cohortLabels.length);

              return (
                <tr key={u.id} style={{ borderTop: "1px solid rgba(0,0,0,0.08)" }}>
                  <td style={{ padding: 12, fontWeight: 600 }}>
                    {/* Als je later user detail wil: /admin/users/[id] */}
                    <Link href={`/admin/users/${u.id}`} style={{ textDecoration: "none" }}>
                      {fullName || "(naam ontbreekt)"}
                    </Link>
                  </td>
                  <td style={{ padding: 12, opacity: 0.85 }}>{u.email || "-"}</td>
                  <td style={{ padding: 12, opacity: 0.85 }}>{(u as any).role ?? "-"}</td>
                  <td style={{ padding: 12, opacity: 0.85 }}>{(u as any).crmCustomerId ?? "-"}</td>
                  <td style={{ padding: 12 }}>
                    {cohortLabels.length > 0 ? (
                      <>
                        {cohortLabels.join(", ")}
                        {moreCount > 0 ? <span style={{ opacity: 0.7 }}> (+{moreCount})</span> : null}
                      </>
                    ) : (
                      <span style={{ opacity: 0.7 }}>—</span>
                    )}
                  </td>
                </tr>
              );
            })}

            {students.length === 0 && (
              <tr>
                <td style={{ padding: 12, opacity: 0.7 }} colSpan={5}>
                  Geen students gevonden op basis van role/enrollments.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div style={{ marginTop: 16, fontSize: 12, opacity: 0.7 }}>
        Als dit wél students toont: je import/DB is ok en je oude students page had een verkeerde query/endpoint/filter.
        Als dit nog steeds leeg is: dan kijk je naar een andere DB of je import heeft geen users/enrollments geschreven.
      </div>
    </div>
  );
}