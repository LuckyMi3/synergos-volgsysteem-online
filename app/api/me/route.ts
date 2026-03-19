import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { getUserIdFromCookies } from "@/lib/auth";

export const runtime = "nodejs";

function fullName(u: any) {
  const parts = [u.voornaam, u.tussenvoegsel, u.achternaam].filter(Boolean);
  return parts.join(" ").trim();
}

export async function GET() {
  const c = await cookies();

  // tijdens impersonation is dit je effectieve user
  const actAsId = c.get("impersonate_user_id")?.value;

  // C2: echte login user id via signed session cookie
  const realId = await getUserIdFromCookies();

  const userId = actAsId || realId || null;
  if (!userId) {
    return NextResponse.json({ ok: false, user: null });
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      role: true,
      email: true,
      voornaam: true,
      tussenvoegsel: true,
      achternaam: true,

      // ✅ enrollments + cohort
      enrollments: {
        select: {
          id: true,
          createdAt: true,
          cohort: {
            select: {
              id: true,
              naam: true,
              traject: true,
              uitvoeringId: true,
              createdAt: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!user) {
    return NextResponse.json({ ok: false, user: null });
  }

  return NextResponse.json({
    ok: true,
    user: {
      id: user.id,
      role: String(user.role),
      name: fullName(user) || user.email || user.id,
      email: user.email,
      enrollments: user.enrollments,
    },
  });
}
