import { NextRequest } from "next/server";
import { DEFAULT_LAYOUT_CONFIG, ORG_CONFIG } from "@/config/certificate.config";
import { checkAdminPassword } from "@/lib/adminAuth";
import { ensureDatabaseSeeded } from "@/lib/seedDatabase";
import { normalizeParticipantId } from "@/lib/participantId";
import { errorResponse, successResponse } from "@/lib/api-response";
import ParticipantModel from "@/models/Participant";
import WorkshopModel from "@/models/Workshop";
import type { LayoutConfig, WorkshopDefinition } from "@/config/workshops";
import type { Participant } from "@/types";

export const runtime = "nodejs";

type AdminBody = {
  password?: unknown;
  action?: unknown;
  [key: string]: unknown;
};

function jsonError(message: string, status: number) {
  return errorResponse(message, status);
}

export async function POST(request: NextRequest) {
  let body: AdminBody;
  try {
    body = await request.json() as AdminBody;
  } catch {
    return jsonError("Invalid JSON body", 400);
  }

  try {
    if (typeof body.password !== "string" || !checkAdminPassword(body.password)) {
      return jsonError("Invalid admin password", 401);
    }

    await ensureDatabaseSeeded();
    const action = body.action;
    switch (action) {
      case "list": {
        const workshops = await WorkshopModel.find().sort({ eventYear: -1, workshopName: 1 }).select("key workshopName").lean();
        return successResponse(workshops, "Successfully retrieved workshops", workshops.length);
      }
      case "workshop-details": {
        const [workshops, participants] = await Promise.all([
          WorkshopModel.find().sort({ eventYear: -1, workshopName: 1 }).select("-templateData").lean(),
          ParticipantModel.find().sort({ workshop: 1, id: 1 }).lean(),
        ]);
        const participantsByWorkshop = new Map<string, Participant[]>();
        for (const participant of participants) {
          const group = participantsByWorkshop.get(participant.workshop) ?? [];
          group.push({ id: participant.id, name: participant.name, workshop: participant.workshop });
          participantsByWorkshop.set(participant.workshop, group);
        }
        const content = workshops.map((workshop) => ({
            ...workshop,
            participants: participantsByWorkshop.get(workshop.key) ?? [],
          }));
        return successResponse(content, "Successfully retrieved workshop details", content.length);
      }
      case "add-workshop":
        return await addWorkshop(body);
      case "add-participants":
        return await addParticipants(body);
      case "delete-workshop":
        return await deleteWorkshop(body);
      case "delete-participant":
        return await deleteParticipant(body);
      default:
        return jsonError(`Unknown action: ${String(action)}`, 400);
    }
  } catch (error) {
    console.error("Admin API error:", error);
    return jsonError(error instanceof Error ? error.message : "Server error", 500);
  }
}

async function addWorkshop(body: AdminBody) {
  const fields = ["key", "workshopName", "workshopFullTitle", "workshopCode", "eventYear", "eventDate"] as const;
  const values = Object.fromEntries(fields.map((field) => [field, body[field]])) as Record<typeof fields[number], unknown>;
  const missing = fields.filter((field) => typeof values[field] !== "string" || !values[field].trim());
  if (missing.length) return jsonError(`Missing required field(s): ${missing.join(", ")}`, 400);

  const key = (values.key as string).trim().toLowerCase();
  if (!/^[a-z0-9-]+$/.test(key)) return jsonError("key must be lowercase letters, numbers, and hyphens only", 400);
  if (await WorkshopModel.exists({ key })) return jsonError(`Workshop key "${key}" already exists`, 409);

  const extension = typeof body.imageExt === "string" ? body.imageExt.toLowerCase() : "png";
  const mimeType = extension === "jpg" || extension === "jpeg" ? "image/jpeg" : "image/png";
  const imageBase64 = typeof body.imageBase64 === "string" ? body.imageBase64.replace(/^data:.*;base64,/, "") : "";
  const layout = body.layout && typeof body.layout === "object" ? body.layout as LayoutConfig : DEFAULT_LAYOUT_CONFIG;
  const workshop: WorkshopDefinition = {
    key,
    workshopName: (values.workshopName as string).trim(),
    workshopFullTitle: (values.workshopFullTitle as string).trim(),
    workshopCode: (values.workshopCode as string).trim().toUpperCase(),
    eventYear: (values.eventYear as string).trim(),
    eventDate: (values.eventDate as string).trim(),
    organizedBy: `${ORG_CONFIG.organizationName} (${ORG_CONFIG.institutionAbbreviation})`,
    templatePath: imageBase64 ? `/api/templates/${key}` : "Not set",
    layout,
  };

  await WorkshopModel.create({ ...workshop, templateData: imageBase64 ? `data:${mimeType};base64,${imageBase64}` : null });
  return successResponse({
    workshop: { key, workshopName: workshop.workshopName },
    note: imageBase64
      ? body.layout ? "Workshop and template saved to MongoDB with a custom layout." : "Workshop and template saved to MongoDB."
      : "Workshop saved without a template image. Add a template before generating certificates.",
  }, "Successfully created workshop", 1, 201);
}

