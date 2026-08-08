import type { CertificatePlan, Participant } from "@/types";
import { getWorkshopByKey } from "@/config/workshops";
import { buildVerifyUrl } from "./qrcode";

/**
 * Resolves a participant record into everything needed to render a
 * certificate: display name, formatted ID, verification URL, and the
 * full workshop definition (template path, layout, event details) that
 * participant belongs to.
 */
export function buildCertificatePlan(
  participant: Participant,
  formattedId: string
): CertificatePlan {
  const workshop = getWorkshopByKey(participant.workshop);

  if (!workshop) {
    // Data-integrity guard: a participant record pointing at a workshop
    // key that doesn't exist in config/workshops.ts (typo, or the
    // workshop was removed from the registry without updating the
    // participant list).
    throw new Error(
      `Participant "${participant.name}" references unknown workshop "${participant.workshop}". ` +
        `Check data/participants.json against config/workshops.ts.`
    );
  }

  return {
    fullName: participant.name,
    formattedId,
    verifyUrl: buildVerifyUrl(formattedId),
    workshop,
  };
}
