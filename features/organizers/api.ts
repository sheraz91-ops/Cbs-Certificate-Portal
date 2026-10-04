import { getData, postData } from "@/lib/api-client";
import { createOrganizerSchema, organizerDeleteSchema, organizerDetailsSchema, organizerLoginSchema, organizerStatusSchema, organizerAssignmentSchema, updateOrganizerSchema } from "@/lib/validation/schemas";
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

export type OrganizerSessionSummary = { id: string; organizerId: string; fullName: string; emailAddress: string; createdAt: string; expiresAt: string };
export function getOrganizerSessions(): Promise<OrganizerSessionSummary[]> {
  return postData<OrganizerSessionSummary[], Record<string, never>>("/api/admin/organizer-sessions/list", {});
}
export function revokeOrganizerSession(id: string): Promise<null> {
  return postData<null, { id: string }>("/api/admin/organizer-sessions/revoke", { id });
}

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

export function setOrganizerActive(organizerId: string, isActive: boolean): Promise<{ organizerId: string; isActive: boolean }> {
  return postData("/api/admin/organizers/status", organizerStatusSchema.parse({ organizerId, isActive }));
}

export function deleteOrganizer(organizerId: string, password: string): Promise<null> {
  return postData("/api/admin/organizers/delete", organizerDeleteSchema.parse({ organizerId, password }));
}

export function assignOrganizerEvents(organizerId: string, workshops: string[]): Promise<{ organizerId: string; workshops: string[] }> {
  return postData("/api/admin/organizers/assign", organizerAssignmentSchema.parse({ organizerId, workshops }));
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
