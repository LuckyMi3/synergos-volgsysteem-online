import prisma from "@/lib/prisma";
import { notFound } from "next/navigation";
import StudentAssessment from "./StudentAssessment";

type Props = {
  params: { id: string };
};

export default async function StudentPage({ params }: Props) {
  const student = await prisma.user.findUnique({
    where: { id: params.id },
    include: {
      enrollments: {
        include: {
          cohort: true,
        },
      },
    },
  });

  if (!student) return notFound();

  return (
    <div className="max-w-6xl mx-auto p-8 space-y-8">

      {/* HEADER */}
      <section className="bg-white border rounded-xl p-6 shadow-sm">
        <div className="flex flex-col gap-2">

          <h1 className="text-2xl font-bold">
            {student.name ?? "Onbekende student"}
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

      {/* VOLGSYSTEEM */}
      <StudentAssessment
        studentId={student.id}
      />

    </div>
  );
}