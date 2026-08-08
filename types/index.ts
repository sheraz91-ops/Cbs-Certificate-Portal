import type { WorkshopDefinition } from "@/config/workshops";

/**
 * Shared type definitions for the CBS Certificate Portal.
 */

/** A single participant record loaded from data/participants.json */
export interface Participant {
  /** Raw certificate ID as stored in the source list, e.g. "1", "07" */
  id: string;
  /** Full name exactly as it should appear on the certificate */
  name: string;
  /** Which workshop this participant belongs to — must match a `key`
   *  in config/workshops.ts */
  workshop: string;
}

/** A resolved candidate certificate, used when a lookup matches more
 *  than one workshop (see the "ambiguous" LookupResult below). */
export interface CertificateCandidate {
  participant: Participant;
  formattedId: string;
}

/** Result of a certificate lookup against the participant list */
export type LookupResult =
  | { status: "found"; participant: Participant; formattedId: string }
  /** A bare number (no workshop code) matched participants in more than
   *  one workshop — the caller needs to disambiguate. */
  | { status: "ambiguous"; candidates: CertificateCandidate[] }
  | { status: "not-found" };

/** A fully-resolved certificate ready to render (PDF/PNG/verify) */
export interface CertificatePlan {
  fullName: string;
  formattedId: string;
  verifyUrl: string;
  workshop: WorkshopDefinition;
}

/** UI state machine for the certificate generation flow */
export type GenerationStatus = "idle" | "loading" | "error";

/** UI state machine for the certificate preview page */
export type PreviewStatus =
  | "loading"
  | "ready"
  | "not-found"
  | "ambiguous"
  | "error";

/** UI state machine for the verification page */
export type VerifyStatus =
  | "idle"
  | "checking"
  | "verified"
  | "ambiguous"
  | "not-found";

/** Shape of a transient alert shown to the user */
export interface AlertState {
  type: "success" | "error";
  message: string;
}
