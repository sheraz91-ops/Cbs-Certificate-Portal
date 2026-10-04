import { adminPost, type AdminBody } from "@/lib/adminApi";
import { errorResponse, successResponse } from "@/lib/api-response";
import WorkshopModel from "@/models/Workshop";
import { updateWorkshopSchema, validationMessage } from "@/lib/validation/schemas";

export const runtime = "nodejs";

export const POST = adminPost(async (body: AdminBody) => {
  const parsed = updateWorkshopSchema.safeParse(body);
  if (!parsed.success) return errorResponse(validationMessage(parsed.error), 400);
  const { key, ...changes } = parsed.data;
  const workshop = await WorkshopModel.findOneAndUpdate(
    { key },
    { $set: changes },
    { new: true, runValidators: true },
  ).select("-templateData").lean();
  if (!workshop) return errorResponse("Event was not found", 404);
  return successResponse(workshop, "Successfully updated event", 1);
}, "Admin event update");
