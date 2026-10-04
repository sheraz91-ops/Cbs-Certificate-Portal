import { adminPost } from "@/lib/adminApi";
import { successResponse } from "@/lib/api-response";
import ParticipantModel from "@/models/Participant";
import WorkshopModel from "@/models/Workshop";
import OrganizerModel from "@/models/Organizer";
import type { Participant } from "@/types";

export const runtime = "nodejs";

export const POST = adminPost(async () => {
  const [workshops, participants, organizers] = await Promise.all([
    WorkshopModel.find().sort({ eventYear: -1, workshopName: 1 }).select("-templateData").lean(),
    ParticipantModel.find().sort({ workshop: 1, id: 1 }).lean(),
    OrganizerModel.find().sort({ fullName: 1 }).select("organizerId fullName emailAddress workshops isActive").lean(),
  ]);
  const participantsByWorkshop = new Map<string, Participant[]>();
  for (const participant of participants) {
    const group = participantsByWorkshop.get(participant.workshop) ?? [];
    group.push({ id: participant.id, name: participant.name, workshop: participant.workshop, userId: participant.userId, customFields: participant.customFields as Record<string, string> | undefined });
    participantsByWorkshop.set(participant.workshop, group);
  }
  const content = workshops.map((workshop) => ({
    ...workshop,
    isActive: workshop.isActive !== false,
    participants: participantsByWorkshop.get(workshop.key) ?? [],
    organizers: organizers.filter((organizer) => (organizer.workshops ?? []).includes(workshop.key)).map((organizer) => ({ organizerId: organizer.organizerId, fullName: organizer.fullName, emailAddress: organizer.emailAddress, isActive: organizer.isActive !== false })),
  }));
  return successResponse(content, "Successfully retrieved event details", content.length);
}, "Admin event details");
