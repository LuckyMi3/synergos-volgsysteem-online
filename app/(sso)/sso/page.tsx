"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function SSOPageInner() {
  const router = useRouter();
  const sp = useSearchParams();
  const [msg, setMsg] = useState("Bezig met inloggen…");

  useEffect(() => {
    const token = sp.get("token");

    if (!token) {
      setMsg("Geen token in de URL. Open opnieuw vanuit Apollo.");
      return;
    }

    fetch("/api/sso/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    })
      .then(async (r) => ({ ok: r.ok, data: await r.json() }))
      .then(({ ok, data }) => {
        if (!ok || !data?.success) {
          setMsg(data?.error ? `Inloggen mislukt: ${data.error}` : "Inloggen mislukt.");
          return;
        }

        if (data.role === "STUDENT") router.replace("/student");
        else if (data.role === "TEACHER") router.replace("/docent");
        else setMsg("Deze rol mag niet via SSO inloggen.");
      })
      .catch(() => setMsg("Inloggen mislukt (network error)."));
  }, [router, sp]);

  return <p>{msg}</p>;
}

export default function SSOPage() {
  return (
    <Suspense fallback={<p>Bezig met inloggen…</p>}>
      <SSOPageInner />
    </Suspense>
  );
}