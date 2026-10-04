import { getData, postData } from "@/lib/api-client";
import { userRegistrationFormConfigSchema } from "@/lib/validation/schemas";
import type { UserRegistrationFormConfig } from "@/types/registrationForm";

export function getPublicUserRegistrationForm(): Promise<UserRegistrationFormConfig> {
  return getData<UserRegistrationFormConfig>("/api/user-registration-form", { cache: "no-store" });
}

export function getAdminUserRegistrationForm(): Promise<UserRegistrationFormConfig> {
  return postData<UserRegistrationFormConfig, Record<string, never>>("/api/admin/users/registration-form", {});
}

export function saveAdminUserRegistrationForm(config: UserRegistrationFormConfig): Promise<UserRegistrationFormConfig> {
  const parsed = userRegistrationFormConfigSchema.parse(config);
  return postData<UserRegistrationFormConfig, UserRegistrationFormConfig>("/api/admin/users/registration-form", parsed);
}
