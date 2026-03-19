import crypto from "crypto";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const SESSION_COOKIE = "synergos_session";

// 30 dagen
const SESSION_TTL_DAYS = 30;

function getSecret() {
  const secret = process.env.AUTH_COOKIE_SECRET || process.env.ADMIN_COOKIE_SECRET || "";
  if (!secret) {
    throw new Error("AUTH_NOT_CONFIGURED: set AUTH_COOKIE_SECRET (or ADMIN_COOKIE_SECRET) in .env");
  }
  return secret;
}

export function hashToken(rawToken: string) {
  const secret = getSecret();
  return crypto.createHmac("sha256", secret).update(rawToken).digest("hex");
}

export function newRawToken() {
  return crypto.randomBytes(32).toString("hex");
}

export async function createSession(userId: string) {
  const rawToken = newRawToken();
  const tokenHash = hashToken(rawToken);

  const expiresAt = new Date(Date.now() + SESSION_TTL_DAYS * 24 * 60 * 60 * 1000);

  await prisma.session.create({
    data: {
      tokenHash,
      userId,
      expiresAt,
    },
  });

  const jar = await cookies();
  jar.set(SESSION_COOKIE, rawToken, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  });

  return { rawToken, tokenHash, expiresAt };
}

export async function clearSessionCookie() {
  const jar = await cookies();
  jar.set(SESSION_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: new Date(0),
  });
}

async function getRealSessionUserId(): Promise<string | null> {
  const jar = await cookies();
  const rawToken = jar.get(SESSION_COOKIE)?.value?.trim();
  if (!rawToken) return null;

  const tokenHash = hashToken(rawToken);

  const session = await prisma.session.findUnique({
    where: { tokenHash },
    select: { userId: true, expiresAt: true },
  });

  if (!session) return null;

  if (session.expiresAt.getTime() < Date.now()) {
    await prisma.session.delete({ where: { tokenHash } }).catch(() => {});
    await clearSessionCookie();
    return null;
  }

  return session.userId;
}

/**
 * Effectieve user:
 * - tijdens impersonation: impersonate_user_id
 * - anders: echte sessiegebruiker
 */
export async function getSessionUserId(): Promise<string | null> {
  const jar = await cookies();
  const impersonatedUserId = jar.get("impersonate_user_id")?.value?.trim();

  if (impersonatedUserId) {
    return impersonatedUserId;
  }

  return getRealSessionUserId();
}

/**
 * Echte ingelogde user, los van impersonation.
 * Handig voor admin/audit later.
 */
export async function getRealUserId(): Promise<string | null> {
  return getRealSessionUserId();
}

export async function deleteSessionByCookie() {
  const jar = await cookies();
  const rawToken = jar.get(SESSION_COOKIE)?.value?.trim();
  if (!rawToken) {
    await clearSessionCookie();
    return;
  }

  const tokenHash = hashToken(rawToken);
  await prisma.session.delete({ where: { tokenHash } }).catch(() => {});
  await clearSessionCookie();
}