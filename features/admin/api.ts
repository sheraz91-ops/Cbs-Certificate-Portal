import { getData, postData } from "@/lib/api-client";
import { adminLoginSchema } from "@/lib/validation/schemas";

export type AdminOverviewStats = {
  totals: {
    workshops: number;
    registeredUsers: number;
    organizers: number;
    activeOrganizers: number;
    registrations: number;
    enrolledUsers: number;
    usersWithoutEvents: number;
    present: number;
    absent: number;
  };
  recentWorkshops: Array<{
    key: string;
    workshopName: string;
    workshopCode: string;
    eventDate: string;
    eventYear: string;
    registrations: number;
  }>;
  recentUsers: Array<{ userId: string; fullName: string; emailAddress: string; createdAt: string }>;
  recentOrganizers: Array<{ organizerId: string; fullName: string; emailAddress: string; isActive: boolean; createdAt: string }>;
};

export function getAdminOverviewStats(): Promise<AdminOverviewStats> {
  return postData("/api/admin/overview/stats", {});
}

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
