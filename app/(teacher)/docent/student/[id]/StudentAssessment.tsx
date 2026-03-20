"use client";

import { useState } from "react";

const moments = ["M1", "M2", "M3"];

export default function StudentAssessment({
  studentId,
}: {
  studentId: string;
}) {
  const [moment, setMoment] = useState("M1");

  return (
    <section className="bg-white border rounded-xl p-6 shadow-sm space-y-6">

      {/* MOMENT SELECTOR */}
      <div className="flex gap-2">

        {moments.map((m) => (
          <button
            key={m}
            onClick={() => setMoment(m)}
            className={`px-4 py-2 rounded-lg border ${
              moment === m
                ? "bg-blue-600 text-white"
                : "bg-gray-100"
            }`}
          >
            {m}
          </button>
        ))}

      </div>

      {/* ALGEMENE FEEDBACK */}

      <div className="space-y-2">

        <div className="font-semibold">
          Algemene feedback
        </div>

        <textarea
          className="w-full border rounded-lg p-3"
          rows={4}
          placeholder="Algemene feedback van docent..."
        />

      </div>

      {/* VRAGEN */}

      <div className="space-y-6">

        {[1,2,3,4,5].map((q) => (
          <div
            key={q}
            className="border rounded-lg p-4 space-y-3"
          >

            <div className="font-medium">
              Vraag {q}
            </div>

            <div className="flex gap-4 items-center">

              <div className="text-sm text-gray-500">
                Studentscore: 7
              </div>

              <select className="border rounded p-1">
                {[1,2,3,4,5,6,7,8,9,10].map((n)=>(
                  <option key={n}>{n}</option>
                ))}
              </select>

            </div>

            <textarea
              className="w-full border rounded-lg p-2"
              rows={2}
              placeholder="Extra feedback..."
            />

          </div>
        ))}

      </div>

      {/* PUBLICEREN */}

      <div className="flex justify-end">

        <button className="px-4 py-2 bg-green-600 text-white rounded-lg">
          Publiceren
        </button>

      </div>

    </section>
  );
}