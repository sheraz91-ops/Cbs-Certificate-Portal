import { adminPost } from "@/lib/adminApi";
import { successResponse } from "@/lib/api-response";
import UserModel from "@/models/User";
import type { UserSummary } from "@/types/user";

export const runtime = "nodejs";

export const POST = adminPost(async () => {
  const records = await UserModel.find().sort({ userId: 1 }).select("userId fullName emailAddress registrationNumber department isActive").lean();
  const users: UserSummary[] = records.map((user) => ({
    userId: user.userId,
    fullName: user.fullName,
    emailAddress: user.emailAddress ?? "",
    registrationNumber: user.registrationNumber ?? "",
    department: user.department ?? "",
    isActive: user.isActive !== false,
  }));
  return successResponse(users, "Successfully retrieved users", users.length);
}, "Admin user list");
