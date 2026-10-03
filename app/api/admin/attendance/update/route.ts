import { adminPost, type AdminBody } from "@/lib/adminApi";
import { errorResponse, successResponse } from "@/lib/api-response";
import { adminAttendanceSchema, validationMessage } from "@/lib/validation/schemas";
import ParticipantModel from "@/models/Participant";

export const runtime = "nodejs";

export const POST = adminPost(async (body: AdminBody) => {
  const parsed = adminAttendanceSchema.safeParse(body);
  if (!parsed.success) return errorResponse(validationMessage(parsed.error), 400);
  const { userId, workshop, participantId, present } = parsed.data;
  const participant = await ParticipantModel.findOneAndUpdate(
    { userId, workshop, id: participantId },
    { $set: { attendance: present } },
    { new: true },
  ).select("userId workshop id attendance").lean();

  if (!participant) return errorResponse("User event registration was not found", 404);
  return successResponse({
    userId: participant.userId,
    workshop: participant.workshop,
    participantId: participant.id,
    attendance: participant.attendance === true,
  }, "Successfully updated attendance", 1);
}, "Admin attendance update");
