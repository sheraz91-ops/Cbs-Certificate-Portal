import { timingSafeEqual } from "node:crypto";

export function checkAdminPassword(candidate: string): boolean {
  const password = process.env.ADMIN_PASSWORD;
  if (!password) throw new Error("Missing required env var: ADMIN_PASSWORD");
  const supplied = Buffer.from(candidate);
  const expected = Buffer.from(password);
  return supplied.length === expected.length && timingSafeEqual(supplied, expected);
}
