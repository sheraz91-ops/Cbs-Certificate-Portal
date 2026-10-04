import { adminPost, type AdminBody } from "@/lib/adminApi";
import { errorResponse, successResponse } from "@/lib/api-response";
import { checkAdminPassword } from "@/lib/adminAuth";
import OrganizerModel from "@/models/Organizer";
import OrganizerSessionModel from "@/models/OrganizerSession";
import { organizerDeleteSchema, validationMessage } from "@/lib/validation/schemas";

export const runtime = "nodejs";

export const POST = adminPost(async (body: AdminBody) => {
  const parsed = organizerDeleteSchema.safeParse(body);
  if (!parsed.success) return errorResponse(validationMessage(parsed.error), 400);
  if (!checkAdminPassword(parsed.data.password)) return errorResponse("Admin password is incorrect", 403);
  const organizer = await OrganizerModel.findOneAndDelete({ organizerId: parsed.data.organizerId }).select("_id organizerId").lean();
  if (!organizer) return errorResponse("Organizer was not found", 404);
  await OrganizerSessionModel.deleteMany({ organizerId: organizer._id });
  return successResponse(null, "Organizer deleted", 1);
}, "Admin organizer delete");
