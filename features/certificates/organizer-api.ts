import { postData } from "@/lib/api-client";
import type { WorkshopDefinition } from "@/types/workshop";
import { organizerCertificateGenerateSchema, organizerCertificateIdentitySchema } from "@/lib/validation/schemas";

export type OrganizerCertificateIdentity = { organizerId: string; fullName: string };
export type OrganizerCertificate = { fullName: string; organizerId: string; workshop: WorkshopDefinition };

export function getOrganizerAssignedEvents(input: OrganizerCertificateIdentity): Promise<WorkshopDefinition[]> {
  return postData<WorkshopDefinition[], OrganizerCertificateIdentity>("/api/certificates/organizer/assigned-events", organizerCertificateIdentitySchema.parse(input));
}

export function prepareOrganizerCertificate(input: OrganizerCertificateIdentity & { workshop: string }): Promise<OrganizerCertificate> {
  return postData<OrganizerCertificate, typeof input>("/api/certificates/organizer/generate", organizerCertificateGenerateSchema.parse(input));
}
