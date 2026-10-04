import { NextRequest } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { errorResponse, successResponse } from "@/lib/api-response";
import { organizerCertificateIdentitySchema, validationMessage } from "@/lib/validation/schemas";
import OrganizerModel from "@/models/Organizer";
import WorkshopModel from "@/models/Workshop";
import type { WorkshopDefinition } from "@/types/workshop";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  let body: unknown;
  try { body = await request.json(); } catch { return errorResponse("Invalid JSON body", 400); }
  const parsed = organizerCertificateIdentitySchema.safeParse(body);
  if (!parsed.success) return errorResponse(validationMessage(parsed.error), 400);

  try {
    await connectToDatabase();
    const organizer = await OrganizerModel.findOne({ organizerId: parsed.data.organizerId, isActive: true, fullName: parsed.data.fullName })
      .collation({ locale: "en", strength: 2 })
      .select("workshops")
      .lean();
    if (!organizer) return errorResponse("Organizer details not found", 404);

    const workshops = await WorkshopModel.find({ key: { $in: organizer.workshops } })
      .select("-templateData")
      .sort({ eventYear: -1, workshopName: 1 })
      .lean() as unknown as WorkshopDefinition[];
    return successResponse(workshops, "Assigned events retrieved", workshops.length);
  } catch (error) {
    console.error("Organizer assigned events error:", error);
    return errorResponse("Unable to load assigned events");
  }
}
