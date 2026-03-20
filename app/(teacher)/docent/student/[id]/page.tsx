import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
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
    normalizedNames.some((name) => patterns.some((pattern) => name.includes(pattern)));

  if (hasMatch(["3vo", "jaar3", "leerjaar3", "derdejaar"])) {
    return "3vo";
  }

  if (hasMatch(["2vo", "jaar2", "leerjaar2", "tweedejaar"])) {
    return "2vo";
  }

  if (hasMatch(["1vo", "jaar1", "leerjaar1", "eerstejaar"])) {
    return "1vo";
  }

  if (hasMatch(["basisjaar", "basis"])) {
    return "basisjaar";
  }

  return "1vo";
}

export default async function StudentPage({ params }: Props) {
  const { id } = await params;

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

  const cohortNames = student.enrollments.map((e) => e.cohort.naam);
  const rubricKey = getRubricKeyFromCohortNames(cohortNames);

  return (
    <div className="max-w-6xl mx-auto p-8 space-y-8">
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

      <StudentAssessment studentId={student.id} rubricKey={rubricKey} />
    </div>
  );
}