import { adminPost, type AdminBody } from "@/lib/adminApi";
import { errorResponse, successResponse } from "@/lib/api-response";
import { normalizeParticipantId } from "@/lib/participantId";
import ParticipantModel from "@/models/Participant";
import UserModel from "@/models/User";
import WorkshopModel from "@/models/Workshop";
import type { ParticipantRecord } from "@/types/participant";
import { addParticipantsSchema, validationMessage } from "@/lib/validation/schemas";

export const runtime = "nodejs";

export const POST = adminPost(async (body: AdminBody) => {
  const parsed = addParticipantsSchema.safeParse(body);
  if (!parsed.success) return errorResponse(validationMessage(parsed.error), 400);
  const { workshop, userIds } = parsed.data;
  if (!await WorkshopModel.exists({ key: workshop })) return errorResponse("Workshop was not found", 404);

  const users = await UserModel.find({ userId: { $in: userIds } }).lean();
  const usersById = new Map(users.map((user) => [user.userId, user]));
  const unknownIds = userIds.filter((userId) => !usersById.has(userId));
  if (unknownIds.length) return errorResponse(`User ID(s) not found: ${unknownIds.join(", ")}`, 404);

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

  if (!enrollments.length) return errorResponse("No new users were added to this workshop", 409);
  await ParticipantModel.insertMany(enrollments, { ordered: false });
  return successResponse({
    added: enrollments.length,
    assignedIds: enrollments.map((entry) => `${entry.userId} -> ${entry.id}`),
    skipped,
  }, "Successfully added users to workshop", enrollments.length, 201);
}, "Admin participant add");
