import { adminPost, type AdminBody } from "@/lib/adminApi";
import { errorResponse, successResponse } from "@/lib/api-response";
import UserRegistrationFormModel from "@/models/UserRegistrationForm";
import { userRegistrationFormConfigSchema, validationMessage } from "@/lib/validation/schemas";
import { DEFAULT_USER_REGISTRATION_FORM } from "@/types/registrationForm";

export const runtime = "nodejs";

export const POST = adminPost(async (body: AdminBody) => {
  if (!("fields" in body)) {
    const saved = await UserRegistrationFormModel.findById("user-registration-form").select("fields").lean();
    return successResponse(saved?.fields?.length ? { fields: saved.fields } : DEFAULT_USER_REGISTRATION_FORM, "Successfully loaded registration form settings", 1);
  }

  const parsed = userRegistrationFormConfigSchema.safeParse({ fields: body.fields });
  if (!parsed.success) return errorResponse(validationMessage(parsed.error), 400);
  const config = await UserRegistrationFormModel.findByIdAndUpdate(
    "user-registration-form",
    { $set: { fields: parsed.data.fields } },
    { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true },
  ).select("fields").lean();
  return successResponse({ fields: config?.fields ?? parsed.data.fields }, "Registration form settings saved", 1);
}, "Admin user registration form settings");
