import { postData } from "@/lib/api-client";

export type ParticipantEntry = { id: string; name: string };
export type AddParticipantsResult = { added: number; assignedIds: string[]; skipped: string[] };

export function addParticipants(password: string, workshop: string, entries: ParticipantEntry[]): Promise<AddParticipantsResult> {
  return postData<AddParticipantsResult, { password: string; action: string; workshop: string; entries: ParticipantEntry[] }>("/api/admin", { password, action: "add-participants", workshop, entries });
}

export function deleteParticipant(password: string, participant: ParticipantEntry & { workshop: string }): Promise<null> {
  return postData<null, { password: string; action: string; workshop: string; id: string; name: string }>("/api/admin", { password, action: "delete-participant", ...participant });
}
