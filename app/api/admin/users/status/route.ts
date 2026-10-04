import { adminPost, type AdminBody } from "@/lib/adminApi";
import { errorResponse, successResponse } from "@/lib/api-response";
import UserModel from "@/models/User";
import { userStatusSchema, validationMessage } from "@/lib/validation/schemas";

export const runtime = "nodejs";

export const POST = adminPost(async (body: AdminBody) => {
  const parsed = userStatusSchema.safeParse(body);
  if (!parsed.success) return errorResponse(validationMessage(parsed.error), 400);
  const user = await UserModel.findOneAndUpdate({ userId: parsed.data.userId }, { $set: { isActive: parsed.data.isActive } }, { new: true }).select("userId isActive").lean();
  if (!user) return errorResponse("User was not found", 404);
  return successResponse({ userId: user.userId, isActive: user.isActive !== false }, `User ${user.isActive ? "activated" : "deactivated"}`, 1);
}, "Admin user status update");
