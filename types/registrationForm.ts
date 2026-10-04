import type { RegistrationFieldType } from "@/types/workshop";

export const USER_PROFILE_FIELD_KEYS = [
  "emailAddress",
  "fullName",
  "registrationNumber",
  "department",
  "semester",
  "section",
  "institute",
  "whatsappNumber",
] as const;

export type UserProfileFieldKey = (typeof USER_PROFILE_FIELD_KEYS)[number];

export type UserRegistrationField = {
  key: string;
  label: string;
  required: boolean;
  type?: RegistrationFieldType;
  choices?: string[];
  selectionMode?: "multiple" | "single";
};

export type UserRegistrationFormConfig = {
  fields: UserRegistrationField[];
};

export const DEFAULT_USER_REGISTRATION_FORM: UserRegistrationFormConfig = {
  fields: [
    { key: "emailAddress", label: "Email Address", required: true },
    { key: "fullName", label: "Full Name", required: true },
    { key: "registrationNumber", label: "Registration Number", required: true },
    { key: "department", label: "Department", required: true },
    { key: "semester", label: "Semester", required: true },
    { key: "section", label: "Section", required: true },
    { key: "institute", label: "Institute", required: true },
    { key: "whatsappNumber", label: "WhatsApp Number", required: true },
  ],
};
