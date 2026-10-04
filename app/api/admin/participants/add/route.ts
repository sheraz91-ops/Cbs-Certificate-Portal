import { adminPost, type AdminBody } from "@/lib/adminApi";
import { errorResponse, successResponse } from "@/lib/api-response";
import { normalizeParticipantId } from "@/lib/participantId";
import ParticipantModel from "@/models/Participant";
import UserModel from "@/models/User";
import WorkshopModel from "@/models/Workshop";
import type { ParticipantRecord } from "@/types/participant";
import { addParticipantsSchema, validationMessage } from "@/lib/validation/schemas";
import { allocateParticipantIds } from "@/lib/participantSequence";

export const runtime = "nodejs";

export const POST = adminPost(async (body: AdminBody) => {
  const parsed = addParticipantsSchema.safeParse(body);
  if (!parsed.success) return errorResponse(validationMessage(parsed.error), 400);
  const { workshop, userIds } = parsed.data;
  if (!await WorkshopModel.exists({ key: workshop })) return errorResponse("Event was not found", 404);

  const users = await UserModel.find({ userId: { $in: userIds } }).lean();
  const usersById = new Map(users.map((user) => [user.userId, user]));
  const unknownIds = userIds.filter((userId) => !usersById.has(userId));
  if (unknownIds.length) return errorResponse(`User ID(s) not found: ${unknownIds.join(", ")}`, 404);

  const existing = await ParticipantModel.find({ workshop }).select("id userId").lean();
  const enrolledUserIds = new Set(existing.map((participant) => participant.userId).filter(Boolean));
  const skipped: string[] = [];
  const usersToEnroll = userIds.flatMap((userId) => {
    const user = usersById.get(userId);
    if (!user) return [];
    if (enrolledUserIds.has(userId)) {
      skipped.push(`${user.fullName} (${userId} is already enrolled)`);
      return [];
    }
    enrolledUserIds.add(userId);
    return [user];
  });
  if (!usersToEnroll.length) return errorResponse("No new users were added to this event", 409);

  const assignedIds = await allocateParticipantIds(workshop, usersToEnroll.length);
  const enrollments = usersToEnroll.map((user, index): ParticipantRecord & { enrollmentKey: string } => {
    const id = assignedIds[index];
    return { userId: user.userId, id, normalizedId: normalizeParticipantId(id), name: user.fullName, workshop, enrollmentKey: `${workshop}:${user.userId}` };
  });
  await ParticipantModel.insertMany(enrollments, { ordered: false });
  return successResponse({
    added: enrollments.length,
    assignedIds: enrollments.map((entry) => `${entry.userId} -> ${entry.id}`),
    skipped,
  }, "Successfully added users to event", enrollments.length, 201);
}, "Admin participant add");
