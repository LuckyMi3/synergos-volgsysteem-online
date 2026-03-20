"use client";

import { useEffect, useState } from "react";

type Score = {
  themeId: string;
  questionId: string;
  score: number | null;
  comment: string | null;
};

type TeacherScore = {
  themeId: string;
  questionId: string;
  correctedScore: number | null;
  feedback: string | null;
};

type Assessment = {
  moment: string;
  assessmentId: string;
  scores: Score[];
  teacherScores: TeacherScore[];
};

export default function TeacherAssessmentPage({
  params,
}: {
  params: { id: string };
}) {
  const studentId = params.id;

  const [teacherId, setTeacherId] = useState<string | null>(null);
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [loading, setLoading] = useState(true);

  const rubricKey = "1VO";
  const moments = ["M1", "M2", "M3"];

  async function loadData() {
    setLoading(true);

    const me = await fetch("/api/me").then((r) => r.json());
    setTeacherId(me.id);

    for (const moment of moments) {
      await fetch("/api/assessments/ensure", {
        method: "POST",
        body: JSON.stringify({
          studentId,
          rubricKey,
          moment,
        }),
      });
    }

    const query = new URLSearchParams({
      studentId,
      rubricKey,
      teacherId: me.id,
      moments: moments.join(","),
    });

    const bundle = await fetch(`/api/assessments/bundle?${query}`);
    const data = await bundle.json();

    setAssessments(data.assessments ?? []);
    setLoading(false);
  }

  useEffect(() => {
    loadData();
  }, []);

  async function saveTeacherScore(
    assessmentId: string,
    themeId: string,
    questionId: string,
    correctedScore: number
  ) {
    if (!teacherId) return;

    await fetch("/api/teacher-scores", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        assessmentId,
        teacherId,
        themeId,
        questionId,
        correctedScore,
      }),
    });

    await loadData();
  }

  if (loading) {
    return (
      <div className="p-8 text-gray-600">
        Volgsysteem laden...
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-8 space-y-10">

      <h1 className="text-2xl font-bold">
        Volgsysteem beoordeling
      </h1>

      {assessments.map((assessment) => (
        <div
          key={assessment.assessmentId}
          className="border rounded-xl p-6 space-y-4"
        >
          <h2 className="text-xl font-semibold">
            Meetmoment {assessment.moment}
          </h2>

          {assessment.scores.map((score) => {
            const teacher = assessment.teacherScores.find(
              (t) =>
                t.themeId === score.themeId &&
                t.questionId === score.questionId
            );

            return (
              <div
                key={score.themeId + score.questionId}
                className="grid grid-cols-3 gap-4 items-center border-b pb-3"
              >
                <div>
                  <div className="text-sm text-gray-500">
                    Vraag
                  </div>
                  <div className="font-medium">
                    {score.themeId} / {score.questionId}
                  </div>
                </div>

                <div>
                  <div className="text-sm text-gray-500">
                    Student score
                  </div>
                  <div className="text-lg font-semibold">
                    {score.score ?? "-"}
                  </div>
                </div>

                <div>
                  <div className="text-sm text-gray-500">
                    Docent correctie
                  </div>

                  <input
                    type="number"
                    min={1}
                    max={10}
                    defaultValue={teacher?.correctedScore ?? ""}
                    className="border rounded px-2 py-1 w-20"
                    onBlur={(e) =>
                      saveTeacherScore(
                        assessment.assessmentId,
                        score.themeId,
                        score.questionId,
                        Number(e.target.value)
                      )
                    }
                  />
                </div>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}