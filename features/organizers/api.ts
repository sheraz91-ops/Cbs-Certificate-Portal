import { getData, postData } from "@/lib/api-client";
import { createOrganizerSchema, organizerAttendanceBatchSchema, organizerDeleteSchema, organizerDetailsSchema, organizerLoginSchema, organizerStatusSchema, organizerAssignmentSchema, updateOrganizerSchema } from "@/lib/validation/schemas";
import type { EventOption } from "@/features/events/api";
import type { AdminUserProfileInput, UserProfileInput } from "@/types/user";

export type OrganizerSummary = {
  organizerId: string;
  emailAddress: string;
  fullName: string;
  registrationNumber: string;
  department: string;
  workshops: string[];
  isActive: boolean;
  allowLocalAttendance: boolean;
  createdAt: string;
};

export type CreateOrganizerInput = Omit<AdminUserProfileInput, "emailAddress"> & {
  emailAddress: string;
  password: string;
  workshops: string[];
};

export type OrganizerDetails = OrganizerSummary & UserProfileInput;
export type UpdateOrganizerInput = AdminUserProfileInput & { organizerId: string; workshops: string[]; allowLocalAttendance: boolean; password?: string };

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

export type OrganizerEvent = EventOption & { allowLocalAttendance: boolean };

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

export function getOrganizerSession(): Promise<{ authenticated: true; fullName: string; allowLocalAttendance: boolean }> {
  return getData("/api/organizer/session/status", { cache: "no-store" });
}

export function logoutOrganizer(): Promise<null> {
  return postData("/api/organizer/session/logout", {});
}

export function getOrganizerEvents(): Promise<OrganizerEvent[]> {
  return postData<OrganizerEvent[], Record<string, never>>("/api/organizer/events/list", {});
}

export function getEventParticipants(workshop: string): Promise<OrganizerParticipant[]> {
  return postData("/api/organizer/participants/list", { workshop });
}

export function updateAttendance(workshop: string, participantId: string, present: boolean): Promise<{ participantId: string; attendance: boolean }> {
  return postData("/api/organizer/attendance/update", { workshop, participantId, present });
}

export async function syncAttendance(workshop: string, attendance: { participantId: string; present: boolean }[]): Promise<{ updated: number }> {
  let updated = 0;
  for (let offset = 0; offset < attendance.length; offset += 5000) {
    const batch = attendance.slice(offset, offset + 5000);
    const parsed = organizerAttendanceBatchSchema.parse({ workshop, attendance: batch });
    const result = await postData<{ updated: number }, typeof parsed>("/api/organizer/attendance/sync", parsed);
    updated += result.updated;
  }
  return { updated };
}
