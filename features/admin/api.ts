import { getData, postData } from "@/lib/api-client";
import { adminLoginSchema } from "@/lib/validation/schemas";

export type AdminSessionStatus = { authenticated: true };

export function loginAdmin(password: string): Promise<AdminSessionStatus> {
  return postData<AdminSessionStatus, { password: string }>("/api/admin/session/login", adminLoginSchema.parse({ password }));
}

export function getAdminSession(): Promise<AdminSessionStatus> {
  return getData<AdminSessionStatus>("/api/admin/session/status", { cache: "no-store" });
}

export function logoutAdmin(): Promise<null> {
  return postData<null, Record<string, never>>("/api/admin/session/logout", {});
}
