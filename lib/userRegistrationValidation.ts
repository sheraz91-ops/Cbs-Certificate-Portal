import { z } from "zod";
import { campusRegistrationNumberSchema } from "@/lib/validation/schemas";
import type { UserProfileFieldKey, UserRegistrationFormConfig } from "@/types/registrationForm";
import type { UserProfileInput } from "@/types/user";
import { validateMatrixSelection } from "@/lib/matrixRegistration";

const profileKeys: UserProfileFieldKey[] = ["emailAddress", "fullName", "registrationNumber", "department", "semester", "section", "institute", "whatsappNumber"];
const semesterValues = ["1", "2", "3", "4", "5", "6", "7", "8", "Graduated"] as const;
const sectionValues = ["A", "B", "C", "D", "E", "F"] as const;

export type UserRegistrationValues = {
  profile: Partial<Record<UserProfileFieldKey, string | undefined>>;
  customFields: Record<string, string>;
};

export type ValidatedUserRegistration = {
  profile: UserProfileInput;
  customFields: Record<string, string>;
  errors: Record<string, string>;
};

function fieldError(fieldKey: string, label: string, value: string, required: boolean, allowOutsiders: boolean): string | undefined {
  const empty = !value.trim();
  if (fieldKey === "fullName" || required) {
    if (empty) return `${label} is required`;
  }
  if (empty) return undefined;

  if (fieldKey === "emailAddress" && !z.string().email().max(254).safeParse(value.trim()).success) return `${label} is invalid`;
  if (fieldKey === "registrationNumber") {
    if (!allowOutsiders && !campusRegistrationNumberSchema.safeParse(value).success) return `${label} must use the format YYYY-uam-RRRR`;
    if (allowOutsiders && value.length > 80) return `${label} is too long`;
  }
  if (fieldKey === "fullName" && value.trim().length > 160) return `${label} must be 160 characters or fewer`;
  if (fieldKey === "department" && value.trim().length > 120) return `${label} must be 120 characters or fewer`;
  if (fieldKey === "institute" && value.trim().length > 160) return `${label} must be 160 characters or fewer`;
  if (fieldKey === "semester" && !semesterValues.includes(value as (typeof semesterValues)[number])) return `${label} is invalid`;
  if (fieldKey === "section" && !sectionValues.includes(value as (typeof sectionValues)[number])) return `${label} is invalid`;
  if (fieldKey === "whatsappNumber") {
    const digits = value.replace(/\D/g, "").length;
    if (!/^[+()\d .-]+$/.test(value) || digits < 7 || digits > 15) return `${label} is invalid`;
  }
  return undefined;
}

function validateCustomField(field: UserRegistrationFormConfig["fields"][number], value: string): string | undefined {
  if (field.type === "matrix") return validateMatrixSelection(field, value);
  if (field.type === "yes_no") {
    if (value && value !== "yes" && value !== "no") return `${field.label} must be answered Yes or No`;
    if (field.required && !value) return `${field.label} is required`;
    return undefined;
  }
  if (field.type === "checkbox") {
    if (!field.choices?.length) {
      if (value && value !== "true" && value !== "false") return `${field.label} has an invalid value`;
      if (field.required && value !== "true") return `${field.label} is required`;
      return undefined;
    }
    let selected: unknown;
    try {
      selected = value ? JSON.parse(value) : [];
    } catch {
      return `${field.label} has an invalid selection`;
    }
    if (!Array.isArray(selected) || selected.some((choice) => typeof choice !== "string" || !field.choices.includes(choice)) || new Set(selected).size !== selected.length) return `${field.label} has an invalid selection`;
    if (field.selectionMode === "single" && selected.length > 1) return `${field.label} allows only one selection`;
    if (field.required && selected.length === 0) return `${field.label} is required`;
    return undefined;
  }
  if (field.required && !value.trim()) return `${field.label} is required`;
  if (value.length > 4000) return `${field.label} is too long`;
  return undefined;
}

export function validateUserRegistrationValues(
  config: UserRegistrationFormConfig,
  values: UserRegistrationValues,
  allowOutsiders: boolean,
): ValidatedUserRegistration {
  const profile = Object.fromEntries(profileKeys.map((key) => [key, ""])) as UserProfileInput;
  const customFields: Record<string, string> = {};
  const errors: Record<string, string> = {};

  for (const field of config.fields) {
    if (profileKeys.includes(field.key as UserProfileFieldKey)) {
      const key = field.key as UserProfileFieldKey;
      const value = values.profile[key] ?? "";
      const message = fieldError(key, field.label, value, field.required || (key === "registrationNumber" && !allowOutsiders), allowOutsiders);
      if (message) errors[key] = message;
      else {
        profile[key] = key === "emailAddress" || (key === "registrationNumber" && !allowOutsiders) ? value.trim().toLowerCase() : value.trim();
      }
    } else {
      const value = values.customFields[field.key] ?? (field.type === "matrix" ? "{}" : field.type === "checkbox" && field.choices?.length ? "[]" : "");
      const message = validateCustomField(field, value);
      if (message) errors[field.key] = message;
      else customFields[field.key] = value;
    }
  }

  // Campus only events always need a campus ID, even if admins made the field optional.
  if (!allowOutsiders && !config.fields.some((field) => field.key === "registrationNumber")) {
    errors.registrationNumber = "Registration Number is required for this event";
  }
  return { profile, customFields, errors };
}
