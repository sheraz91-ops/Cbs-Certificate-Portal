import { errorResponse, successResponse } from "@/lib/api-response";
import { connectToDatabase } from "@/lib/mongodb";
import WorkshopModel from "@/models/Workshop";

export const runtime = "nodejs";

export async function GET() {
  try {
    await connectToDatabase();
    const events = await WorkshopModel.find({ isActive: { $ne: false }, isCompleted: { $ne: true } })
      .sort({ eventYear: -1, eventDate: 1, workshopName: 1 })
      .select("key workshopName workshopFullTitle workshopCode eventYear eventDate isActive isCompleted allowOutsiders confirmationMessage registrationFields")
      .lean();
    const content = events.map(({ _id, ...event }) => ({ ...event, isActive: true, isCompleted: event.isCompleted === true, allowOutsiders: event.allowOutsiders ?? false, confirmationMessage: event.confirmationMessage ?? "" }));
    return successResponse(content, "Successfully retrieved events", content.length);
  } catch (error) {
    console.error("Event list error:", error);
    return errorResponse("Unable to load events");
  }
}
