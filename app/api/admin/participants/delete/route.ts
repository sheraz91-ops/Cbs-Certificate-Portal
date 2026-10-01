import { adminPost, type AdminBody } from "@/lib/adminApi";
import { errorResponse, successResponse } from "@/lib/api-response";
import ParticipantModel from "@/models/Participant";
import { participantDeleteSchema, validationMessage } from "@/lib/validation/schemas";

export const runtime = "nodejs";

export const POST = adminPost(async (body: AdminBody) => {
  const parsed = participantDeleteSchema.safeParse(body);
  if (!parsed.success) return errorResponse(validationMessage(parsed.error), 400);
  const { workshop, id, name } = parsed.data;
  const deleted = await ParticipantModel.findOneAndDelete({ workshop, id, name });
  if (!deleted) return errorResponse("Participant was not found", 404);
  return successResponse(null, "Successfully deleted participant", 1);
}, "Admin participant delete");
