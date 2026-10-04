import { DEFAULT_LAYOUT_CONFIG, ORG_CONFIG } from "@/config/certificate.config";
import { errorResponse, successResponse } from "@/lib/api-response";
import { adminPost, type AdminBody } from "@/lib/adminApi";
import WorkshopModel from "@/models/Workshop";
import type { LayoutConfig, WorkshopDefinition } from "@/types/workshop";
import { createWorkshopSchema, validationMessage } from "@/lib/validation/schemas";

export const runtime = "nodejs";

export const POST = adminPost(async (body: AdminBody) => {
  const parsed = createWorkshopSchema.safeParse(body);
  if (!parsed.success) return errorResponse(validationMessage(parsed.error), 400);
  const { key, workshopName, workshopFullTitle, workshopCode, eventYear, eventDate, isActive, allowOutsiders, registrationFields, imageExt, imageBase64, layout } = parsed.data;
  if (await WorkshopModel.exists({ key })) return errorResponse(`Event key "${key}" already exists`, 409);

  const extension = imageExt ?? "png";
  const mimeType = extension === "jpg" || extension === "jpeg" ? "image/jpeg" : "image/png";
  const imageData = imageBase64 ?? "";
  const workshopLayout: LayoutConfig = layout ?? DEFAULT_LAYOUT_CONFIG;
  const workshop: WorkshopDefinition = {
    key,
    workshopName,
    workshopFullTitle,
    workshopCode,
    eventYear,
    eventDate,
    isActive,
    allowOutsiders,
    registrationFields,
    organizedBy: `${ORG_CONFIG.organizationName} (${ORG_CONFIG.institutionAbbreviation})`,
    templatePath: imageData ? `/api/templates/${key}` : "Not set",
    layout: workshopLayout,
  };

  await WorkshopModel.create({ ...workshop, templateData: imageData ? `data:${mimeType};base64,${imageData}` : null });
  return successResponse({
    workshop: { key, workshopName: workshop.workshopName, isActive },
    note: imageData
      ? layout ? "Event and template saved to MongoDB with a custom layout." : "Event and template saved to MongoDB."
      : "Event saved without a template image. Add a template before generating certificates.",
  }, "Successfully created event", 1, 201);
}, "Admin event create");
