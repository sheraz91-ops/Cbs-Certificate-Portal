import { errorResponse, successResponse } from "@/lib/api-response";
import { adminPost, type AdminBody } from "@/lib/adminApi";
import ParticipantModel from "@/models/Participant";
import WorkshopModel from "@/models/Workshop";
import { workshopKeyBodySchema, validationMessage } from "@/lib/validation/schemas";

export const runtime = "nodejs";

export const POST = adminPost(async (body: AdminBody) => {
  const parsed = workshopKeyBodySchema.safeParse(body);
  if (!parsed.success) return errorResponse(validationMessage(parsed.error), 400);
  const { workshop } = parsed.data;
  const deleted = await WorkshopModel.findOneAndDelete({ key: workshop });
  if (!deleted) return errorResponse(`Workshop "${workshop}" was not found`, 404);
  const result = await ParticipantModel.deleteMany({ workshop });
  return successResponse({ deletedParticipants: result.deletedCount }, "Successfully deleted workshop and its participants", result.deletedCount + 1);
}, "Admin workshop delete");
