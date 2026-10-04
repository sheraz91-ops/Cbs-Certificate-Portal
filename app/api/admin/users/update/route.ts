import { adminPost, type AdminBody } from "@/lib/adminApi";
import { errorResponse, successResponse } from "@/lib/api-response";
import UserModel from "@/models/User";
import ParticipantModel from "@/models/Participant";
import { adminUpdateUserSchema, campusRegistrationNumberSchema, validationMessage } from "@/lib/validation/schemas";

export const runtime = "nodejs";

export const POST = adminPost(async (body: AdminBody) => {
  const parsed = adminUpdateUserSchema.safeParse(body);
  if (!parsed.success) return errorResponse(validationMessage(parsed.error), 400);
  const { userId, ...profile } = parsed.data;
  const currentUser = await UserModel.findOne({ userId }).select("registrationNumber").lean();
  if (!currentUser) return errorResponse("User was not found", 404);
  if (campusRegistrationNumberSchema.safeParse(currentUser.registrationNumber).success) {
    const registrationNumber = campusRegistrationNumberSchema.safeParse(profile.registrationNumber);
    if (!registrationNumber.success) return errorResponse(validationMessage(registrationNumber.error), 400);
    profile.registrationNumber = registrationNumber.data;
  }
  const user = await UserModel.findOneAndUpdate({ userId }, { $set: profile }, { new: true, runValidators: true }).lean();
  if (!user) return errorResponse("User was not found", 404);
  if (profile.fullName) await ParticipantModel.updateMany({ userId }, { $set: { name: profile.fullName } });
  return successResponse({ ...profile, userId: user.userId, isActive: user.isActive !== false, createdAt: user.createdAt.toISOString() }, "Successfully updated user", 1);
}, "Admin user update");
