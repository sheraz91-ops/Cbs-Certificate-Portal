import { NextRequest } from "next/server";
import { DEFAULT_LAYOUT_CONFIG, ORG_CONFIG } from "@/config/certificate.config";
import { checkAdminPassword } from "@/lib/adminAuth";
import { connectToDatabase } from "@/lib/mongodb";
import { normalizeParticipantId } from "@/lib/participantId";
import { errorResponse, successResponse } from "@/lib/api-response";
import ParticipantModel from "@/models/Participant";
import UserModel from "@/models/User";
import UserSequenceModel from "@/models/UserSequence";
import WorkshopModel from "@/models/Workshop";
import type { LayoutConfig, WorkshopDefinition } from "@/types/workshop";
import type { Participant } from "@/types";
import type { ParticipantRecord } from "@/types/participant";
import type { UserProfileInput, UserRecord, UserSummary } from "@/types/user";

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

    await connectToDatabase();
    const action = body.action;
    switch (action) {
      case "list": {
        const workshops = await WorkshopModel.find().sort({ eventYear: -1, workshopName: 1 }).select("key workshopName").lean();
        return successResponse(workshops, "Successfully retrieved workshops", workshops.length);
      }
      case "users-list": {
        const records = await UserModel.find().sort({ userId: 1 }).select("userId fullName emailAddress registrationNumber department").lean();
        const users: UserSummary[] = records.map((user) => ({
          userId: user.userId,
          fullName: user.fullName,
          emailAddress: user.emailAddress,
          registrationNumber: user.registrationNumber,
          department: user.department,
        }));
        return successResponse(users, "Successfully retrieved users", users.length);
      }
      case "user-details":
        return await getUserDetails(body);
      case "workshop-details": {
        const [workshops, participants] = await Promise.all([
          WorkshopModel.find().sort({ eventYear: -1, workshopName: 1 }).select("-templateData").lean(),
          ParticipantModel.find().sort({ workshop: 1, id: 1 }).lean(),
        ]);
        const participantsByWorkshop = new Map<string, Participant[]>();
        for (const participant of participants) {
          const group = participantsByWorkshop.get(participant.workshop) ?? [];
          group.push({ id: participant.id, name: participant.name, workshop: participant.workshop, userId: participant.userId });
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
      case "create-user":
        return await createUser(body);
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

async function createUser(body: AdminBody) {
  const requiredFields = ["emailAddress", "fullName", "registrationNumber", "department", "semester", "section", "institute", "whatsappNumber", "cnic"] as const;
  const values = Object.fromEntries(requiredFields.map((field) => [field, typeof body[field] === "string" ? (body[field] as string).trim() : ""])) as Record<typeof requiredFields[number], string>;
  const missing = requiredFields.filter((field) => !values[field]);
  if (missing.length) return jsonError(`Missing required field(s): ${missing.join(", ")}`, 400);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.emailAddress)) return jsonError("Email address is invalid", 400);

  const sequence = await UserSequenceModel.findOneAndUpdate(
    { _id: "users" },
    { $inc: { sequence: 1 } },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );
  if (!sequence) return jsonError("Unable to assign a user ID", 500);

  const userId = `CBSU-${String(sequence.sequence).padStart(6, "0")}`;
  const profile = values satisfies UserProfileInput;
  const user = await UserModel.create({ userId, ...profile });
  const result: UserRecord = {
    userId: user.userId,
    emailAddress: user.emailAddress,
    fullName: user.fullName,
    registrationNumber: user.registrationNumber,
    department: user.department,
    semester: user.semester,
    section: user.section,
    institute: user.institute,
    whatsappNumber: user.whatsappNumber,
    cnic: user.cnic,
    createdAt: user.createdAt.toISOString(),
  };
  return successResponse(result, "Successfully created user", 1, 201);
}

async function getUserDetails(body: AdminBody) {
  const userId = typeof body.userId === "string" ? body.userId.trim().toUpperCase() : "";
  if (!userId) return jsonError("An assigned user ID is required", 400);
  const user = await UserModel.findOne({ userId }).lean();
  if (!user) return jsonError(`User "${userId}" was not found`, 404);

  const result: UserRecord = {
    userId: user.userId,
    emailAddress: user.emailAddress,
    fullName: user.fullName,
    registrationNumber: user.registrationNumber,
    department: user.department,
    semester: user.semester,
    section: user.section,
    institute: user.institute,
    whatsappNumber: user.whatsappNumber,
    cnic: user.cnic,
    createdAt: user.createdAt.toISOString(),
  };
  return successResponse(result, "Successfully retrieved user", 1);
}

async function addParticipants(body: AdminBody) {
  const workshop = typeof body.workshop === "string" ? body.workshop.trim().toLowerCase() : "";
  if (!workshop) return jsonError("A workshop key is required", 400);
  if (!await WorkshopModel.exists({ key: workshop })) return jsonError("Workshop was not found", 404);
  if (!Array.isArray(body.userIds)) return jsonError("User IDs are required", 400);

  const userIds = [...new Set(body.userIds.filter((value): value is string => typeof value === "string").map((value) => value.trim().toUpperCase()).filter(Boolean))];
  if (!userIds.length) return jsonError("Enter at least one assigned user ID", 400);

  const users = await UserModel.find({ userId: { $in: userIds } }).lean();
  const usersById = new Map(users.map((user) => [user.userId, user]));
  const unknownIds = userIds.filter((userId) => !usersById.has(userId));
  if (unknownIds.length) return jsonError(`User ID(s) not found: ${unknownIds.join(", ")}`, 404);

  const existing = await ParticipantModel.find({ workshop }).select("id userId").lean();
  const usedCertificateIds = new Set(existing.map((participant) => participant.id));
  const enrolledUserIds = new Set(existing.map((participant) => participant.userId).filter(Boolean));
  let nextId = existing.reduce((max, participant) => Math.max(max, Number.parseInt(participant.id.replace(/\D/g, ""), 10) || 0), 0) + 1;
  const enrollments: ParticipantRecord[] = [];
  const skipped: string[] = [];

  for (const userId of userIds) {
    const user = usersById.get(userId);
    if (!user) continue;
    if (enrolledUserIds.has(userId)) {
      skipped.push(`${user.fullName} (${userId} is already enrolled)`);
      continue;
    }
    while (usedCertificateIds.has(String(nextId))) nextId += 1;
    const id = String(nextId++);
    usedCertificateIds.add(id);
    enrolledUserIds.add(userId);
    enrollments.push({ userId, id, normalizedId: normalizeParticipantId(id), name: user.fullName, workshop });
  }

  if (!enrollments.length) return jsonError("No new users were added to this workshop", 409);
  await ParticipantModel.insertMany(enrollments, { ordered: false });
  return successResponse({
    added: enrollments.length,
    assignedIds: enrollments.map((entry) => `${entry.userId} -> ${entry.id}`),
    skipped,
  }, "Successfully added users to workshop", enrollments.length, 201);
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
