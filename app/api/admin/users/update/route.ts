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
  const optionalFields = ["emailAddress", "department", "section", "institute"] as const;
  const update: Record<string, unknown> = { ...profile };
  const unset = Object.fromEntries(optionalFields.filter((field) => profile[field] === undefined).map((field) => [field, 1]));
  for (const field of optionalFields) if (profile[field] === undefined) delete update[field];
  const user = await UserModel.findOneAndUpdate({ userId }, { $set: update, ...(Object.keys(unset).length ? { $unset: unset } : {}) }, { new: true, runValidators: true }).lean();
  if (!user) return errorResponse("User was not found", 404);
  if (profile.fullName) await ParticipantModel.updateMany({ userId }, { $set: { name: profile.fullName } });
  return successResponse({ ...profile, emailAddress: user.emailAddress ?? "", department: user.department ?? "", section: user.section ?? "", institute: user.institute ?? "", userId: user.userId, isActive: user.isActive !== false, createdAt: user.createdAt.toISOString() }, "Successfully updated user", 1);
}, "Admin user update");
