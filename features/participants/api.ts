import { postData } from "@/lib/api-client";
import { addParticipantsSchema, participantDeleteSchema } from "@/lib/validation/schemas";

export type AddParticipantsResult = { added: number; assignedIds: string[]; skipped: string[] };

export function addParticipants(workshop: string, userIds: string[]): Promise<AddParticipantsResult> {
  return postData<AddParticipantsResult, { workshop: string; userIds: string[] }>("/api/admin/participants/add", addParticipantsSchema.parse({ workshop, userIds }));
}

export function deleteParticipant(participant: { id: string; name: string; workshop: string }): Promise<null> {
  return postData<null, { workshop: string; id: string; name: string }>("/api/admin/participants/delete", participantDeleteSchema.parse(participant));
}
