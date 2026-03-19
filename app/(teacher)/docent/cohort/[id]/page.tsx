import Link from "next/link";
import { notFound } from "next/navigation";
import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getSessionUserId } from "@/lib/auth/session";

export const runtime = "nodejs";

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

function fullName(user: {
  voornaam: string;
  tussenvoegsel: string | null;
  achternaam: string;
}) {
  return [user.voornaam, user.tussenvoegsel, user.achternaam]
    .filter(Boolean)
    .join(" ")
    .trim();
}

export default async function DocentCohortPage({ params }: PageProps) {
  const { id: cohortId } = await params;

  const meId = await getSessionUserId();

  if (!meId) {
    return (
      <main style={{ padding: 24 }}>
        <h1 style={{ fontSize: 28, marginBottom: 12 }}>Cohort</h1>
        <p>Je bent niet ingelogd.</p>
      </main>
    );
  }

  const me = await prisma.user.findUnique({
    where: { id: meId },
    select: {
      id: true,
      role: true,
      voornaam: true,
      tussenvoegsel: true,
      achternaam: true,
      email: true,
    },
  });

  if (!me) {
    return (
      <main style={{ padding: 24 }}>
        <h1 style={{ fontSize: 28, marginBottom: 12 }}>Cohort</h1>
        <p>Gebruiker niet gevonden.</p>
      </main>
    );
  }

  if (me.role !== Role.TEACHER && me.role !== Role.ADMIN) {
    return (
      <main style={{ padding: 24 }}>
        <h1 style={{ fontSize: 28, marginBottom: 12 }}>Geen toegang</h1>
        <p>Alleen docenten en admins kunnen deze pagina bekijken.</p>
      </main>
    );
  }

  const cohort = await prisma.cohort.findUnique({
    where: { id: cohortId },
    select: {
      id: true,
      naam: true,
      traject: true,
      uitvoeringId: true,
      createdAt: true,
    },
  });

  if (!cohort) {
    notFound();
  }

  if (me.role !== Role.ADMIN) {
    const teacherEnrollment = await prisma.enrollment.findUnique({
      where: {
        userId_cohortId: {
          userId: me.id,
          cohortId: cohort.id,
        },
      },
      select: { id: true },
    });

    if (!teacherEnrollment) {
      return (
        <main style={{ padding: 24 }}>
          <h1 style={{ fontSize: 28, marginBottom: 12 }}>Geen toegang</h1>
          <p>Je bent niet gekoppeld aan dit cohort.</p>

          <div style={{ marginTop: 20 }}>
            <Link
              href="/docent"
              style={{
                display: "inline-block",
                padding: "10px 14px",
                borderRadius: 10,
                border: "1px solid #d1d5db",
                textDecoration: "none",
                color: "#111827",
                background: "#ffffff",
              }}
            >
              ← Terug naar docent dashboard
            </Link>
          </div>
        </main>
      );
    }
  }

  const enrollments = await prisma.enrollment.findMany({
    where: {
      cohortId: cohort.id,
      user: {
        role: Role.STUDENT,
      },
    },
    select: {
      id: true,
      createdAt: true,
      coachNaam: true,
      trajectStatus: true,
      assessmentLocked: true,
      user: {
        select: {
          id: true,
          voornaam: true,
          tussenvoegsel: true,
          achternaam: true,
          email: true,
          createdAt: true,
        },
      },
    },
    orderBy: [
      { user: { achternaam: "asc" } },
      { user: { voornaam: "asc" } },
    ],
  });

  return (
    <main style={{ padding: 24, maxWidth: 1000, margin: "0 auto" }}>
      <div style={{ marginBottom: 20 }}>
        <Link
          href="/docent"
          style={{
            display: "inline-block",
            marginBottom: 16,
            textDecoration: "none",
            color: "#374151",
          }}
        >
          ← Terug naar docent dashboard
        </Link>

        <h1 style={{ fontSize: 32, fontWeight: 700, margin: 0 }}>{cohort.naam}</h1>

        <div
          style={{
            display: "flex",
            gap: 12,
            flexWrap: "wrap",
            marginTop: 12,
          }}
        >
          <span
            style={{
              padding: "6px 10px",
              borderRadius: 999,
              background: "#f3f4f6",
              border: "1px solid #e5e7eb",
              fontSize: 14,
            }}
          >
            Uitvoering: {cohort.uitvoeringId}
          </span>

          {cohort.traject ? (
            <span
              style={{
                padding: "6px 10px",
                borderRadius: 999,
                background: "#f3f4f6",
                border: "1px solid #e5e7eb",
                fontSize: 14,
              }}
            >
              Traject: {cohort.traject}
            </span>
          ) : null}

          <span
            style={{
              padding: "6px 10px",
              borderRadius: 999,
              background: "#f3f4f6",
              border: "1px solid #e5e7eb",
              fontSize: 14,
            }}
          >
            Studenten: {enrollments.length}
          </span>
        </div>
      </div>

      {enrollments.length === 0 ? (
        <section
          style={{
            border: "1px solid #e5e7eb",
            borderRadius: 16,
            padding: 20,
            background: "#ffffff",
          }}
        >
          <p style={{ margin: 0 }}>Er zijn nog geen studenten gekoppeld aan dit cohort.</p>
        </section>
      ) : (
        <section
          style={{
            display: "grid",
            gap: 12,
          }}
        >
          {enrollments.map((enrollment) => {
            const student = enrollment.user;
            const name = fullName(student);

            return (
              <Link
                key={student.id}
                href={`/docent/student/${student.id}`}
                style={{
                  display: "block",
                  textDecoration: "none",
                  color: "inherit",
                }}
              >
                <article
                  style={{
                    border: "1px solid #e5e7eb",
                    borderRadius: 16,
                    padding: 18,
                    background: "#ffffff",
                    transition: "transform 120ms ease, box-shadow 120ms ease",
                    boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      gap: 16,
                      flexWrap: "wrap",
                    }}
                  >
                    <div>
                      <h2
                        style={{
                          margin: 0,
                          fontSize: 20,
                          fontWeight: 700,
                          color: "#111827",
                        }}
                      >
                        {name}
                      </h2>

                      <p
                        style={{
                          margin: "6px 0 0 0",
                          color: "#6b7280",
                          fontSize: 14,
                        }}
                      >
                        {student.email}
                      </p>
                    </div>

                    <div
                      style={{
                        padding: "8px 12px",
                        borderRadius: 10,
                        border: "1px solid #d1d5db",
                        background: "#f9fafb",
                        fontSize: 14,
                        fontWeight: 600,
                        color: "#111827",
                        whiteSpace: "nowrap",
                      }}
                    >
                      Open student →
                    </div>
                  </div>

                  <div
                    style={{
                      display: "flex",
                      gap: 10,
                      flexWrap: "wrap",
                      marginTop: 14,
                    }}
                  >
                    {enrollment.coachNaam ? (
                      <span
                        style={{
                          padding: "6px 10px",
                          borderRadius: 999,
                          background: "#eff6ff",
                          border: "1px solid #bfdbfe",
                          fontSize: 13,
                          color: "#1d4ed8",
                        }}
                      >
                        Coach: {enrollment.coachNaam}
                      </span>
                    ) : null}

                    {enrollment.trajectStatus ? (
                      <span
                        style={{
                          padding: "6px 10px",
                          borderRadius: 999,
                          background: "#f9fafb",
                          border: "1px solid #e5e7eb",
                          fontSize: 13,
                          color: "#374151",
                        }}
                      >
                        Status: {enrollment.trajectStatus}
                      </span>
                    ) : null}

                    {enrollment.assessmentLocked ? (
                      <span
                        style={{
                          padding: "6px 10px",
                          borderRadius: 999,
                          background: "#fff7ed",
                          border: "1px solid #fdba74",
                          fontSize: 13,
                          color: "#9a3412",
                        }}
                      >
                        Volgsysteem vergrendeld
                      </span>
                    ) : (
                      <span
                        style={{
                          padding: "6px 10px",
                          borderRadius: 999,
                          background: "#ecfdf5",
                          border: "1px solid #86efac",
                          fontSize: 13,
                          color: "#166534",
                        }}
                      >
                        Volgsysteem beschikbaar
                      </span>
                    )}
                  </div>
                </article>
              </Link>
            );
          })}
        </section>
      )}
    </main>
  );
}