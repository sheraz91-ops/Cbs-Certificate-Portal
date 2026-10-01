import { postData } from "@/lib/api-client";
import type { UserProfileInput, UserRecord, UserSummary } from "@/types/user";
import { userDetailsSchema, userProfileSchema } from "@/lib/validation/schemas";

export function getUsers(): Promise<UserSummary[]> {
  return postData<UserSummary[], Record<string, never>>("/api/admin/users/list", {});
}

export function createUser(user: UserProfileInput): Promise<UserRecord> {
  return postData<UserRecord, UserProfileInput>("/api/admin/users/create", userProfileSchema.parse(user));
}

export function getUserById(userId: string): Promise<UserRecord> {
  return postData<UserRecord, { userId: string }>("/api/admin/users/details", userDetailsSchema.parse({ userId }));
}
