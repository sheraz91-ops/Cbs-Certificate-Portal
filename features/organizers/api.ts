import { getData, postData } from "@/lib/api-client";
import { createOrganizerSchema, organizerDetailsSchema, organizerLoginSchema, updateOrganizerSchema } from "@/lib/validation/schemas";
import type { EventOption } from "@/features/events/api";
import type { UserProfileInput } from "@/types/user";

export type OrganizerSummary = {
  organizerId: string;
  emailAddress: string;
  fullName: string;
  registrationNumber: string;
  department: string;
  workshops: string[];
  isActive: boolean;
  createdAt: string;
};

export type CreateOrganizerInput = UserProfileInput & {
  password: string;
  workshops: string[];
};

export type OrganizerDetails = OrganizerSummary & UserProfileInput;
export type UpdateOrganizerInput = UserProfileInput & { organizerId: string; workshops: string[]; password?: string };

export type OrganizerParticipant = {
  participantId: string;
  userId: string;
  name: string;
  attendance: boolean;
  user: {
    emailAddress: string;
    fullName: string;
    registrationNumber: string;
    department: string;
    semester: string;
    section: string;
    institute: string;
    whatsappNumber: string;
  } | null;
};

export function createOrganizer(input: CreateOrganizerInput): Promise<OrganizerSummary> {
  return postData("/api/admin/organizers/create", createOrganizerSchema.parse(input));
}

export function getOrganizers(): Promise<OrganizerSummary[]> {
  return postData("/api/admin/organizers/list", {});
}

export function getOrganizerById(organizerId: string): Promise<OrganizerDetails> {
  return postData("/api/admin/organizers/details", organizerDetailsSchema.parse({ organizerId }));
}

export function updateOrganizer(input: UpdateOrganizerInput): Promise<OrganizerDetails> {
  return postData("/api/admin/organizers/update", updateOrganizerSchema.parse(input));
}

export type OrganizerLoginInput = { email: string; password: string };
export function loginOrganizer(input: OrganizerLoginInput): Promise<{ authenticated: true; fullName: string }> {
  return postData("/api/organizer/session/login", organizerLoginSchema.parse(input));
}

export function getOrganizerSession(): Promise<{ authenticated: true; fullName: string }> {
  return getData("/api/organizer/session/status", { cache: "no-store" });
}

export function logoutOrganizer(): Promise<null> {
  return postData("/api/organizer/session/logout", {});
}

export function getOrganizerEvents(): Promise<EventOption[]> {
  return postData("/api/organizer/events/list", {});
}

export function getEventParticipants(workshop: string): Promise<OrganizerParticipant[]> {
  return postData("/api/organizer/participants/list", { workshop });
}

export function updateAttendance(workshop: string, participantId: string, present: boolean): Promise<{ participantId: string; attendance: boolean }> {
  return postData("/api/organizer/attendance/update", { workshop, participantId, present });
}
