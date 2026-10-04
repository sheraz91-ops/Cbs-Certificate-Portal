import { postData } from "@/lib/api-client";
import type { UserDetailsRecord, UserProfileInput, UserRecord, UserSummary } from "@/types/user";
import { adminUpdateUserSchema, assignUserEventSchema, campusUserProfileSchema, userDetailsSchema } from "@/lib/validation/schemas";

export function getUsers(): Promise<UserSummary[]> {
  return postData<UserSummary[], Record<string, never>>("/api/admin/users/list", {});
}

export function createUser(user: UserProfileInput): Promise<UserRecord> {
  return postData<UserRecord, UserProfileInput>("/api/admin/users/create", campusUserProfileSchema.parse(user));
}

export function getUserById(userId: string): Promise<UserDetailsRecord> {
  return postData<UserDetailsRecord, { userId: string }>("/api/admin/users/details", userDetailsSchema.parse({ userId }));
}

export function updateUser(userId: string, profile: UserProfileInput): Promise<UserRecord> {
  return postData<UserRecord, UserProfileInput & { userId: string }>("/api/admin/users/update", adminUpdateUserSchema.parse({ ...profile, userId }));
}

export function enrollUserInEvent(userId: string, workshop: string): Promise<{ workshopKey: string; workshopName: string; certificateId: string; attendance: false }> {
  return postData("/api/admin/users/enroll", assignUserEventSchema.parse({ userId, workshop }));
}
