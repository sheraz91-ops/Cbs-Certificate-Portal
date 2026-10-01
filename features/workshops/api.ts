import { getData, postData } from "@/lib/api-client";
import type { WorkshopDefinition } from "@/types/workshop";

export type WorkshopSummary = Pick<WorkshopDefinition, "key" | "workshopName">;
export type WorkshopDetails = WorkshopDefinition & { participants: { id: string; name: string; workshop: string; userId?: string }[] };

export function getWorkshops(): Promise<WorkshopSummary[]> {
  return getData<WorkshopSummary[]>("/api/workshops");
}

export function getAdminWorkshops(password: string): Promise<WorkshopSummary[]> {
  return postData<WorkshopSummary[], { password: string; action: string }>("/api/admin", { password, action: "list" });
}

export function getWorkshopDetails(password: string): Promise<WorkshopDetails[]> {
  return postData<WorkshopDetails[], { password: string; action: string }>("/api/admin", { password, action: "workshop-details" });
}

export type AddWorkshopInput = {
  key: string;
  workshopName: string;
  workshopFullTitle: string;
  workshopCode: string;
  eventYear: string;
  eventDate: string;
  imageBase64?: string;
  imageExt?: string;
  layout?: unknown;
};

export type AddWorkshopResult = { workshop: WorkshopSummary; note: string };
export function addWorkshop(password: string, input: AddWorkshopInput): Promise<AddWorkshopResult> {
  return postData<AddWorkshopResult, { password: string; action: string } & AddWorkshopInput>("/api/admin", { password, action: "add-workshop", ...input });
}

export type DeleteWorkshopResult = { deletedParticipants: number };
export function deleteWorkshop(password: string, workshop: string): Promise<DeleteWorkshopResult> {
  return postData<DeleteWorkshopResult, { password: string; action: string; workshop: string }>("/api/admin", { password, action: "delete-workshop", workshop });
}
