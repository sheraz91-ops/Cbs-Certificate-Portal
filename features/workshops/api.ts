import { getData, postData } from "@/lib/api-client";
import type { WorkshopDefinition } from "@/types/workshop";
import { createWorkshopSchema, updateWorkshopSchema, workshopKeyBodySchema } from "@/lib/validation/schemas";

export type WorkshopSummary = Pick<WorkshopDefinition, "key" | "workshopName" | "isCompleted">;
export type WorkshopDetails = WorkshopDefinition & { participants: { id: string; name: string; workshop: string; userId?: string; customFields?: Record<string, string> }[]; organizers: { organizerId: string; fullName: string; emailAddress: string; isActive: boolean }[] };

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
  isActive: boolean;
  isCompleted?: boolean;
  allowOutsiders: boolean;
  confirmationMessage?: string;
  registrationFields: { key: string; label: string; type?: "text" | "yes_no" | "checkbox" | "matrix"; choices?: string[]; rows?: string[]; selectionMode?: "multiple" | "single"; required: boolean }[];
  imageBase64?: string;
  imageExt?: string;
  layout?: unknown;
};

export type AddWorkshopResult = { workshop: WorkshopSummary; note: string };
export function addWorkshop(input: AddWorkshopInput): Promise<AddWorkshopResult> {
  return postData<AddWorkshopResult, AddWorkshopInput>("/api/admin/workshops/create", createWorkshopSchema.parse(input));
}

export type UpdateWorkshopInput = {
  key: string;
  workshopName: string;
  workshopFullTitle: string;
  workshopCode: string;
  eventYear: string;
  eventDate: string;
  isActive: boolean;
  isCompleted: boolean;
  allowOutsiders: boolean;
  confirmationMessage: string;
  registrationFields: { key: string; label: string; type?: "text" | "yes_no" | "checkbox" | "matrix"; choices?: string[]; rows?: string[]; selectionMode?: "multiple" | "single"; required: boolean }[];
  imageBase64?: string;
  imageExt?: string;
  layout?: unknown;
};

export function updateWorkshop(input: UpdateWorkshopInput): Promise<WorkshopDefinition> {
  return postData<WorkshopDefinition, UpdateWorkshopInput>("/api/admin/workshops/update", updateWorkshopSchema.parse(input));
}

export type DeleteWorkshopResult = { deletedParticipants: number };
export function deleteWorkshop(workshop: string): Promise<DeleteWorkshopResult> {
  return postData<DeleteWorkshopResult, { workshop: string }>("/api/admin/workshops/delete", workshopKeyBodySchema.parse({ workshop }));
}
