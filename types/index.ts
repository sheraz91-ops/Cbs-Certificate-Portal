import type { WorkshopDefinition } from "@/types/workshop";

/**
 * Shared type definitions for the CBS Certificate Portal.
 */

/** A participant record stored in MongoDB. */
export interface Participant {
  /** Raw certificate ID as stored in the source list, e.g. "1", "07" */
  id: string;
  /** Full name exactly as it should appear on the certificate */
  name: string;
  /** Workshop key this participant belongs to. */
  workshop: string;
  /** Assigned user ID, if this is a registered user enrollment. */
  userId?: string;
}

/** A resolved candidate certificate, used when a lookup matches more
 *  than one workshop (see the "ambiguous" LookupResult below). */
export interface CertificateCandidate {
  participant: Participant;
  workshop: WorkshopDefinition;
  formattedId: string;
}

/** Result of a certificate lookup against the participant list */
export type LookupResult =
  | { status: "found"; participant: Participant; formattedId: string }
  /** A bare number (no workshop code) matched participants in more than
   *  one workshop — the caller needs to disambiguate. */
  | { status: "ambiguous"; candidates: CertificateCandidate[] }
  | { status: "attendance-required" }
  | { status: "event-not-completed" }
  | { status: "not-found" };

/** Public API result containing the workshop resolved from MongoDB. */
export type DatabaseLookupResult =
  | { status: "found"; participant: Participant; formattedId: string; workshop: WorkshopDefinition }
  | { status: "ambiguous"; candidates: CertificateCandidate[] }
  | { status: "attendance-required" }
  | { status: "event-not-completed" }
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
  | "attendance-required"
  | "event-not-completed"
  | "not-found"
  | "ambiguous"
  | "error";

/** UI state machine for the verification page */
export type VerifyStatus =
  | "idle"
  | "checking"
  | "verified"
  | "attendance-required"
  | "event-not-completed"
  | "ambiguous"
  | "not-found";

/** Shape of a transient alert shown to the user */
export interface AlertState {
  type: "success" | "error";
  message: string;
}
