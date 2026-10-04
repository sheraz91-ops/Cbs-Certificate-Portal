import { adminPost, type AdminBody } from "@/lib/adminApi";
import { errorResponse, successResponse } from "@/lib/api-response";
import { hashOrganizerPassword } from "@/lib/organizerAuth";
import { updateOrganizerSchema, validationMessage } from "@/lib/validation/schemas";
import { ensureOrganizerEmailIndex } from "@/lib/ensureOrganizerEmailIndex";
import OrganizerModel from "@/models/Organizer";
import WorkshopModel from "@/models/Workshop";

export const runtime = "nodejs";

export const POST = adminPost(async (body: AdminBody) => {
  const parsed = updateOrganizerSchema.safeParse(body);
  if (!parsed.success) return errorResponse(validationMessage(parsed.error), 400);
  const { organizerId, password, workshops, ...profile } = parsed.data;
  await ensureOrganizerEmailIndex();
  const validWorkshops = await WorkshopModel.countDocuments({ key: { $in: workshops } });
  if (validWorkshops !== workshops.length) return errorResponse("One or more selected events were not found", 404);
  const optionalFields = ["emailAddress", "department", "section", "institute"] as const;
  const update: Record<string, unknown> = { ...profile, workshops };
  const unset = Object.fromEntries(optionalFields.filter((field) => profile[field] === undefined).map((field) => [field, 1]));
  for (const field of optionalFields) if (profile[field] === undefined) delete update[field];
  if (password) update.passwordHash = hashOrganizerPassword(password);
  try {
    const organizer = await OrganizerModel.findOneAndUpdate({ organizerId }, { $set: update, ...(Object.keys(unset).length ? { $unset: unset } : {}) }, { new: true, runValidators: true })
      .select("organizerId emailAddress fullName registrationNumber department semester section institute whatsappNumber workshops isActive createdAt")
      .lean();
    if (!organizer) return errorResponse("Organizer was not found", 404);
    return successResponse({ ...organizer, emailAddress: organizer.emailAddress ?? "", department: organizer.department ?? "", section: organizer.section ?? "", institute: organizer.institute ?? "", createdAt: organizer.createdAt.toISOString() }, "Successfully updated organizer", 1);
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === 11000) return errorResponse("An organizer with this email already exists", 409);
    throw error;
  }
}, "Admin organizer update");
