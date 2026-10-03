import { adminPost, type AdminBody } from "@/lib/adminApi";
import { errorResponse, successResponse } from "@/lib/api-response";
import UserModel from "@/models/User";
import ParticipantModel from "@/models/Participant";
import { adminUpdateUserSchema, validationMessage } from "@/lib/validation/schemas";

export const runtime = "nodejs";

export const POST = adminPost(async (body: AdminBody) => {
  const parsed = adminUpdateUserSchema.safeParse(body);
  if (!parsed.success) return errorResponse(validationMessage(parsed.error), 400);
  const { userId, ...profile } = parsed.data;
  const user = await UserModel.findOneAndUpdate({ userId }, { $set: profile }, { new: true, runValidators: true }).lean();
  if (!user) return errorResponse("User was not found", 404);
  if (profile.fullName) await ParticipantModel.updateMany({ userId }, { $set: { name: profile.fullName } });
  return successResponse({ ...profile, userId: user.userId, createdAt: user.createdAt.toISOString() }, "Successfully updated user", 1);
}, "Admin user update");
