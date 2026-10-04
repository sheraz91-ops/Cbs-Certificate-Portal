import { adminPost, type AdminBody } from "@/lib/adminApi";
import { errorResponse, successResponse } from "@/lib/api-response";
import { checkAdminPassword } from "@/lib/adminAuth";
import UserModel from "@/models/User";
import ParticipantModel from "@/models/Participant";
import { userDeleteSchema, validationMessage } from "@/lib/validation/schemas";

export const runtime = "nodejs";

export const POST = adminPost(async (body: AdminBody) => {
  const parsed = userDeleteSchema.safeParse(body);
  if (!parsed.success) return errorResponse(validationMessage(parsed.error), 400);
  if (!checkAdminPassword(parsed.data.password)) return errorResponse("Admin password is incorrect", 403);
  const user = await UserModel.findOneAndDelete({ userId: parsed.data.userId }).select("userId").lean();
  if (!user) return errorResponse("User was not found", 404);
  const deletedEnrollments = await ParticipantModel.deleteMany({ userId: user.userId });
  return successResponse({ deletedEnrollments: deletedEnrollments.deletedCount }, "User and event enrollments deleted", 1);
}, "Admin user delete");
