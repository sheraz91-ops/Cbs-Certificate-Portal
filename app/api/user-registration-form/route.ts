import { connectToDatabase } from "@/lib/mongodb";
import { errorResponse, successResponse } from "@/lib/api-response";
import UserRegistrationFormModel from "@/models/UserRegistrationForm";
import { DEFAULT_USER_REGISTRATION_FORM } from "@/types/registrationForm";

export const runtime = "nodejs";

export async function GET() {
  try {
    await connectToDatabase();
    const saved = await UserRegistrationFormModel.findById("user-registration-form").select("fields").lean();
    const response = successResponse(saved?.fields?.length ? { fields: saved.fields } : DEFAULT_USER_REGISTRATION_FORM, "Successfully loaded registration form settings", 1);
    response.headers.set("Cache-Control", "no-store");
    return response;
  } catch (error) {
    console.error("User registration form configuration API error:", error);
    return errorResponse("Unable to load registration form settings");
  }
}
