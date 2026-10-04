import { adminPost, type AdminBody } from "@/lib/adminApi";
import { errorResponse, successResponse } from "@/lib/api-response";
import OrganizerModel from "@/models/Organizer";
import OrganizerSessionModel from "@/models/OrganizerSession";
import { organizerStatusSchema, validationMessage } from "@/lib/validation/schemas";

export const runtime = "nodejs";

export const POST = adminPost(async (body: AdminBody) => {
  const parsed = organizerStatusSchema.safeParse(body);
  if (!parsed.success) return errorResponse(validationMessage(parsed.error), 400);
  const organizer = await OrganizerModel.findOneAndUpdate({ organizerId: parsed.data.organizerId }, { $set: { isActive: parsed.data.isActive } }, { new: true }).select("_id organizerId isActive").lean();
  if (!organizer) return errorResponse("Organizer was not found", 404);
  if (!organizer.isActive) await OrganizerSessionModel.deleteMany({ organizerId: organizer._id });
  return successResponse({ organizerId: organizer.organizerId, isActive: organizer.isActive }, `Organizer ${organizer.isActive ? "activated" : "deactivated"}`, 1);
}, "Admin organizer status update");
