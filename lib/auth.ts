import crypto from "crypto";
import { cookies } from "next/headers";
import { prisma } from "./prisma";

/**
 * =========================
 * Signing helpers
 * =========================
 */

function hmac(value: string, secret: string) {
  return crypto.createHmac("sha256", secret).update(value).digest("hex");
}

function timingSafeEqualHex(a: string, b: string) {
  // Avoid throw on different lengths
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ba.length !== bb.length) return false;
  return crypto.timingSafeEqual(ba, bb);
}

function verifySignedToken(token: string, secret: string) {
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [payload, sig] = parts;
  const expected = hmac(payload, secret);
  if (!timingSafeEqualHex(sig, expected)) return null;
  return payload;
}

/**
 * =========================
 * Admin auth
 * =========================
 */

export function verifyAdminSession(token: string) {
  const SECRET = process.env.ADMIN_COOKIE_SECRET || "";
  if (!SECRET) return false;
  return !!verifySignedToken(token, SECRET);
}

export async function requireAdminAuth() {
  const c = await cookies();

  const isAdminCookie = c.get("synergos_is_admin")?.value === "1";
  const adminSession = c.get("synergos_admin_session")?.value || "";

  if (!isAdminCookie || !adminSession || !verifyAdminSession(adminSession)) {
    throw new Error("NOT_ADMIN");
  }

  // Optional: if you also have a real user session, fetch it (nice for audit)
  const realUserId = await getUserIdFromCookies();
  const realUser = realUserId ? await prisma.user.findUnique({ where: { id: realUserId } }) : null;

  const actAsUserId = c.get("impersonate_user_id")?.value || "";
  const actAsUser = actAsUserId ? await prisma.user.findUnique({ where: { id: actAsUserId } }) : null;

  return {
    realUser, // can be null in break-glass mode
    actAsUser,
    effectiveUser: actAsUser ?? realUser,
    isImpersonating: !!actAsUser,
  };
}

/**
 * =========================
 * User session (C2)
 * =========================
 */

function userSecret() {
  // We reuse ADMIN_COOKIE_SECRET if you don't want another env var for V1.
  return process.env.AUTH_COOKIE_SECRET || process.env.ADMIN_COOKIE_SECRET || "";
}

export function createUserSessionToken(userId: string) {
  const SECRET = userSecret();
  if (!SECRET) throw new Error("AUTH_NOT_CONFIGURED");
  const payload = `u:${userId}:${Date.now()}`;
  const sig = hmac(payload, SECRET);
  return `${payload}.${sig}`;
}

export function parseUserIdFromSessionToken(token: string) {
  const SECRET = userSecret();
  if (!SECRET) return null;
  const payload = verifySignedToken(token, SECRET);
  if (!payload) return null;

  // payload = u:<userId>:<ts>
  const parts = payload.split(":");
  if (parts.length < 3) return null;
  if (parts[0] !== "u") return null;
  return parts[1] || null;
}

export async function getUserIdFromCookies() {
  const c = await cookies();

  // Legacy (older builds): plain id
  const legacy = c.get("synergos_user_id")?.value;
  if (legacy) return legacy;

  // C2: signed session
  const session = c.get("synergos_user_session")?.value;
  if (!session) return null;
  return parseUserIdFromSessionToken(session);
}

export async function setUserSessionCookie(userId: string) {
  const token = createUserSessionToken(userId);
  const c = await cookies();
  c.set("synergos_user_session", token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
  });
}

export async function clearUserSessionCookie() {
  const c = await cookies();
  c.set("synergos_user_session", "", { path: "/", maxAge: 0 });
  c.set("synergos_user_id", "", { path: "/", maxAge: 0 }); // legacy
}

/**
 * =========================
 * Password hashing (no external deps)
 * =========================
 */

// Format: scrypt$<saltHex>$<hashHex>
export function hashPassword(password: string) {
  const salt = crypto.randomBytes(16);
  const hash = crypto.scryptSync(password, salt, 64);
  return `scrypt$${salt.toString("hex")}$${hash.toString("hex")}`;
}

export function verifyPassword(password: string, stored: string) {
  try {
    const [algo, saltHex, hashHex] = stored.split("$");
    if (algo !== "scrypt" || !saltHex || !hashHex) return false;
    const salt = Buffer.from(saltHex, "hex");
    const expected = Buffer.from(hashHex, "hex");
    const actual = crypto.scryptSync(password, salt, expected.length);
    if (actual.length !== expected.length) return false;
    return crypto.timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}
