import { organizerPost, type OrganizerBody } from "@/lib/organizerApi";
import { errorResponse, successResponse } from "@/lib/api-response";
import { organizerAttendanceSchema, validationMessage } from "@/lib/validation/schemas";
import ParticipantModel from "@/models/Participant";
import WorkshopModel from "@/models/Workshop";

export const runtime = "nodejs";

export const POST = organizerPost(async (body: OrganizerBody, organizer) => {
  const parsed = organizerAttendanceSchema.safeParse(body);
  if (!parsed.success) return errorResponse(validationMessage(parsed.error), 400);
  const { workshop, participantId, present } = parsed.data;
  if (!organizer.workshops.includes(workshop)) return errorResponse("You are not assigned to this event", 403);
  const event = await WorkshopModel.findOne({ key: workshop }).select("isCompleted").lean();
  if (!event || event.isCompleted === true) return errorResponse("This event is completed and attendance can no longer be changed", 403);
  const participant = await ParticipantModel.findOneAndUpdate(
    { workshop, id: participantId },
    { $set: { attendance: present } },
    { new: true },
  ).select("id attendance").lean();
  if (!participant) return errorResponse("Participant was not found", 404);
  return successResponse({ participantId: participant.id, attendance: participant.attendance === true }, "Successfully updated attendance", 1);
}, "Organizer attendance update");
