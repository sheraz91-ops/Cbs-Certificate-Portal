import { adminPost, type AdminBody } from "@/lib/adminApi";
import { errorResponse, successResponse } from "@/lib/api-response";
import UserModel from "@/models/User";
import UserSequenceModel from "@/models/UserSequence";
import type { UserRecord } from "@/types/user";
import { createAdminUserSchema, validationMessage } from "@/lib/validation/schemas";

export const runtime = "nodejs";

export const POST = adminPost(async (body: AdminBody) => {
  const parsed = createAdminUserSchema.safeParse(body);
  if (!parsed.success) return errorResponse(validationMessage(parsed.error), 400);
  const { userIdSuffix, ...profile } = parsed.data;

  let sequenceNumber: number;
  if (userIdSuffix) {
    sequenceNumber = Number(userIdSuffix);
    const requestedUserId = `CBSU-${String(sequenceNumber).padStart(6, "0")}`;
    if (await UserModel.exists({ userId: requestedUserId })) {
      return errorResponse(`User ID ${requestedUserId} is already in use`, 409);
    }
    await UserSequenceModel.findOneAndUpdate(
      { _id: "users" },
      { $max: { sequence: sequenceNumber } },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );
  } else {
    const sequence = await UserSequenceModel.findOneAndUpdate(
      { _id: "users" },
      { $inc: { sequence: 1 } },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );
    if (!sequence) return errorResponse("Unable to assign a user ID", 500);
    sequenceNumber = sequence.sequence;
  }

  const userId = `CBSU-${String(sequenceNumber).padStart(6, "0")}`;
  let user;
  try {
    user = await UserModel.create({ userId, ...profile });
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === 11000) {
      return errorResponse(`User ID ${userId} is already in use`, 409);
    }
    throw error;
  }
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
