import { postData } from "@/lib/api-client";
import type { CertificateLookupResponse } from "@/types";
import { certificateLookupSchema } from "@/lib/validation/schemas";

export function lookupCertificate(id: string, workshop?: string): Promise<CertificateLookupResponse> {
  return postData<CertificateLookupResponse, { id: string; workshop?: string }>("/api/certificates/lookup", certificateLookupSchema.parse({ id, workshop }));
}
