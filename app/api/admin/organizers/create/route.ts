import { adminPost, type AdminBody } from "@/lib/adminApi";
import { errorResponse, successResponse } from "@/lib/api-response";
import { hashOrganizerPassword } from "@/lib/organizerAuth";
import { createOrganizerSchema, validationMessage } from "@/lib/validation/schemas";
import OrganizerModel from "@/models/Organizer";
import WorkshopModel from "@/models/Workshop";
import UserSequenceModel from "@/models/UserSequence";

export const runtime = "nodejs";

export const POST = adminPost(async (body: AdminBody) => {
  const parsed = createOrganizerSchema.safeParse(body);
  if (!parsed.success) return errorResponse(validationMessage(parsed.error), 400);
  const { emailAddress, fullName, password, workshops, ...profile } = parsed.data;
  const validWorkshops = await WorkshopModel.countDocuments({ key: { $in: workshops } });
  if (validWorkshops !== workshops.length) return errorResponse("One or more selected events were not found", 404);
  if (await OrganizerModel.exists({ emailAddress })) return errorResponse("An organizer with this email already exists", 409);
  try {
    const sequence = await UserSequenceModel.findOneAndUpdate(
      { _id: "organizers" },
      { $inc: { sequence: 1 } },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );
    if (!sequence) return errorResponse("Unable to assign an organizer ID", 500);
    const organizerId = `CBSO-${String(sequence.sequence).padStart(6, "0")}`;
    const organizer = await OrganizerModel.create({ organizerId, emailAddress, fullName, ...profile, passwordHash: hashOrganizerPassword(password), workshops, isActive: true });
    return successResponse({ organizerId: organizer.organizerId, emailAddress, ...profile, workshops, isActive: organizer.isActive, createdAt: organizer.createdAt.toISOString() }, "Successfully created organizer", 1, 201);
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === 11000) return errorResponse("An organizer with this email already exists", 409);
    throw error;
  }
}, "Admin organizer create");
