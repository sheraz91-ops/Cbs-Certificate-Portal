import { adminPost, type AdminBody } from "@/lib/adminApi";
import { errorResponse, successResponse } from "@/lib/api-response";
import { organizerAssignmentSchema, validationMessage } from "@/lib/validation/schemas";
import OrganizerModel from "@/models/Organizer";
import WorkshopModel from "@/models/Workshop";

export const runtime = "nodejs";

export const POST = adminPost(async (body: AdminBody) => {
  const parsed = organizerAssignmentSchema.safeParse(body);
  if (!parsed.success) return errorResponse(validationMessage(parsed.error), 400);
  const { organizerId, workshops } = parsed.data;
  const validWorkshops = await WorkshopModel.countDocuments({ key: { $in: workshops } });
  if (validWorkshops !== workshops.length) return errorResponse("One or more selected events were not found", 404);
  const organizer = await OrganizerModel.findOneAndUpdate({ organizerId }, { $set: { workshops } }, { new: true }).select("organizerId emailAddress fullName workshops").lean();
  if (!organizer) return errorResponse("Organizer was not found", 404);
  return successResponse({ organizerId, emailAddress: organizer.emailAddress, fullName: organizer.fullName, workshops: organizer.workshops }, "Successfully updated organizer events", 1);
}, "Admin organizer assign");
