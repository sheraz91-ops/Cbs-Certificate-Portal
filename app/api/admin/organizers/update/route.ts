import { adminPost, type AdminBody } from "@/lib/adminApi";
import { errorResponse, successResponse } from "@/lib/api-response";
import { hashOrganizerPassword } from "@/lib/organizerAuth";
import { updateOrganizerSchema, validationMessage } from "@/lib/validation/schemas";
import OrganizerModel from "@/models/Organizer";
import WorkshopModel from "@/models/Workshop";

export const runtime = "nodejs";

export const POST = adminPost(async (body: AdminBody) => {
  const parsed = updateOrganizerSchema.safeParse(body);
  if (!parsed.success) return errorResponse(validationMessage(parsed.error), 400);
  const { organizerId, password, workshops, ...profile } = parsed.data;
  const validWorkshops = await WorkshopModel.countDocuments({ key: { $in: workshops } });
  if (validWorkshops !== workshops.length) return errorResponse("One or more selected events were not found", 404);
  const update: Record<string, unknown> = { ...profile, workshops };
  if (password) update.passwordHash = hashOrganizerPassword(password);
  try {
    const organizer = await OrganizerModel.findOneAndUpdate({ organizerId }, { $set: update }, { new: true, runValidators: true })
      .select("organizerId emailAddress fullName registrationNumber department semester section institute whatsappNumber cnic workshops isActive createdAt")
      .lean();
    if (!organizer) return errorResponse("Organizer was not found", 404);
    return successResponse({ ...organizer, createdAt: organizer.createdAt.toISOString() }, "Successfully updated organizer", 1);
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === 11000) return errorResponse("An organizer with this email already exists", 409);
    throw error;
  }
}, "Admin organizer update");
