import { NextRequest } from "next/server";
import { errorResponse, successResponse } from "@/lib/api-response";
import { connectToDatabase } from "@/lib/mongodb";
import { existingAccountLookupSchema, validationMessage } from "@/lib/validation/schemas";
import UserModel from "@/models/User";

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

  const parsed = existingAccountLookupSchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse(validationMessage(parsed.error), 400);
  }

  try {
    await connectToDatabase();
    const user = await UserModel.findOne({
      userId: parsed.data.userId,
      isActive: true,
    }).lean();
    if (!user) {
      return errorResponse("CBS ID or verification details do not match.", 404);
    }

    const emailMatches = parsed.data.emailAddress
      ? user.emailAddress?.toLowerCase() === parsed.data.emailAddress
      : false;
    const suppliedPhone = parsed.data.whatsappNumber
      ? normalizePhoneNumber(parsed.data.whatsappNumber)
      : "";
    const phoneMatches = suppliedPhone
      ? normalizePhoneNumber(user.whatsappNumber ?? "") === suppliedPhone
      : false;

    if (!emailMatches && !phoneMatches) {
      return errorResponse("CBS ID or verification details do not match.", 404);
    }

    return successResponse({
      userId: user.userId,
      fullName: user.fullName,
      registrationNumber: user.registrationNumber ?? "",
      emailAddress: user.emailAddress ?? "",
      department: user.department ?? "",
      semester: user.semester ?? "",
      section: user.section ?? "",
      institute: user.institute ?? "",
      whatsappNumber: user.whatsappNumber ?? "",
    });
  } catch (error) {
    console.error("Existing CBS account lookup error:", error);
    return errorResponse("Unable to verify this CBS account.");
  }
}
