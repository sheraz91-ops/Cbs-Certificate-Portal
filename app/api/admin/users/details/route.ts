import { adminPost, type AdminBody } from "@/lib/adminApi";
import { errorResponse, successResponse } from "@/lib/api-response";
import UserModel from "@/models/User";
import type { UserRecord } from "@/types/user";
import { userDetailsSchema, validationMessage } from "@/lib/validation/schemas";

export const runtime = "nodejs";

export const POST = adminPost(async (body: AdminBody) => {
  const parsed = userDetailsSchema.safeParse(body);
  if (!parsed.success) return errorResponse(validationMessage(parsed.error), 400);
  const { userId } = parsed.data;
  const user = await UserModel.findOne({ userId }).lean();
  if (!user) return errorResponse(`User "${userId}" was not found`, 404);

  const result: UserRecord = {
    userId: user.userId,
    emailAddress: user.emailAddress,
    fullName: user.fullName,
    registrationNumber: user.registrationNumber,
    department: user.department,
    semester: user.semester,
    section: user.section,
    institute: user.institute,
    whatsappNumber: user.whatsappNumber,
    cnic: user.cnic,
    createdAt: user.createdAt.toISOString(),
  };
  return successResponse(result, "Successfully retrieved user", 1);
}, "Admin user details");
