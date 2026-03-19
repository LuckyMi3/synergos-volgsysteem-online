export default function AdminToolsPage() {
  return (
    <main style={{ padding: 24 }}>
      <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 8 }}>Tools</h1>
      <p style={{ color: "#555", marginBottom: 18 }}>
        Admin-hulpmiddelen voor imports, unlocks en onderhoud. (V1 placeholder)
      </p>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
          gap: 12,
        }}
      >
        <ToolCard
          title="Imports"
          desc="Studenten/docenten importeren en koppelen aan uitvoeringen."
          status="Coming soon"
        />
        <ToolCard
          title="Unlocks"
          desc="Beheeracties zoals: assessment unlocken, status resetten."
          status="Next"
        />
        <ToolCard
          title="Maintenance"
          desc="Opschonen testdata, checks, kleine reparaties."
          status="Coming soon"
        />
      </div>
    </main>
  );
}

function ToolCard({
  title,
  desc,
  status,
}: {
  title: string;
  desc: string;
  status: string;
}) {
  return (
    <div
      style={{
        border: "1px solid #e5e5e5",
        borderRadius: 12,
        padding: 16,
        background: "#fff",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>{title}</h2>
        <span
          style={{
            fontSize: 12,
            padding: "4px 8px",
            borderRadius: 999,
            border: "1px solid #ddd",
            color: "#444",
            background: "#fafafa",
            alignSelf: "flex-start",
          }}
        >
          {status}
        </span>
      </div>
      <p style={{ marginTop: 10, marginBottom: 0, color: "#555" }}>{desc}</p>
    </div>
  );
}