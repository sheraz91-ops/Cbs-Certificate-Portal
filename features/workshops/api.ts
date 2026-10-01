import { getData, postData } from "@/lib/api-client";
import type { WorkshopDefinition } from "@/types/workshop";
import { createWorkshopSchema, workshopKeyBodySchema } from "@/lib/validation/schemas";

export type WorkshopSummary = Pick<WorkshopDefinition, "key" | "workshopName">;
export type WorkshopDetails = WorkshopDefinition & { participants: { id: string; name: string; workshop: string; userId?: string }[] };

export function getWorkshops(): Promise<WorkshopSummary[]> {
  return getData<WorkshopSummary[]>("/api/workshops");
}

export function getAdminWorkshops(): Promise<WorkshopSummary[]> {
  return postData<WorkshopSummary[], Record<string, never>>("/api/admin/workshops/list", {});
}

export function getWorkshopDetails(): Promise<WorkshopDetails[]> {
  return postData<WorkshopDetails[], Record<string, never>>("/api/admin/workshops/details", {});
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
export function addWorkshop(input: AddWorkshopInput): Promise<AddWorkshopResult> {
  return postData<AddWorkshopResult, AddWorkshopInput>("/api/admin/workshops/create", createWorkshopSchema.parse(input));
}

export type DeleteWorkshopResult = { deletedParticipants: number };
export function deleteWorkshop(workshop: string): Promise<DeleteWorkshopResult> {
  return postData<DeleteWorkshopResult, { workshop: string }>("/api/admin/workshops/delete", workshopKeyBodySchema.parse({ workshop }));
}
