import { errorResponse, successResponse } from "@/lib/api-response";
import { connectToDatabase } from "@/lib/mongodb";
import WorkshopModel from "@/models/Workshop";

export const runtime = "nodejs";

export async function GET() {
  try {
    await connectToDatabase();
    const workshops = await WorkshopModel.find()
      .sort({ eventYear: -1, workshopName: 1 })
      .select("key workshopName isCompleted")
      .lean();
    const content = workshops.map(({ _id, ...workshop }) => workshop);
    return successResponse(content, "Successfully retrieved events", content.length);
  } catch (error) {
    console.error("Workshop list error:", error);
    return errorResponse("Unable to load events");
  }
}
