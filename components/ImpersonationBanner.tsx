import { cookies } from "next/headers";
import StopBannerClient from "./StopBannerClient";
import { prisma } from "@/lib/prisma";

function fullName(u: any) {
  const parts = [u.voornaam, u.tussenvoegsel, u.achternaam].filter(Boolean);
  return parts.join(" ").trim() || u.email || u.id;
}

export default async function ImpersonationBanner() {
  const c = await cookies();

  const isAdmin =
    c.get("synergos_is_admin")?.value === "1" &&
    !!c.get("synergos_admin_session")?.value;

  if (!isAdmin) return null;

  const actAsUserId = c.get("impersonate_user_id")?.value;
  if (!actAsUserId) return null;

  const user = await prisma.user.findUnique({
    where: { id: actAsUserId },
    select: {
      id: true,
      role: true,
      voornaam: true,
      tussenvoegsel: true,
      achternaam: true,
      email: true,
    },
  });

  if (!user) return null;

  return (
    <StopBannerClient
      label={`MEEKIJKEN: ${fullName(user)} (${String(user.role)}) — klik om te stoppen`}
    />
  );
}
