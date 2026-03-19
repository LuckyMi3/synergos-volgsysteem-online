import ImpersonateButton from "../../_components/ImpersonateButton";
import SetPasswordCard from "../_components/SetPasswordCard";
import StudentDossierCard from "../_components/StudentDossierCard";
import { prisma } from "@/lib/prisma";

function fullName(u: any) {
  const parts = [u.voornaam, u.tussenvoegsel, u.achternaam].filter(Boolean);
  return parts.join(" ").trim() || u.email || u.id;
}

export default async function AdminUserDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      email: true,
      role: true,
      crmCustomerId: true,
      voornaam: true,
      tussenvoegsel: true,
      achternaam: true,
      mobiel: true,
      createdAt: true,

      // auth
      passwordHash: true,
    },
  });

  if (!user) {
    return <div>User niet gevonden.</div>;
  }

  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 12,
          alignItems: "baseline",
        }}
      >
        <div>
          <h2 style={{ marginTop: 0, marginBottom: 6 }}>{fullName(user)}</h2>
          <div style={{ fontSize: 12, color: "#666" }}>ID: {user.id}</div>
        </div>

        <ImpersonateButton userId={user.id} />
      </div>

      <div
        style={{
          marginTop: 12,
          border: "1px solid #eee",
          borderRadius: 12,
          padding: 12,
        }}
      >
        <Row label="Role" value={String(user.role)} />
        <Row label="Email" value={user.email || "—"} />
        <Row label="CRM customerId" value={user.crmCustomerId || "—"} />
        <Row label="Mobiel" value={user.mobiel || "—"} />
        <Row label="Voornaam" value={user.voornaam || "—"} />
        <Row label="Tussenvoegsel" value={user.tussenvoegsel || "—"} />
        <Row label="Achternaam" value={user.achternaam || "—"} />
        <Row label="Aangemaakt" value={new Date(user.createdAt).toLocaleString("nl-NL")} />
      </div>

      <SetPasswordCard userId={user.id} hasPassword={!!user.passwordHash} />

      {/* ✅ Dossier direct beschikbaar, geen "exacte URL" meer nodig */}
      <StudentDossierCard userId={user.id} />

      <div style={{ marginTop: 12 }}>
        <a href="/admin/users" style={{ textDecoration: "none", fontWeight: 800 }}>
          ← Terug naar users
        </a>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "180px 1fr",
        gap: 12,
        padding: "6px 0",
      }}
    >
      <div style={{ fontSize: 12, color: "#666" }}>{label}</div>
      <div style={{ fontWeight: 800 }}>{value}</div>
    </div>
  );
}
