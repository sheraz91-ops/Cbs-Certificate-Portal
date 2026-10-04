import { errorResponse, successResponse } from "@/lib/api-response";
import { connectToDatabase } from "@/lib/mongodb";
import WorkshopModel from "@/models/Workshop";

export const runtime = "nodejs";

export async function GET() {
  try {
    await connectToDatabase();
    const events = await WorkshopModel.find()
      .sort({ eventYear: -1, eventDate: 1, workshopName: 1 })
      .select("key workshopName workshopFullTitle workshopCode eventYear eventDate allowOutsiders")
      .lean();
    const content = events.map(({ _id, ...event }) => ({ ...event, allowOutsiders: event.allowOutsiders ?? false }));
    return successResponse(content, "Successfully retrieved events", content.length);
  } catch (error) {
    console.error("Event list error:", error);
    return errorResponse("Unable to load events");
  }
}