async function addParticipants(body: AdminBody) {
  const workshop = typeof body.workshop === "string" ? body.workshop.trim().toLowerCase() : "";
  if (!workshop) return jsonError("A workshop key is required", 400);
  if (!await WorkshopModel.exists({ key: workshop })) return jsonError("Workshop was not found", 404);

  const entries: { name: string; id: string }[] = Array.isArray(body.entries)
    ? body.entries.map((entry) => ({
        name: typeof (entry as { name?: unknown })?.name === "string" ? (entry as { name: string }).name.trim() : "",
        id: typeof (entry as { id?: unknown })?.id === "string" ? (entry as { id: string }).id.trim() : "",
      }))
    : typeof body.names === "string"
      ? body.names.split("\n").map((line) => {
          const comma = line.lastIndexOf(",");
          return comma < 0 ? { name: line.trim(), id: "" } : { name: line.slice(0, comma).trim(), id: line.slice(comma + 1).trim() };
        })
      : [];
  const validEntries = entries.filter((entry) => entry.name);
  if (!validEntries.length) return jsonError("At least one participant name is required", 400);

  const existing = await ParticipantModel.find({ workshop }).select("id").lean();
  const used = new Set(existing.map((participant) => participant.id));
  const requestedIds = new Set(validEntries.filter((entry) => entry.id).map((entry) => entry.id));
  let nextId = existing.reduce((max, participant) => Math.max(max, Number.parseInt(participant.id.replace(/\D/g, ""), 10) || 0), 0) + 1;
  const newEntries: Participant[] = [];
  const skipped: string[] = [];

  for (const entry of validEntries) {
    while (!entry.id && (used.has(String(nextId)) || requestedIds.has(String(nextId)))) nextId += 1;
    const id = entry.id || String(nextId++);
    if (used.has(id)) {
      skipped.push(`${entry.name} (ID ${id} is already used in this workshop)`);
      continue;
    }
    used.add(id);
    newEntries.push({ id, name: entry.name, workshop });
  }
  if (!newEntries.length) return jsonError("No valid participants could be added", 400);

  await ParticipantModel.insertMany(
    newEntries.map((entry) => ({ ...entry, normalizedId: normalizeParticipantId(entry.id) })),
    { ordered: false },
  );
  return successResponse({ added: newEntries.length, assignedIds: newEntries.map((entry) => `${entry.name} -> ${entry.id}`), skipped }, "Successfully added participants", newEntries.length, 201);
}

async function deleteWorkshop(body: AdminBody) {
  const workshop = typeof body.workshop === "string" ? body.workshop.trim().toLowerCase() : "";
  if (!workshop) return jsonError("A workshop key is required", 400);
  const deleted = await WorkshopModel.findOneAndDelete({ key: workshop });
  if (!deleted) return jsonError(`Workshop "${workshop}" was not found`, 404);
  const result = await ParticipantModel.deleteMany({ workshop });
  return successResponse({ deletedParticipants: result.deletedCount }, "Successfully deleted workshop and its participants", result.deletedCount + 1);
}

async function deleteParticipant(body: AdminBody) {
  const { workshop, id, name } = body;
  if (typeof workshop !== "string" || typeof id !== "string" || typeof name !== "string") {
    return jsonError("workshop, id, and name are required", 400);
  }
  const deleted = await ParticipantModel.findOneAndDelete({ workshop, id, name });
  if (!deleted) return jsonError("Participant was not found", 404);
  return successResponse(null, "Successfully deleted participant", 1);
}
