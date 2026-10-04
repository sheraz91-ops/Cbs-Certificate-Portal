import { adminPost, type AdminBody } from "@/lib/adminApi";
import { errorResponse, successResponse } from "@/lib/api-response";
import UserModel from "@/models/User";
import UserSequenceModel from "@/models/UserSequence";
import type { UserRecord } from "@/types/user";
import { adminCampusUserProfileSchema, validationMessage } from "@/lib/validation/schemas";

export const runtime = "nodejs";

export const POST = adminPost(async (body: AdminBody) => {
  const parsed = adminCampusUserProfileSchema.safeParse(body);
  if (!parsed.success) return errorResponse(validationMessage(parsed.error), 400);
  const profile = parsed.data;

  const sequence = await UserSequenceModel.findOneAndUpdate(
    { _id: "users" },
    { $inc: { sequence: 1 } },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );
  if (!sequence) return errorResponse("Unable to assign a user ID", 500);

  const userId = `CBSU-${String(sequence.sequence).padStart(6, "0")}`;
  const user = await UserModel.create({ userId, ...profile });
  const result: UserRecord = {
    userId: user.userId,
    emailAddress: user.emailAddress ?? "",
    fullName: user.fullName,
    registrationNumber: user.registrationNumber ?? "",
    department: user.department ?? "",
    semester: user.semester ?? "",
    section: user.section ?? "",
    institute: user.institute ?? "",
    whatsappNumber: user.whatsappNumber ?? "",
    isActive: true,
    createdAt: user.createdAt.toISOString(),
  };
  return successResponse(result, "Successfully created user", 1, 201);
}, "Admin user create");
