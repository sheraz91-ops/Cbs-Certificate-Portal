import { NextRequest } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { errorResponse, successResponse } from "@/lib/api-response";
import { organizerCertificateGenerateSchema, validationMessage } from "@/lib/validation/schemas";
import OrganizerModel from "@/models/Organizer";
import WorkshopModel from "@/models/Workshop";
import type { WorkshopDefinition } from "@/types/workshop";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  let body: unknown;
  try { body = await request.json(); } catch { return errorResponse("Invalid JSON body", 400); }
  const parsed = organizerCertificateGenerateSchema.safeParse(body);
  if (!parsed.success) return errorResponse(validationMessage(parsed.error), 400);

  try {
    await connectToDatabase();
    const { organizerId, fullName, workshop: key } = parsed.data;
    const organizer = await OrganizerModel.findOne({ organizerId, isActive: true, fullName, workshops: key })
      .collation({ locale: "en", strength: 2 })
      .select("organizerId fullName")
      .lean();
    if (!organizer) return errorResponse("Organizer details or event assignment not found", 404);

    const workshop = await WorkshopModel.findOne({ key }).select("-templateData").lean() as unknown as WorkshopDefinition | null;
    if (!workshop) return errorResponse("Assigned event not found", 404);
    return successResponse({ fullName: organizer.fullName, organizerId: organizer.organizerId, workshop }, "Organizer certificate is ready");
  } catch (error) {
    console.error("Organizer certificate generation error:", error);
    return errorResponse("Unable to prepare organizer certificate");
  }
}
