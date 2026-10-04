import { adminPost, type AdminBody } from "@/lib/adminApi";
import { errorResponse, successResponse } from "@/lib/api-response";
import WorkshopModel from "@/models/Workshop";
import { updateWorkshopSchema, validationMessage } from "@/lib/validation/schemas";

export const runtime = "nodejs";

export const POST = adminPost(async (body: AdminBody) => {
  const parsed = updateWorkshopSchema.safeParse(body);
  if (!parsed.success) return errorResponse(validationMessage(parsed.error), 400);
  const { key, imageBase64, imageExt, layout, ...changes } = parsed.data;
  const updateFields: Record<string, unknown> = { ...changes };
  if (layout) updateFields.layout = layout;
  if (imageBase64 && imageExt && layout) {
    const mimeType = imageExt === "jpg" || imageExt === "jpeg" ? "image/jpeg" : "image/png";
    updateFields.templateData = `data:${mimeType};base64,${imageBase64}`;
    updateFields.templatePath = `/api/templates/${key}`;
  }
  const workshop = await WorkshopModel.findOneAndUpdate(
    { key },
    { $set: updateFields },
    { new: true, runValidators: true },
  ).select("-templateData").lean();
  if (!workshop) return errorResponse("Event was not found", 404);
  return successResponse(workshop, "Successfully updated event", 1);
}, "Admin event update");
