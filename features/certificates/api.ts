import { postData } from "@/lib/api-client";
import type { DatabaseLookupResult } from "@/types";
import { certificateLookupSchema } from "@/lib/validation/schemas";

export function lookupCertificate(id: string, workshop?: string): Promise<DatabaseLookupResult> {
  return postData<DatabaseLookupResult, { id: string; workshop?: string }>("/api/certificates/lookup", certificateLookupSchema.parse({ id, workshop }));
}
