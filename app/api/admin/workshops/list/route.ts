import { adminPost } from "@/lib/adminApi";
import { successResponse } from "@/lib/api-response";
import WorkshopModel from "@/models/Workshop";

export const runtime = "nodejs";

export const POST = adminPost(async () => {
  const workshops = await WorkshopModel.find().sort({ eventYear: -1, workshopName: 1 }).select("key workshopName isActive").lean();
  const content = workshops.map((workshop) => ({ ...workshop, isActive: workshop.isActive !== false }));
  return successResponse(content, "Successfully retrieved workshops", content.length);
}, "Admin workshop list");
