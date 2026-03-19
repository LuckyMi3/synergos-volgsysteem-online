"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

type Role = "STUDENT" | "TEACHER" | "ADMIN";

type CohortPayload = {
  id: string;
  uitvoeringId: string;
  naam: string;
  traject: string | null;
  enrollments: Array<{
    id: string;
    trajectStatus: string | null;
    coachNaam: string | null;
    user: {
      id: string;
      crmCustomerId: string;
      voornaam: string;
      tussenvoegsel: string | null;
      achternaam: string;
      email: string;
      mobiel: string | null;
      role: Role;
    };
  }>;
};

function fullName(u: CohortPayload["enrollments"][number]["user"]) {
  return [u.voornaam, u.tussenvoegsel, u.achternaam].filter(Boolean).join(" ");
}

export default function AdminPage() {
  const [data, setData] = useState<CohortPayload[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCohortId, setSelectedCohortId] = useState<string>("");

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      const res = await fetch("/api/admin/cohorts", { cache: "no-store" });
      const json = (await res.json()) as CohortPayload[];
      if (!alive) return;

      setData(Array.isArray(json) ? json : []);
      setSelectedCohortId((Array.isArray(json) && json?.[0]?.id) ? json[0].id : "");
      setLoading(false);
    })();
    return () => {
      alive = false;
    };
  }, []);

  const selected = useMemo(
    () => data.find((c) => c.id === selectedCohortId) ?? null,
    [data, selectedCohortId]
  );

  const students = useMemo(() => {
    if (!selected) return [];
    return selected.enrollments
      .filter((e) => e.user.role === "STUDENT")
      .map((e) => ({
        enrollmentId: e.id,
        trajectStatus: e.trajectStatus,
        coachNaam: e.coachNaam,
        ...e.user,
        naam: fullName(e.user),
      }))
      .sort((a, b) => a.achternaam.localeCompare(b.achternaam, "nl"));
  }, [selected]);

  return (
    <main style={{ padding: 24, maxWidth: 1100, margin: "0 auto" }}>
      <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 12 }}>
        Admin (V1.1)
      </h1>

      {loading ? (
        <p>Bezig met laden…</p>
      ) : (
        <>
          <section
            style={{
              display: "flex",
              gap: 12,
              alignItems: "center",
              marginBottom: 16,
              flexWrap: "wrap",
            }}
          >
            <label style={{ fontWeight: 600 }}>Uitvoering:</label>
            <select
              value={selectedCohortId}
              onChange={(e) => setSelectedCohortId(e.target.value)}
              style={{
                padding: "8px 10px",
                borderRadius: 8,
                border: "1px solid #ddd",
                minWidth: 360,
              }}
            >
              {data.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.naam} ({c.uitvoeringId})
                </option>
              ))}
            </select>

            {selected?.traject ? (
              <span style={{ color: "#555" }}>Traject: {selected.traject}</span>
            ) : null}

            <span style={{ marginLeft: "auto", color: "#555" }}>
              Studenten: {students.length}
            </span>
          </section>

          <section
            style={{
              border: "1px solid #eee",
              borderRadius: 12,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "2fr 2fr 1.2fr 1.2fr 1fr",
                gap: 0,
                background: "#fafafa",
                padding: 12,
                fontWeight: 700,
                borderBottom: "1px solid #eee",
              }}
            >
              <div>Naam</div>
              <div>Email</div>
              <div>Coach</div>
              <div>Traject status</div>
              <div>CRM ID</div>
            </div>

            {students.map((s) => (
              <div
                key={s.enrollmentId}
                style={{
                  display: "grid",
                  gridTemplateColumns: "2fr 2fr 1.2fr 1.2fr 1fr",
                  padding: 12,
                  borderBottom: "1px solid #f1f1f1",
                }}
              >
                <div style={{ fontWeight: 600 }}>
                  <Link
                    href={`/admin/users/${s.id}`}
                    style={{ textDecoration: "none", color: "inherit" }}
                    title="Open gebruiker"
                  >
                    {s.naam}
                  </Link>
                </div>
                <div style={{ color: "#333" }}>{s.email}</div>
                <div style={{ color: "#333" }}>{s.coachNaam ?? "-"}</div>
                <div style={{ color: "#333" }}>{s.trajectStatus ?? "-"}</div>
                <div style={{ color: "#666", fontFamily: "monospace" }}>
                  {s.crmCustomerId}
                </div>
              </div>
            ))}

            {students.length === 0 ? (
              <div style={{ padding: 12, color: "#666" }}>
                Geen studenten gevonden in deze uitvoering.
              </div>
            ) : null}
          </section>
        </>
      )}
    </main>
  );
}