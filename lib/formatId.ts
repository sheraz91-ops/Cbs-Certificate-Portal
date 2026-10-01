import { CERTIFICATE_ID_PAD_LENGTH, ORG_CONFIG } from "@/config/certificate.config";
import type { WorkshopDefinition } from "@/types/workshop";

/** Format a stored participant number with the workshop-specific certificate prefix. */
export function formatCertificateId(rawId: string, workshop: WorkshopDefinition): string {
  const numeric = rawId.trim().replace(/\D/g, "");
  const sequence = numeric
    ? numeric.padStart(CERTIFICATE_ID_PAD_LENGTH, "0")
    : rawId.trim().toUpperCase();
  return `${ORG_CONFIG.organizationAbbreviation}-${workshop.workshopCode}-${workshop.eventYear}-${sequence}`;
}
