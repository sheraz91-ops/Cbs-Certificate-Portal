import { createHash, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import OrganizerModel from "@/models/Organizer";
import OrganizerSessionModel from "@/models/OrganizerSession";

export const ORGANIZER_SESSION_COOKIE = "cbs_organizer_session";
export const ORGANIZER_SESSION_DURATION_SECONDS = 8 * 60 * 60;

function hashSession(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function hashOrganizerPassword(password: string): string {
  const salt = randomBytes(16);
  const hash = scryptSync(password, salt, 64);
  return `${salt.toString("hex")}:${hash.toString("hex")}`;
}

export function verifyOrganizerPassword(password: string, stored: string): boolean {
  const [saltHex, hashHex] = stored.split(":");
  if (!saltHex || !hashHex || !/^[a-f0-9]{32}$/i.test(saltHex) || !/^[a-f0-9]{128}$/i.test(hashHex)) return false;
  const expected = Buffer.from(hashHex, "hex");
  const actual = scryptSync(password, Buffer.from(saltHex, "hex"), expected.length);
  return timingSafeEqual(actual, expected);
}

export function createOrganizerSessionToken(): string {
  return randomBytes(32).toString("base64url");
}

export async function createOrganizerSession(token: string, organizerId: string): Promise<void> {
  await OrganizerSessionModel.create({
    tokenHash: hashSession(token),
    organizerId,
    expiresAt: new Date(Date.now() + ORGANIZER_SESSION_DURATION_SECONDS * 1000),
  });
}

export async function findOrganizerForSession(token: string | undefined) {
  if (!token || !/^[A-Za-z0-9_-]{43}$/.test(token)) return null;
  const session = await OrganizerSessionModel.findOne({ tokenHash: hashSession(token), expiresAt: { $gt: new Date() } }).select("organizerId").lean();
  if (!session) return null;
  return OrganizerModel.findOne({ _id: session.organizerId, isActive: true }).select("email fullName workshops isActive").lean();
}

export async function revokeOrganizerSession(token: string | undefined): Promise<void> {
  if (!token || !/^[A-Za-z0-9_-]{43}$/.test(token)) return;
  await OrganizerSessionModel.deleteOne({ tokenHash: hashSession(token) });
}

export async function authenticateOrganizer(email: string, password: string) {
  const organizer = await OrganizerModel.findOne({ emailAddress: email, isActive: true }).select("+passwordHash organizerId emailAddress fullName workshops isActive");
  if (!organizer || !verifyOrganizerPassword(password, organizer.passwordHash)) return null;
  return organizer;
}
