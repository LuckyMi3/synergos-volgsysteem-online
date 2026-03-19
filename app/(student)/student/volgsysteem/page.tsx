import Link from "next/link";
import VolgsysteemClient from "./VolgsysteemClient";

export default function StudentVolgsysteemPage() {
  return (
    <main style={{ padding: 24, maxWidth: 1100, margin: "0 auto" }}>
      <div
        style={{
          marginBottom: 16,
          display: "flex",
          justifyContent: "flex-end",
        }}
      >
        <Link
          href="/student"
          style={{
            textDecoration: "none",
            color: "#111",
            borderBottom: "1px dashed #aaa",
            paddingBottom: 2,
          }}
        >
          ← Terug naar dashboard
        </Link>
      </div>

      <VolgsysteemClient />
    </main>
  );
}