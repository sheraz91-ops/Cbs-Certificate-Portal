import { getData, postData } from "@/lib/api-client";
import type { z } from "zod";
import { eventRegistrationSchema } from "@/lib/validation/schemas";

export type EventOption = {
  key: string;
  workshopName: string;
  workshopFullTitle: string;
  workshopCode: string;
  eventYear: string;
  eventDate: string;
};

export type EventRegistrationInput = z.input<typeof eventRegistrationSchema>;
export type EventRegistrationResult = {
  userId: string;
  certificateId: string;
  eventName: string;
};

export function getEvents(): Promise<EventOption[]> {
  return getData<EventOption[]>("/api/events");
}

export function registerForEvent(input: EventRegistrationInput): Promise<EventRegistrationResult> {
  const data = eventRegistrationSchema.parse(input);
  return postData<EventRegistrationResult, typeof data>("/api/events/register", data);
}
