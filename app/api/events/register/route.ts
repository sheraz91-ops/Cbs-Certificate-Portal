import { NextRequest } from "next/server";
import { errorResponse, successResponse } from "@/lib/api-response";
import { connectToDatabase } from "@/lib/mongodb";
import { normalizeParticipantId } from "@/lib/participantId";
import { formatCnic } from "@/lib/inputMasks";
import { formatCertificateId } from "@/lib/formatId";
import { allocateParticipantIds } from "@/lib/participantSequence";
import { campusRegistrationNumberSchema, eventRegistrationSchema, validationMessage } from "@/lib/validation/schemas";
import ParticipantModel from "@/models/Participant";
import UserModel from "@/models/User";
import UserSequenceModel from "@/models/UserSequence";
import WorkshopModel from "@/models/Workshop";
import type { UserProfileInput } from "@/types/user";
import type { WorkshopDefinition } from "@/types/workshop";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse("Invalid JSON body", 400);
  }

  const parsed = eventRegistrationSchema.safeParse(body);
  if (!parsed.success) return errorResponse(validationMessage(parsed.error), 400);
  const { workshop: workshopKey, customFields, ...profile } = parsed.data;

  try {
    await connectToDatabase();
    const workshop = await WorkshopModel.findOne({ key: workshopKey }).lean() as unknown as WorkshopDefinition | null;
    if (!workshop) return errorResponse("The selected event was not found", 404);
    if (workshop.isActive === false || workshop.isCompleted === true) return errorResponse("Registration for this event is closed", 403);
    const configuredFields = workshop.registrationFields ?? [];
    const allowedKeys = new Set(configuredFields.map((field) => field.key));
    if (Object.keys(customFields).some((key) => !allowedKeys.has(key))) return errorResponse("Registration includes an unknown event field", 400);
    const validatedCustomFields = { ...customFields };
    for (const field of configuredFields) {
      const value = customFields[field.key];
      const fieldType = field.type ?? "text";
      if (value !== undefined && fieldType === "yes_no" && value !== "yes" && value !== "no") {
        return errorResponse(`${field.label} must be answered Yes or No`, 400);
      }
      if (fieldType === "checkbox" && field.choices?.length) {
        let selected: unknown;
        try {
          selected = value === undefined ? [] : JSON.parse(value);
        } catch {
          return errorResponse(`${field.label} has an invalid selection`, 400);
        }
        if (!Array.isArray(selected) || selected.some((choice) => typeof choice !== "string" || !field.choices?.includes(choice)) || new Set(selected).size !== selected.length) {
          return errorResponse(`${field.label} has an invalid selection`, 400);
        }
        if (field.selectionMode === "single" && selected.length > 1) {
          return errorResponse(`${field.label} allows only one selection`, 400);
        }
        if (field.required && selected.length === 0) return errorResponse(`${field.label} is required`, 400);
        validatedCustomFields[field.key] = JSON.stringify(selected);
        continue;
      }
      if (value !== undefined && fieldType === "checkbox" && value !== "true" && value !== "false") {
        return errorResponse(`${field.label} has an invalid checkbox value`, 400);
      }
      if (field.required && (fieldType === "checkbox" ? value !== "true" : !value?.trim())) {
        return errorResponse(`${field.label} is required`, 400);
      }
    }
    if (!workshop.allowOutsiders) {
      const registrationNumber = campusRegistrationNumberSchema.safeParse(profile.registrationNumber);
      if (!registrationNumber.success) return errorResponse(validationMessage(registrationNumber.error), 400);
      profile.registrationNumber = registrationNumber.data;
    }

    const matchingUsers = await UserModel.find({
      $or: [{ emailAddress: profile.emailAddress }, { cnic: profile.cnic }, { cnic: profile.cnic.replace(/-/g, "") }],
    }).limit(2).lean();
    if (matchingUsers.length > 1) {
      return errorResponse("These details match more than one CBS account. Please contact the CBS team.", 409);
    }

    let user = matchingUsers[0];
    if (user?.isActive === false) return errorResponse("This user account is deactivated. Contact CBS for assistance.", 403);
    let createdUserId: string | null = null;
    if (user) {
      const existingProfile: UserProfileInput = {
        emailAddress: user.emailAddress,
        fullName: user.fullName,
        registrationNumber: user.registrationNumber,
        department: user.department,
        semester: user.semester,
        section: user.section,
        institute: user.institute,
        whatsappNumber: user.whatsappNumber,
        cnic: user.cnic,
      };
      const detailsMatch = Object.keys(profile).every((key) => {
        const field = key as keyof UserProfileInput;
        const existingValue = field === "cnic" ? formatCnic(existingProfile.cnic) : existingProfile[field];
        return existingValue === profile[field];
      });
      if (!detailsMatch) {
        return errorResponse("These details do not match the existing CBS account. Please contact the CBS team.", 409);
      }
    } else {
      const sequence = await UserSequenceModel.findOneAndUpdate(
        { _id: "users" },
        { $inc: { sequence: 1 } },
        { upsert: true, new: true, setDefaultsOnInsert: true },
      );
      if (!sequence) return errorResponse("Unable to assign a user ID", 500);
      const userId = `CBSU-${String(sequence.sequence).padStart(6, "0")}`;
      user = await UserModel.create({ userId, ...(profile satisfies UserProfileInput) });
      createdUserId = user.userId;
    }

    const existingEnrollment = await ParticipantModel.findOne({ workshop: workshopKey, userId: user.userId }).select("_id").lean();
    if (existingEnrollment) {
      if (createdUserId) await UserModel.deleteOne({ userId: createdUserId });
      return errorResponse("You are already registered for this event", 409);
    }

    try {
      const [id] = await allocateParticipantIds(workshopKey, 1);
      await ParticipantModel.create({
        id,
        normalizedId: normalizeParticipantId(id),
        userId: user.userId,
        name: user.fullName,
        workshop: workshopKey,
        enrollmentKey: `${workshopKey}:${user.userId}`,
        customFields: validatedCustomFields,
      });
      return successResponse({
        userId: user.userId,
        certificateId: formatCertificateId(id, workshop),
        eventName: workshop.workshopName,
      }, "Successfully registered for event", 1, 201);
    } catch (error) {
      if (createdUserId) await UserModel.deleteOne({ userId: createdUserId });
      if (error && typeof error === "object" && "code" in error && error.code === 11000) {
        return errorResponse("You are already registered for this event", 409);
      }
      throw error;
    }
  } catch (error) {
    console.error("Event registration error:", error);
    return errorResponse("Unable to register for this event");
  }
}
