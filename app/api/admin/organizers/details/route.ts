import { adminPost, type AdminBody } from "@/lib/adminApi";
import { errorResponse, successResponse } from "@/lib/api-response";
import { organizerDetailsSchema, validationMessage } from "@/lib/validation/schemas";
import OrganizerModel from "@/models/Organizer";

export const runtime = "nodejs";

export const POST = adminPost(async (body: AdminBody) => {
  const parsed = organizerDetailsSchema.safeParse(body);
  if (!parsed.success) return errorResponse(validationMessage(parsed.error), 400);
  const organizer = await OrganizerModel.findOne({ organizerId: parsed.data.organizerId })
    .select("organizerId emailAddress fullName registrationNumber department semester section institute whatsappNumber cnic workshops isActive createdAt")
    .lean();
  if (!organizer) return errorResponse("Organizer was not found", 404);
  return successResponse({ ...organizer, createdAt: organizer.createdAt.toISOString() }, "Successfully retrieved organizer", 1);
}, "Admin organizer details");
