import { postData } from "@/lib/api-client";

export type AddParticipantsResult = { added: number; assignedIds: string[]; skipped: string[] };

export function addParticipants(password: string, workshop: string, userIds: string[]): Promise<AddParticipantsResult> {
  return postData<AddParticipantsResult, { password: string; action: string; workshop: string; userIds: string[] }>("/api/admin", { password, action: "add-participants", workshop, userIds });
}

export function deleteParticipant(password: string, participant: { id: string; name: string; workshop: string }): Promise<null> {
  return postData<null, { password: string; action: string; workshop: string; id: string; name: string }>("/api/admin", { password, action: "delete-participant", ...participant });
}
