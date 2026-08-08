import participantsData from "@/data/participants.json";
import type { CertificateCandidate, LookupResult, Participant } from "@/types";
import { getWorkshopByKey } from "@/config/workshops";
import {
  formatCertificateId,
  normalizeParticipantNumber,
  parseCertificateIdInput,
} from "./formatId";

/**
 * The full participant list across ALL workshops. Each record's
 * `workshop` field ties it to an entry in config/workshops.ts. To
 * onboard a new workshop's participants, add their records here with
 * the matching `workshop` key — no code changes required.
 */
export const participants: Participant[] = participantsData as Participant[];

/**
 * Looks up a participant by the certificate ID they typed in.
 *
 * If the input includes a recognizable workshop code (e.g.
 * "CBS-LSW-2026-007", or just "LSW-007"), the search is scoped to that
 * workshop only — this is the unambiguous, recommended path, and what
 * every QR code and "ID: ..." printed on a certificate already uses.
 *
 * If the input is just a bare number (e.g. "7"), every workshop's
 * participant list is searched:
 *   - exactly one match  -> resolved normally
 *   - zero matches       -> "not-found"
 *   - 2+ matches          -> "ambiguous" (the same sequence number was
 *     used in more than one workshop) — the caller should ask the
 *     person to enter their full Certificate ID instead.
 */
export function findParticipantByCertificateId(rawId: string): LookupResult {
  const parsed = parseCertificateIdInput(rawId);
  if (!parsed) {
    return { status: "not-found" };
  }

  const { workshop, number } = parsed;

  if (workshop) {
    const match = participants.find(
      (p) =>
        p.workshop === workshop.key &&
        normalizeParticipantNumber(p.id) === number
    );

    if (!match) {
      return { status: "not-found" };
    }

    return {
      status: "found",
      participant: match,
      formattedId: formatCertificateId(match.id, workshop),
    };
  }

  // No workshop code in the input — search across every workshop.
  const matches = participants.filter(
    (p) => normalizeParticipantNumber(p.id) === number
  );

  if (matches.length === 0) {
    return { status: "not-found" };
  }

  const candidates: CertificateCandidate[] = matches
    .map((participant) => {
      const w = getWorkshopByKey(participant.workshop);
      // Guards against a data-entry typo (participant.workshop that
      // doesn't match any registry key) rather than crashing.
      if (!w) return null;
      return {
        participant,
        workshop: w,
        formattedId: formatCertificateId(participant.id, w),
      };
    })
    .filter((c): c is CertificateCandidate => c !== null);

  if (candidates.length === 0) {
    return { status: "not-found" };
  }

  return { status: "ambiguous", candidates };
}
