import { adminPost } from "@/lib/adminApi";
import { successResponse } from "@/lib/api-response";
import ParticipantModel from "@/models/Participant";
import WorkshopModel from "@/models/Workshop";
import type { Participant } from "@/types";

export const runtime = "nodejs";

export const POST = adminPost(async () => {
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
    isActive: workshop.isActive !== false,
    participants: participantsByWorkshop.get(workshop.key) ?? [],
  }));
  return successResponse(content, "Successfully retrieved workshop details", content.length);
}, "Admin workshop details");
