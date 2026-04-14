import crypto from "node:crypto";

import { cookies } from "next/headers";

const COOKIE_NAME = "tda_super_admin";
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 7;

function getPassword() {
  return process.env.SUPER_ADMIN_PASSWORD || "";
}

function getSessionSecret() {
  return process.env.SUPER_ADMIN_SESSION_SECRET || process.env.OPENCLAW_GATEWAY_TOKEN || "";
}

function sign(value: string) {
  return crypto.createHmac("sha256", getSessionSecret()).update(value).digest("hex");
}

export function isSuperAdminConfigured() {
  return Boolean(getPassword() && getSessionSecret());
}

export function verifySuperAdminPassword(password: string) {
  if (!isSuperAdminConfigured()) return false;
  const expected = Buffer.from(getPassword());
  const actual = Buffer.from(password);
  if (expected.length !== actual.length) return false;
  return crypto.timingSafeEqual(actual, expected);
}

export function createSuperAdminSessionToken() {
  const issuedAt = Date.now().toString();
  const payload = `super-admin:${issuedAt}`;
  return `${payload}.${sign(payload)}`;
}

export function verifySuperAdminSessionToken(token: string | undefined | null) {
  if (!token || !isSuperAdminConfigured()) return false;
  const parts = token.split(".");
  if (parts.length !== 2) {
    return false;
  }
  const [payload, signature] = parts;
  if (!payload.startsWith("super-admin:") || !signature) {
    return false;
  }
  const issuedAtRaw = payload.slice("super-admin:".length);
  const expected = sign(payload);
  if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) {
    return false;
  }
  const issuedAt = Number(issuedAtRaw);
  if (!Number.isFinite(issuedAt)) return false;
  return Date.now() - issuedAt < SESSION_TTL_MS;
}

export async function getSuperAdminSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  return verifySuperAdminSessionToken(token);
}

export function getSuperAdminCookieName() {
  return COOKIE_NAME;
}

export function getSuperAdminCookieMaxAgeSeconds() {
  return Math.floor(SESSION_TTL_MS / 1000);
}
