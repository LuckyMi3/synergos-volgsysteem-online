import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { setUserSessionCookie, verifyPassword } from "@/lib/auth";

export const runtime = "nodejs";

function sign(value: string, secret: string) {
  return crypto.createHmac("sha256", secret).update(value).digest("hex");
}

/**
 * Centrale login (V2):
 * - email + password (STUDENT/TEACHER/ADMIN)
 * - break-glass: alleen password == ADMIN_PASSWORD (optioneel)
 */
export async function POST(req: Request) {
  const c = await cookies();

  const body = await req.json().catch(() => ({}));
  const email = (body?.email ? String(body.email) : "").trim();
  const password = (body?.password ? String(body.password) : "").trim();

  // 1) Normale login: email + password
  if (email) {
    if (!password) {
      return NextResponse.json(
        { ok: false, error: "Password required" },
        { status: 400 }
      );
    }

    const user = await prisma.user.findFirst({
      where: {
        email: {
          equals: email,
          mode: "insensitive",
        },
      },
      select: {
        id: true,
        role: true,
        email: true,
        passwordHash: true,
      },
    });

    // Generic error: don't leak existence
    if (!user || !user.passwordHash) {
      return NextResponse.json(
        { ok: false, error: "Invalid credentials" },
        { status: 401 }
      );
    }

    const ok = verifyPassword(password, user.passwordHash);
    if (!ok) {
      return NextResponse.json(
        { ok: false, error: "Invalid credentials" },
        { status: 401 }
      );
    }

    // Set signed user session cookie
    await setUserSessionCookie(user.id);

    // If user is ADMIN, also set admin cookies so admin tools keep working
    if (String(user.role) === "ADMIN") {
      const SECRET =
        process.env.ADMIN_COOKIE_SECRET || process.env.AUTH_COOKIE_SECRET || "";
      if (SECRET) {
        const payload = `admin:${Date.now()}`;
        const sig = sign(payload, SECRET);
        const token = `${payload}.${sig}`;

        c.set("synergos_is_admin", "1", {
          httpOnly: false,
          sameSite: "lax",
          secure: process.env.NODE_ENV === "production",
          path: "/",
        });

        c.set("synergos_admin_session", token, {
          httpOnly: true,
          sameSite: "lax",
          secure: process.env.NODE_ENV === "production",
          path: "/",
        });
      }
    } else {
      // Not admin: clear any old admin cookies to avoid confusion
      c.set("synergos_is_admin", "", { path: "/", maxAge: 0 });
      c.set("synergos_admin_session", "", { path: "/", maxAge: 0 });
    }

    return NextResponse.json({
      ok: true,
      user: { id: user.id, role: String(user.role), email: user.email },
    });
  }

  // 2) Break-glass admin login (optional)
  const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "";
  const SECRET = process.env.ADMIN_COOKIE_SECRET || "";
  if (!ADMIN_PASSWORD || !SECRET) {
    return NextResponse.json(
      { ok: false, error: "Admin auth not configured (env missing)" },
      { status: 500 }
    );
  }

  if (!password || password !== ADMIN_PASSWORD) {
    return NextResponse.json({ ok: false, error: "Incorrect password" }, { status: 401 });
  }

  const payload = `admin:${Date.now()}`;
  const sig = sign(payload, SECRET);
  const token = `${payload}.${sig}`;

  c.set("synergos_is_admin", "1", {
    httpOnly: false,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
  });

  c.set("synergos_admin_session", token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
  });

  return NextResponse.json({ ok: true, breakGlass: true });
}
