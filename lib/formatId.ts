import { CERTIFICATE_ID_PAD_LENGTH } from "@/config/certificate.config";
import {
  getCertificateIdPrefix,
  getWorkshopByCode,
  type WorkshopDefinition,
} from "@/config/workshops";

/**
 * Formats a raw participant record ID (e.g. "1", "07") into the full
 * public-facing certificate ID for a specific workshop, e.g.
 * "CBS-LSW-2026-001". The prefix is built from that workshop's own
 * code/year (config/workshops.ts), so every workshop gets a distinct,
 * unambiguous ID space automatically.
 */
export function formatCertificateId(
  rawId: string,
  workshop: WorkshopDefinition
): string {
  const numeric = rawId.trim().replace(/\D/g, "");
  const padded =
    numeric.length > 0
      ? numeric.padStart(CERTIFICATE_ID_PAD_LENGTH, "0")
      : rawId.trim().toUpperCase();

  return `${getCertificateIdPrefix(workshop)}-${padded}`;
}

/** Result of parsing a user-typed Certificate ID string. */
export interface ParsedCertificateId {
  /** The workshop identified from the ID's code segment, if any could be
   *  matched. Undefined if the input was just a bare number. */
  workshop?: WorkshopDefinition;
  /** The bare sequence number, with leading zeros stripped, e.g. "5". */
  number: string;
}

/**
 * Parses ANY user-supplied Certificate ID into a workshop + sequence
 * number. This is intentionally tolerant, so all of the following work:
 *
 *   "5"                    -> { workshop: undefined, number: "5" }
 *   "07" / "007"           -> { workshop: undefined, number: "5" }... "7"
 *   "CBS-LSW-2026-007"     -> { workshop: <LSW>, number: "7" }
 *   "cbs-lsw-2026-007"     -> same, case-insensitive
 *   "ID: 007"              -> { workshop: undefined, number: "7" }
 *
 * Strategy: split the input on separators, check each segment against
 * every known workshop's code; separately, pull the LAST run of digits
 * in the whole string as the sequence number (the certificate ID format
 * always ends in the sequence number — any year or other numeric
 * segments earlier in the string are ignored).
 */
export function parseCertificateIdInput(
  raw: string
): ParsedCertificateId | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  // Only a number entered on its own can search across all workshops.
  // This prevents text such as "abc-226-09" being treated as bare ID 9.
  const isBareNumber = /^\d+$/.test(trimmed);

  const segments = trimmed.toUpperCase().split(/[\s\-_/]+/).filter(Boolean);
  let workshop: WorkshopDefinition | undefined;
  for (const segment of segments) {
    const match = getWorkshopByCode(segment);
    if (match) {
      workshop = match;
      break;
    }
  }

  if (!isBareNumber && !workshop) return null;

  const numericMatches = trimmed.match(/\d+/g);
  if (!numericMatches || numericMatches.length === 0) {
    return null;
  }

  const number = String(
    parseInt(numericMatches[numericMatches.length - 1], 10)
  );

  return { workshop, number };
}

/** Normalizes a raw participant.id (from participants.json) into the
 *  same bare-number form produced by parseCertificateIdInput, so the
 *  two can be compared directly. */
export function normalizeParticipantNumber(rawId: string): string {
  const numeric = rawId.trim().replace(/\D/g, "");
  return numeric.length > 0
    ? String(parseInt(numeric, 10))
    : rawId.trim().toLowerCase();
}
