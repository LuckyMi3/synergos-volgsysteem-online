import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSessionUserId } from "@/lib/auth/session";

function fullName(u: {
  voornaam: string | null;
  tussenvoegsel: string | null;
  achternaam: string | null;
  email?: string | null;
}) {
  const parts = [u.voornaam, u.tussenvoegsel, u.achternaam].filter(Boolean);
  return parts.join(" ").trim() || u.email || "Docent";
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
      email: true,
      voornaam: true,
      tussenvoegsel: true,
      achternaam: true,
      role: true,
    },
  });

  if (!teacher) {
    redirect("/login");
  }

  return (
    <div style={{ padding: 32 }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ margin: 0, fontSize: 32 }}>Docentdashboard</h1>
        <p style={{ marginTop: 8, color: "#666" }}>
          Welkom, {fullName(teacher)}
        </p>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
          gap: 16,
          marginBottom: 24,
        }}
      >
        <div style={cardStyle}>
          <div style={cardLabel}>Mijn groepen</div>
          <div style={cardValue}>0</div>
        </div>

        <div style={cardStyle}>
          <div style={cardLabel}>Studenten</div>
          <div style={cardValue}>0</div>
        </div>

        <div style={cardStyle}>
          <div style={cardLabel}>Open acties</div>
          <div style={cardValue}>0</div>
        </div>

        <div style={cardStyle}>
          <div style={cardLabel}>Recente updates</div>
          <div style={cardValue}>0</div>
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "2fr 1fr",
          gap: 16,
        }}
      >
        <section style={panelStyle}>
          <h2 style={sectionTitle}>Mijn groepen</h2>
          <p style={mutedText}>
            Hier komt straks het overzicht van de cohorts/groepen waar deze docent aan gekoppeld is.
          </p>

          <div style={emptyStateStyle}>
            Nog geen groepen zichtbaar in deze eerste versie.
          </div>
        </section>

        <section style={panelStyle}>
          <h2 style={sectionTitle}>Snelle acties</h2>

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <Link href="/docent" style={actionLinkStyle}>
              Dashboard verversen
            </Link>
            <Link href="/login" style={actionLinkStyle}>
              Terug naar login
            </Link>
          </div>
        </section>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 16,
          marginTop: 16,
        }}
      >
        <section style={panelStyle}>
          <h2 style={sectionTitle}>Open acties</h2>
          <div style={emptyStateStyle}>
            Hier komen straks open beoordelingen en nieuwe studentinvoer.
          </div>
        </section>

        <section style={panelStyle}>
          <h2 style={sectionTitle}>Studenten die aandacht vragen</h2>
          <div style={emptyStateStyle}>
            Hier komt straks een shortlist met relevante studenten.
          </div>
        </section>
      </div>
    </div>
  );
}

const cardStyle: React.CSSProperties = {
  border: "1px solid #e5e7eb",
  borderRadius: 16,
  padding: 18,
  background: "white",
};

const cardLabel: React.CSSProperties = {
  fontSize: 13,
  color: "#666",
  marginBottom: 8,
};

const cardValue: React.CSSProperties = {
  fontSize: 28,
  fontWeight: 700,
  color: "#111",
};

const panelStyle: React.CSSProperties = {
  border: "1px solid #e5e7eb",
  borderRadius: 16,
  padding: 20,
  background: "white",
};

const sectionTitle: React.CSSProperties = {
  marginTop: 0,
  marginBottom: 12,
  fontSize: 20,
};

const mutedText: React.CSSProperties = {
  color: "#666",
  marginTop: 0,
};

const emptyStateStyle: React.CSSProperties = {
  border: "1px dashed #d1d5db",
  borderRadius: 12,
  padding: 16,
  color: "#666",
  background: "#fafafa",
};

const actionLinkStyle: React.CSSProperties = {
  display: "inline-block",
  padding: "10px 12px",
  border: "1px solid #e5e7eb",
  borderRadius: 10,
  textDecoration: "none",
  color: "#111",
  background: "white",
};