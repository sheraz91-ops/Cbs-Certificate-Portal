import { postData } from "@/lib/api-client";
import type { AdminUserProfileInput, UserDetailsRecord, UserRecord, UserSummary } from "@/types/user";
import { adminAttendanceSchema, adminCampusUserProfileSchema, adminUpdateUserSchema, assignUserEventSchema, userDeleteSchema, userDetailsSchema, userStatusSchema } from "@/lib/validation/schemas";

export function getUsers(): Promise<UserSummary[]> {
  return postData<UserSummary[], Record<string, never>>("/api/admin/users/list", {});
}

export function createUser(user: AdminUserProfileInput): Promise<UserRecord> {
  return postData<UserRecord, AdminUserProfileInput>("/api/admin/users/create", adminCampusUserProfileSchema.parse(user));
}

export function getUserById(userId: string): Promise<UserDetailsRecord> {
  return postData<UserDetailsRecord, { userId: string }>("/api/admin/users/details", userDetailsSchema.parse({ userId }));
}

export function updateUser(userId: string, profile: AdminUserProfileInput): Promise<UserRecord> {
  return postData<UserRecord, AdminUserProfileInput & { userId: string }>("/api/admin/users/update", adminUpdateUserSchema.parse({ ...profile, userId }));
}

export function setUserActive(userId: string, isActive: boolean): Promise<{ userId: string; isActive: boolean }> {
  return postData("/api/admin/users/status", userStatusSchema.parse({ userId, isActive }));
}

export function deleteUser(userId: string, password: string): Promise<{ deletedEnrollments: number }> {
  return postData("/api/admin/users/delete", userDeleteSchema.parse({ userId, password }));
}

export function enrollUserInEvent(userId: string, workshop: string): Promise<{ workshopKey: string; workshopName: string; certificateId: string; attendance: false }> {
  return postData("/api/admin/users/enroll", assignUserEventSchema.parse({ userId, workshop }));
}

export function updateUserAttendance(input: { userId: string; workshop: string; participantId: string; present: boolean }): Promise<{ userId: string; workshop: string; participantId: string; attendance: boolean }> {
  return postData("/api/admin/attendance/update", adminAttendanceSchema.parse(input));
}
