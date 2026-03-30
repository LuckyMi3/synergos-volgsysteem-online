import { prisma } from "@/lib/prisma";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { Role } from "@prisma/client";
import { getSessionUserId } from "@/lib/auth/session";
import StudentAssessment from "./StudentAssessment";

type Props = {
  params: Promise<{ id: string }>;
};

function fullName(student: {
  voornaam: string;
  tussenvoegsel: string | null;
  achternaam: string;
}) {
  return [student.voornaam, student.tussenvoegsel, student.achternaam]
    .filter(Boolean)
    .join(" ")
    .trim();
}

function normalizeText(value: string) {
  return value.toLowerCase().replace(/\s+/g, "");
}

function getRubricKeyFromCohortNames(cohortNames: string[]): string {
  const normalizedNames = cohortNames.map(normalizeText);

  const hasMatch = (patterns: string[]) =>
    normalizedNames.some((name) =>
      patterns.some((pattern) => name.includes(pattern))
    );

  if (hasMatch(["3vo", "jaar3", "leerjaar3"])) return "3vo";
  if (hasMatch(["2vo", "jaar2", "leerjaar2"])) return "2vo";
  if (hasMatch(["1vo", "jaar1", "leerjaar1"])) return "1vo";
  if (hasMatch(["basisjaar", "basis"])) return "basisjaar";

  return "1vo";
}

export default async function StudentPage({ params }: Props) {
  const { id } = await params;

  const meId = await getSessionUserId();
  if (!meId) {
    redirect("/login");
  }

  const me = await prisma.user.findUnique({
    where: { id: meId },
    select: {
      id: true,
      role: true,
    },
  });

  if (!me) {
    redirect("/login");
  }

  if (me.role !== Role.TEACHER && me.role !== Role.ADMIN) {
    redirect("/login");
  }

  const student = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      email: true,
      voornaam: true,
      tussenvoegsel: true,
      achternaam: true,
      enrollments: {
        select: {
          id: true,
          cohortId: true,
          cohort: {
            select: {
              id: true,
              naam: true,
            },
          },
        },
      },
    },
  });

  if (!student) return notFound();

  if (me.role !== Role.ADMIN) {
    const studentCohortIds = student.enrollments.map((e) => e.cohortId);

    const teacherEnrollment = await prisma.enrollment.findFirst({
      where: {
        userId: me.id,
        cohortId: {
          in: studentCohortIds.length ? studentCohortIds : ["__none__"],
        },
      },
      select: { id: true },
    });

    if (!teacherEnrollment) {
      return (
        <main style={{ padding: 24 }}>
          <h1 style={{ fontSize: 28, marginBottom: 12 }}>Geen toegang</h1>
          <p>Je bent niet gekoppeld aan een cohort van deze student.</p>

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

  const cohortNames = student.enrollments.map((e) => e.cohort.naam);
  const rubricKey = getRubricKeyFromCohortNames(cohortNames);

  return (
    <div className="max-w-6xl mx-auto p-8 space-y-6">
      <div>
        <Link
          href="/docent"
          className="text-sm text-blue-600 hover:text-blue-800 font-medium"
        >
          ← Terug naar overzicht
        </Link>
      </div>

      <section className="bg-white border rounded-xl p-6 shadow-sm">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-bold">
            {fullName(student) || "Onbekende student"}
          </h1>

          <div className="flex flex-wrap gap-2 mt-2">
            {student.enrollments.map((e) => (
              <span
                key={e.id}
                className="px-3 py-1 text-sm bg-blue-100 text-blue-800 rounded-full"
              >
                {e.cohort.naam}
              </span>
            ))}
          </div>
        </div>
      </section>

      <StudentAssessment
        studentId={student.id}
        rubricKey={rubricKey}
        teacherId={me.id}
      />
    </div>
  );
}