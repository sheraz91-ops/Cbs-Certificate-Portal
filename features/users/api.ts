import { postData } from "@/lib/api-client";
import type { UserProfileInput, UserRecord, UserSummary } from "@/types/user";

export function getUsers(password: string): Promise<UserSummary[]> {
  return postData<UserSummary[], { password: string; action: string }>("/api/admin", { password, action: "users-list" });
}

export function createUser(password: string, user: UserProfileInput): Promise<UserRecord> {
  return postData<UserRecord, { password: string; action: string } & UserProfileInput>("/api/admin", { password, action: "create-user", ...user });
}

export function getUserById(password: string, userId: string): Promise<UserRecord> {
  return postData<UserRecord, { password: string; action: string; userId: string }>("/api/admin", { password, action: "user-details", userId });
}
