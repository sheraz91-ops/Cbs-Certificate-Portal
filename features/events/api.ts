import { getData, postData } from "@/lib/api-client";
import type { z } from "zod";
import {
  eventRegistrationSchema,
  existingAccountLookupSchema,
} from "@/lib/validation/schemas";
import type { RegistrationFieldType } from "@/types/workshop";

export type EventOption = {
  key: string;
  workshopName: string;
  workshopFullTitle: string;
  workshopCode: string;
  eventYear: string;
  eventDate: string;
  isActive: boolean;
  isCompleted?: boolean;
  allowOutsiders?: boolean;
  confirmationMessage?: string;
  registrationFields?: { key: string; label: string; type?: RegistrationFieldType; choices?: string[]; rows?: string[]; selectionMode?: "multiple" | "single"; required: boolean }[];
};

export type EventRegistrationInput = z.input<typeof eventRegistrationSchema>;
export type ExistingAccountMatch = {
  userId: string;
  fullName: string;
  registrationNumber: string;
  emailAddress: string;
  department: string;
  semester: string;
  section: string;
  institute: string;
  whatsappNumber: string;
};
export type EventRegistrationResult =
  | {
      userId: string;
      certificateId: string;
      eventName: string;
    }
  | {
    existingUser: ExistingAccountMatch;
    };

export function getEvents(): Promise<EventOption[]> {
  return getData<EventOption[]>("/api/events");
}

export function getEventByCode(eventCode: string): Promise<EventOption> {
  return getData<EventOption>(`/api/events/${encodeURIComponent(eventCode)}`);
}

export function lookupExistingAccount(input: z.input<typeof existingAccountLookupSchema>): Promise<ExistingAccountMatch> {
  const data = existingAccountLookupSchema.parse(input);
  return postData<ExistingAccountMatch, typeof data>("/api/events/account", data);
}

export function registerForEvent(input: EventRegistrationInput): Promise<EventRegistrationResult> {
  const data = eventRegistrationSchema.parse(input);
  return postData<EventRegistrationResult, typeof data>("/api/events/register", data);
}
