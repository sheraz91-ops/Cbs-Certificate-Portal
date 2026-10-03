import { organizerPost, type OrganizerBody } from "@/lib/organizerApi";
import { errorResponse, successResponse } from "@/lib/api-response";
import { workshopKeyBodySchema, validationMessage } from "@/lib/validation/schemas";
import ParticipantModel from "@/models/Participant";
import UserModel from "@/models/User";

export const runtime = "nodejs";

export const POST = organizerPost(async (body: OrganizerBody, organizer) => {
  const parsed = workshopKeyBodySchema.safeParse(body);
  if (!parsed.success) return errorResponse(validationMessage(parsed.error), 400);
  const { workshop } = parsed.data;
  if (!organizer.workshops.includes(workshop)) return errorResponse("You are not assigned to this event", 403);
  const participants = await ParticipantModel.find({ workshop }).sort({ name: 1 }).lean();
  const users = await UserModel.find({ userId: { $in: participants.map((participant) => participant.userId) } })
    .select("userId emailAddress fullName registrationNumber department semester section institute whatsappNumber")
    .lean();
  const usersById = new Map(users.map((user) => [user.userId, user]));
  const content = participants.map((participant) => ({
    participantId: participant.id,
    userId: participant.userId,
    name: participant.name,
    attendance: participant.attendance === true,
    user: usersById.get(participant.userId) ?? null,
  }));
  return successResponse(content, "Successfully retrieved event participants", content.length);
}, "Organizer participant list");
