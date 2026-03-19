import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { PrismaClient, Role } from "@prisma/client";

const prisma = new PrismaClient();

export async function POST(req: NextRequest) {
  try {
    const { token } = await req.json();

    if (!token) {
      return NextResponse.json({ error: "No token provided" }, { status: 400 });
    }

    const secret = process.env.APOLLO_SSO_SECRET;
    if (!secret) {
      return NextResponse.json({ error: "Missing APOLLO_SSO_SECRET" }, { status: 500 });
    }

    // Apollo stuurt: CustomerId (string) en Role (number)
    const decoded = jwt.verify(token, secret) as {
      CustomerId: string;
      Role: number; // 1=student, 5=docent
    };

    // ✅ Alleen deze 2 rollen toestaan via SSO
    let mappedRole: Role;
    if (decoded.Role === 1) mappedRole = Role.STUDENT;
    else if (decoded.Role === 5) mappedRole = Role.TEACHER;
    else {
      return NextResponse.json({ error: "Role not allowed via SSO" }, { status: 403 });
    }

    const user = await prisma.user.findUnique({
      where: { crmCustomerId: decoded.CustomerId },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // ✅ (Aanrader) extra veiligheidsnet: DB-rol moet matchen
    if (user.role !== mappedRole) {
      return NextResponse.json(
        { error: "Role mismatch (DB role differs from SSO role)" },
        { status: 403 }
      );
    }

    const res = NextResponse.json({ success: true, role: user.role });

    const isProd = process.env.NODE_ENV === "production";
    res.cookies.set("sso_user", user.id, {
      httpOnly: true,
      secure: isProd,
      sameSite: "lax",
      path: "/",
    });

    return res;
  } catch {
    return NextResponse.json({ error: "Invalid or expired token" }, { status: 401 });
  }
}