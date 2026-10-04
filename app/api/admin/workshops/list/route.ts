import { adminPost } from "@/lib/adminApi";
import { successResponse } from "@/lib/api-response";
import WorkshopModel from "@/models/Workshop";

export const runtime = "nodejs";

export const POST = adminPost(async () => {
  const workshops = await WorkshopModel.find().sort({ eventYear: -1, workshopName: 1 }).select("key workshopName").lean();
  return successResponse(workshops, "Successfully retrieved workshops", workshops.length);
}, "Admin workshop list");
