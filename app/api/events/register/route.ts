import { NextRequest } from "next/server";
import { errorResponse, successResponse } from "@/lib/api-response";
import { connectToDatabase } from "@/lib/mongodb";
import { normalizeParticipantId } from "@/lib/participantId";
import { formatCertificateId } from "@/lib/formatId";
import { allocateParticipantIds } from "@/lib/participantSequence";
import { eventRegistrationSchema, validationMessage } from "@/lib/validation/schemas";
import ParticipantModel from "@/models/Participant";
import UserModel from "@/models/User";
import UserSequenceModel from "@/models/UserSequence";
import WorkshopModel from "@/models/Workshop";
import UserRegistrationFormModel from "@/models/UserRegistrationForm";
import {
  DEFAULT_USER_REGISTRATION_FORM,
  type UserRegistrationFormConfig,
} from "@/types/registrationForm";
import { validateUserRegistrationValues } from "@/lib/userRegistrationValidation";
import { validateMatrixSelection, parseMatrixSelection } from "@/lib/matrixRegistration";
import type { WorkshopDefinition } from "@/types/workshop";
import type { UserProfileInput } from "@/types/user";

export const runtime = "nodejs";

function normalizePhoneNumber(value: string): string {
  return value.replace(/\D/g, "");
}

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse("Invalid JSON body", 400);
  }

  const parsed = eventRegistrationSchema.safeParse(body);
  if (!parsed.success) return errorResponse(validationMessage(parsed.error), 400);
  const { workshop: workshopKey, profileCustomFields, customFields } = parsed.data;

  try {
    await connectToDatabase();
    const [workshop, savedForm] = await Promise.all([
      WorkshopModel.findOne({ key: workshopKey }).lean() as unknown as Promise<WorkshopDefinition | null>,
      UserRegistrationFormModel.findById("user-registration-form").lean(),
    ]);
    if (!workshop) return errorResponse("The selected event was not found", 404);
    if (workshop.isActive === false || workshop.isCompleted === true) return errorResponse("Registration for this event is closed", 403);
    const savedConfig: UserRegistrationFormConfig = savedForm?.fields?.length
      ? { fields: savedForm.fields }
      : DEFAULT_USER_REGISTRATION_FORM;
    const formConfig = workshop.allowOutsiders !== true && !savedConfig.fields.some((field) => field.key === "registrationNumber")
      ? { fields: [...savedConfig.fields, DEFAULT_USER_REGISTRATION_FORM.fields.find((field) => field.key === "registrationNumber")!] }
      : savedConfig;
    const shownProfileKeys = new Set(formConfig.fields.filter((field) => !field.key.startsWith("custom-")).map((field) => field.key));
    if (Object.entries(parsed.data).some(([key, value]) => ["emailAddress", "fullName", "registrationNumber", "department", "semester", "section", "institute", "whatsappNumber"].includes(key) && typeof value === "string" && value.trim() && !shownProfileKeys.has(key))) {
      return errorResponse("Registration includes a profile field that is not enabled", 400);
    }
    const requestedExistingUser = parsed.data.confirmExistingAccountId
      ? await UserModel.findOne({ userId: parsed.data.confirmExistingAccountId }).lean()
      : null;
    if (parsed.data.confirmExistingAccountId && !requestedExistingUser) {
      return errorResponse("No CBS account was found for that ID", 404);
    }
    if (requestedExistingUser?.isActive === false) {
      return errorResponse("This user account is deactivated. Contact CBS for assistance.", 403);
    }
    const customProfileKeys = new Set(formConfig.fields.filter((field) => field.key.startsWith("custom-")).map((field) => field.key));
    if (Object.keys(profileCustomFields).some((key) => !customProfileKeys.has(key))) return errorResponse("Registration includes an unknown profile field", 400);
    const registrationProfileValues = requestedExistingUser
      ? {
          ...parsed.data,
          emailAddress: requestedExistingUser.emailAddress ?? "",
          fullName: requestedExistingUser.fullName,
          registrationNumber: requestedExistingUser.registrationNumber ?? "",
          department: requestedExistingUser.department ?? "",
          semester: requestedExistingUser.semester ?? "",
          section: requestedExistingUser.section ?? "",
          institute: requestedExistingUser.institute ?? "",
          whatsappNumber: requestedExistingUser.whatsappNumber ?? "",
        }
      : parsed.data;
    const registrationValidationForm = requestedExistingUser
      ? {
          fields: formConfig.fields.filter((field) =>
            field.key.startsWith("custom-"),
          ),
        }
      : formConfig;
    const validatedRegistration = validateUserRegistrationValues(
      registrationValidationForm,
      { profile: registrationProfileValues, customFields: profileCustomFields },
      requestedExistingUser ? true : workshop.allowOutsiders === true,
    );
    if (Object.keys(validatedRegistration.errors).length) {
      const message = Object.values(validatedRegistration.errors)[0];
      return errorResponse(message, 400);
    }
    const profile = validatedRegistration.profile;
    const validatedProfileFields = validatedRegistration.customFields;
    const configuredFields = workshop.registrationFields ?? [];
    const allowedKeys = new Set(configuredFields.map((field) => field.key));
    if (Object.keys(customFields).some((key) => !allowedKeys.has(key))) return errorResponse("Registration includes an unknown event field", 400);
    const validatedCustomFields = { ...customFields };
    for (const field of configuredFields) {
      const value = customFields[field.key];
      const fieldType = field.type ?? "text";
      if (fieldType === "matrix") {
        const matrixValue = value ?? "{}";
        const matrixError = validateMatrixSelection(field, matrixValue);
        if (matrixError) return errorResponse(matrixError, 400);
        validatedCustomFields[field.key] = JSON.stringify(parseMatrixSelection(matrixValue));
        continue;
      }
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
    const identityConditions: Array<Record<string, unknown>> = [];
    if (profile.emailAddress) identityConditions.push({ emailAddress: profile.emailAddress });
    if (profile.registrationNumber) identityConditions.push({ registrationNumber: profile.registrationNumber });
    const phoneDigits = profile.whatsappNumber
      ? normalizePhoneNumber(profile.whatsappNumber)
      : "";
    if (phoneDigits) {
      const formattedPhonePattern = new RegExp(
        `^\\D*${phoneDigits.split("").join("\\D*")}\\D*$`,
      );
      identityConditions.push({ whatsappNumber: formattedPhonePattern });
    }
    const matchingUsers = requestedExistingUser
      ? [requestedExistingUser]
      : identityConditions.length
        ? await UserModel.find({ $or: identityConditions }).limit(2).lean()
        : [];
    if (matchingUsers.length > 1) {
      return errorResponse("These details match more than one CBS account. Please contact the CBS team.", 409);
    }

    let user = matchingUsers[0];
    if (parsed.data.confirmExistingAccountId && user?.userId !== parsed.data.confirmExistingAccountId) {
      return errorResponse("The existing CBS account could not be verified. Please check your details and try again.", 409);
    }
    let registrationProfile = profile;
    if (parsed.data.confirmExistingAccountId && user) {
      registrationProfile = {
        emailAddress: user.emailAddress ?? "",
        fullName: user.fullName,
        registrationNumber: user.registrationNumber ?? "",
        department: user.department ?? "",
        semester: user.semester ?? "",
        section: user.section ?? "",
        institute: user.institute ?? "",
        whatsappNumber: user.whatsappNumber ?? "",
      };
    }
    if (user?.isActive === false) return errorResponse("This user account is deactivated. Contact CBS for assistance.", 403);
    let createdUserId: string | null = null;
    if (user) {
      if (!parsed.data.confirmExistingAccountId) {
        return successResponse(
          {
            existingUser: {
              userId: user.userId,
              fullName: user.fullName,
              registrationNumber: user.registrationNumber ?? "",
              emailAddress: user.emailAddress ?? "",
              department: user.department ?? "",
              semester: user.semester ?? "",
              section: user.section ?? "",
              institute: user.institute ?? "",
              whatsappNumber: user.whatsappNumber ?? "",
            },
          },
          "Existing CBS account found",
        );
      }
    } else {
      const sequence = await UserSequenceModel.findOneAndUpdate(
        { _id: "users" },
        { $inc: { sequence: 1 } },
        { upsert: true, new: true, setDefaultsOnInsert: true },
      );
      if (!sequence) return errorResponse("Unable to assign a user ID", 500);
      const userId = `CBSU-${String(sequence.sequence).padStart(6, "0")}`;
      const storedProfile: Partial<UserProfileInput> & Pick<UserProfileInput, "fullName"> = { ...registrationProfile };
      for (const key of ["emailAddress", "registrationNumber", "department", "semester", "section", "institute", "whatsappNumber"] as const) {
        if (!storedProfile[key]) delete storedProfile[key];
      }
      user = await UserModel.create({ userId, ...storedProfile, profileCustomFields: validatedProfileFields });
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
      if (!createdUserId) {
        const backfilledProfile: Record<string, string> = {};
        for (const field of formConfig.fields) {
          if (shownProfileKeys.has(field.key)) {
            const key = field.key as keyof typeof registrationProfile;
            const value = registrationProfile[key];
            if (value && !user[key]) backfilledProfile[key] = value;
          }
        }
        await UserModel.updateOne({ userId: user.userId }, { $set: { ...backfilledProfile, profileCustomFields: { ...(user.profileCustomFields ?? {}), ...validatedProfileFields } } });
      }
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
