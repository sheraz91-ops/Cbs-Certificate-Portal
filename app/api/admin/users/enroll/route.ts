import { adminPost, type AdminBody } from "@/lib/adminApi";
import { errorResponse, successResponse } from "@/lib/api-response";
import { formatCertificateId } from "@/lib/formatId";
import { normalizeParticipantId } from "@/lib/participantId";
import { allocateParticipantIds } from "@/lib/participantSequence";
import ParticipantModel from "@/models/Participant";
import UserModel from "@/models/User";
import WorkshopModel from "@/models/Workshop";
import { assignUserEventSchema, validationMessage } from "@/lib/validation/schemas";
import type { WorkshopDefinition } from "@/types/workshop";

export const runtime = "nodejs";

export const POST = adminPost(async (body: AdminBody) => {
  const parsed = assignUserEventSchema.safeParse(body);
  if (!parsed.success) return errorResponse(validationMessage(parsed.error), 400);
  const { userId, workshop: workshopKey } = parsed.data;
  const [user, workshop, existing] = await Promise.all([
    UserModel.findOne({ userId }).lean(),
    WorkshopModel.findOne({ key: workshopKey }).select("-templateData").lean() as unknown as Promise<WorkshopDefinition | null>,
    ParticipantModel.findOne({ userId, workshop: workshopKey }).select("_id").lean(),
  ]);
  if (!user) return errorResponse("User was not found", 404);
  if (!workshop) return errorResponse("Event was not found", 404);
  if (existing) return errorResponse("User is already enrolled in this event", 409);

  const [id] = await allocateParticipantIds(workshopKey, 1);
  try {
    await ParticipantModel.create({
      id,
      normalizedId: normalizeParticipantId(id),
      userId,
      name: user.fullName,
      workshop: workshopKey,
      enrollmentKey: `${workshopKey}:${userId}`,
      attendance: false,
    });
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === 11000) {
      return errorResponse("User is already enrolled in this event", 409);
    }
    throw error;
  }

  return successResponse({
    workshopKey,
    workshopName: workshop.workshopName,
    certificateId: formatCertificateId(id, workshop),
    attendance: false,
  }, "Successfully enrolled user in event", 1, 201);
}, "Admin user enroll");
