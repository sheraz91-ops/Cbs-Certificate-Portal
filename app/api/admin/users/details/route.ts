import { adminPost, type AdminBody } from "@/lib/adminApi";
import { errorResponse, successResponse } from "@/lib/api-response";
import UserModel from "@/models/User";
import type { UserDetailsRecord } from "@/types/user";
import { userDetailsSchema, validationMessage } from "@/lib/validation/schemas";
import ParticipantModel from "@/models/Participant";
import WorkshopModel from "@/models/Workshop";
import { formatCertificateId } from "@/lib/formatId";
import type { WorkshopDefinition } from "@/types/workshop";

export const runtime = "nodejs";

export const POST = adminPost(async (body: AdminBody) => {
  const parsed = userDetailsSchema.safeParse(body);
  if (!parsed.success) return errorResponse(validationMessage(parsed.error), 400);
  const { userId } = parsed.data;
  const user = await UserModel.findOne({ userId }).lean();
  if (!user) return errorResponse(`User "${userId}" was not found`, 404);

  const [participants, workshops] = await Promise.all([
    ParticipantModel.find({ userId }).sort({ createdAt: -1 }).lean(),
    WorkshopModel.find().select("-templateData").lean() as unknown as Promise<WorkshopDefinition[]>,
  ]);
  const workshopsByKey = new Map(workshops.map((item) => [item.key, item]));
  const result: UserDetailsRecord = {
    userId: user.userId,
    emailAddress: user.emailAddress ?? "",
    fullName: user.fullName,
    registrationNumber: user.registrationNumber,
    department: user.department ?? "",
    semester: user.semester,
    section: user.section ?? "",
    institute: user.institute ?? "",
    whatsappNumber: user.whatsappNumber,
    isActive: user.isActive !== false,
    createdAt: user.createdAt.toISOString(),
    enrollments: participants.flatMap((participant) => {
      const workshop = workshopsByKey.get(participant.workshop);
      if (!workshop) return [];
      return [{
        workshopKey: workshop.key,
        workshopName: workshop.workshopName,
        eventYear: workshop.eventYear,
        eventDate: workshop.eventDate,
        participantId: participant.id,
        certificateId: formatCertificateId(participant.id, workshop),
        attendance: participant.attendance === true,
      }];
    }),
  };
  return successResponse(result, "Successfully retrieved user", 1);
}, "Admin user details");
