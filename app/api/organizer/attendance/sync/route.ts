import { organizerPost, type OrganizerBody } from "@/lib/organizerApi";
import { errorResponse, successResponse } from "@/lib/api-response";
import { organizerAttendanceBatchSchema, validationMessage } from "@/lib/validation/schemas";
import ParticipantModel from "@/models/Participant";
import WorkshopModel from "@/models/Workshop";

export const runtime = "nodejs";

export const POST = organizerPost(async (body: OrganizerBody, organizer) => {
  const parsed = organizerAttendanceBatchSchema.safeParse(body);
  if (!parsed.success) return errorResponse(validationMessage(parsed.error), 400);
  const { workshop, attendance } = parsed.data;
  if (!organizer.workshops.includes(workshop)) return errorResponse("You are not assigned to this event", 403);
  const event = await WorkshopModel.findOne({ key: workshop }).select("isCompleted allowLocalAttendance").lean();
  if (!event || event.isCompleted === true) return errorResponse("This event is completed and attendance can no longer be changed", 403);
  if (event.allowLocalAttendance !== true) return errorResponse("Local attendance saving is not allowed for this event", 403);

  const participantIds = attendance.map(({ participantId }) => participantId);
  const matchingCount = await ParticipantModel.countDocuments({ workshop, id: { $in: participantIds } });
  if (matchingCount !== attendance.length) return errorResponse("One or more participants were not found for this event; no attendance was synced", 404);

  const result = await ParticipantModel.bulkWrite(attendance.map(({ participantId, present }) => ({
    updateOne: {
      filter: { workshop, id: participantId },
      update: { $set: { attendance: present } },
    },
  })));
  if (result.matchedCount !== attendance.length) {
    return errorResponse("Attendance could not be synced for every participant; the local changes are still available to retry", 409);
  }
  return successResponse({ updated: result.matchedCount }, "Successfully synced attendance", attendance.length);
}, "Organizer attendance sync");
