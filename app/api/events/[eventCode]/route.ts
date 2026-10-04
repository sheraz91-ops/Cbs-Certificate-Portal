import { errorResponse, successResponse } from "@/lib/api-response";
import { connectToDatabase } from "@/lib/mongodb";
import WorkshopModel from "@/models/Workshop";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ eventCode: string }> },
) {
  const { eventCode } = await params;
  const code = eventCode.trim();
  if (!code || code.length > 100) return errorResponse("Event not found", 404);

  try {
    await connectToDatabase();
    const escapedCode = code.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const event = await WorkshopModel.findOne({
      $or: [
        { key: code },
        { workshopCode: { $regex: `^${escapedCode}$`, $options: "i" } },
      ],
    })
      .select("key workshopName workshopFullTitle workshopCode eventYear eventDate isActive isCompleted allowOutsiders confirmationMessage registrationFields")
      .lean();

    if (!event) return errorResponse("Event not found", 404);

    const content = {
      key: event.key,
      workshopName: event.workshopName,
      workshopFullTitle: event.workshopFullTitle,
      workshopCode: event.workshopCode,
      eventYear: event.eventYear,
      eventDate: event.eventDate,
      isActive: event.isActive !== false && event.isCompleted !== true,
      isCompleted: event.isCompleted === true,
      allowOutsiders: event.allowOutsiders ?? false,
      confirmationMessage: event.confirmationMessage ?? "",
      registrationFields: event.registrationFields ?? [],
    };
    return successResponse(content, "Successfully retrieved event", 1);
  } catch (error) {
    console.error("Event lookup error:", error);
    return errorResponse("Unable to load this event");
  }
}
