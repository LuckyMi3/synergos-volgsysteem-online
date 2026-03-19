import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSessionUserId } from "@/lib/auth/session";

function fullName(u: any) {
  const parts = [u.voornaam, u.tussenvoegsel, u.achternaam].filter(Boolean);
  return parts.join(" ").trim();
}

export default async function DocentDashboardPage() {
  const userId = await getSessionUserId();

  if (!userId) {
    redirect("/login");
  }

  const teacher = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      voornaam: true,
      tussenvoegsel: true,
      achternaam: true,
      enrollments: {
        select: {
          cohort: {
            select: {
              id: true,
              naam: true,
              traject: true,
              _count: {
                select: {
                  enrollments: true,
                },
              },
            },
          },
        },
      },
    },
  });

  if (!teacher) {
    redirect("/login");
  }

  const cohorts =
    teacher.enrollments?.map((e) => e.cohort).filter(Boolean) ?? [];

  return (
    <div style={{ padding: 32 }}>
      <h1>Docentdashboard</h1>

      <p style={{ color: "#666" }}>
        Welkom, {fullName(teacher)}
      </p>

      <div style={{ marginTop: 30 }}>
        <h2>Mijn groepen</h2>

        {cohorts.length === 0 && (
          <div style={{ color: "#999" }}>Geen groepen gekoppeld.</div>
        )}

        {cohorts.map((c) => (
          <div
            key={c.id}
            style={{
              border: "1px solid #e5e7eb",
              borderRadius: 12,
              padding: 16,
              marginBottom: 10,
              background: "white",
            }}
          >
            <div style={{ fontWeight: 700 }}>
              {c.naam}
            </div>

            <div style={{ fontSize: 13, color: "#666" }}>
              {c.traject}
            </div>

            <div style={{ fontSize: 13 }}>
              {c._count.enrollments} deelnemers
            </div>

            <div style={{ marginTop: 8 }}>
              <Link href={`/docent/cohort/${c.id}`}>
                Open groep
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}