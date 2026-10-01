import { createHash, randomBytes } from "node:crypto";
import AdminSessionModel from "@/models/AdminSession";

export const ADMIN_SESSION_COOKIE = "cbs_admin_session";
export const ADMIN_SESSION_DURATION_SECONDS = 8 * 60 * 60;

function currentPasswordVersion(): string {
  const password = process.env.ADMIN_PASSWORD;
  if (!password) throw new Error("Missing required env var: ADMIN_PASSWORD");
  return createHash("sha256").update(password).digest("hex");
}

function hashSessionToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function createAdminSessionToken(): string {
  return randomBytes(32).toString("base64url");
}

export async function storeAdminSession(token: string): Promise<void> {
  const expiresAt = new Date(Date.now() + ADMIN_SESSION_DURATION_SECONDS * 1000);
  await AdminSessionModel.create({
    tokenHash: hashSessionToken(token),
    passwordVersion: currentPasswordVersion(),
    expiresAt,
  });
}

export async function isValidAdminSession(token: string | undefined): Promise<boolean> {
  if (!token || !/^[A-Za-z0-9_-]{43}$/.test(token)) return false;
  const session = await AdminSessionModel.findOne({
    tokenHash: hashSessionToken(token),
    passwordVersion: currentPasswordVersion(),
    expiresAt: { $gt: new Date() },
  }).select("_id").lean();
  return Boolean(session);
}

export async function revokeAdminSession(token: string | undefined): Promise<void> {
  if (!token || !/^[A-Za-z0-9_-]{43}$/.test(token)) return;
  await AdminSessionModel.deleteOne({ tokenHash: hashSessionToken(token) });
}

export function isSameOriginRequest(request: Request & { nextUrl?: URL }): boolean {
  const origin = request.headers.get("origin");
  if (origin && origin !== request.nextUrl?.origin) return false;
  return request.headers.get("sec-fetch-site") !== "cross-site";
}
