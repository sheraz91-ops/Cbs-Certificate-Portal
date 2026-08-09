/**
 * ============================================================================
 *  WORKSHOP REGISTRY — CBS Certificate Portal
 * ============================================================================
 *  This is where you add a new workshop/event to the portal. Each entry
 *  is fully self-contained: its own name, code, date, template artwork,
 *  and (optionally) its own layout geometry.
 *
 *  TO ADD A NEW WORKSHOP:
 *    1. Copy the example block at the bottom of the WORKSHOPS array below
 *       and fill in the details.
 *    2. Add its certificate artwork to `public/templates/<your-key>.png`.
 *    3. In `data/participants.json`, tag each of that workshop's
 *       participants with `"workshop": "<your-key>"` (matching the `key`
 *       you chose below).
 *    4. If the new artwork keeps "<<Full Name>>" / "<<ID>>" in the same
 *       position as the default template, just reuse
 *       `layout: DEFAULT_LAYOUT_CONFIG`. Otherwise, re-measure the new
 *       template (see README "Re-tuning the layout") and give this
 *       workshop its own layout object with the same shape.
 *
 *  Nothing else in the codebase needs to change — every page (home,
 *  preview, verify), the PDF/PNG renderers, and the QR codes all read
 *  from this registry automatically.
 * ============================================================================
 */

import { DEFAULT_LAYOUT_CONFIG, ORG_CONFIG } from "./certificate.config";

/** Shape of a template's placeholder geometry — matches DEFAULT_LAYOUT_CONFIG. */
export type LayoutConfig = typeof DEFAULT_LAYOUT_CONFIG;

export interface WorkshopDefinition {
  /** Internal identifier — used in data/participants.json's "workshop"
   *  field and in URLs internally. Lowercase, hyphenated, never shown
   *  to users directly. Must be unique. */
  key: string;
  /** Short display name, e.g. "Laptop Survival Workshop" */
  workshopName: string;
  /** Full descriptive title, e.g. for certificate subtitles */
  workshopFullTitle: string;
  /** Short code embedded in every certificate ID for this workshop, e.g. "LSW" */
  workshopCode: string;
  /** Year embedded in every certificate ID for this workshop */
  eventYear: string;
  /** Human-readable event date, shown on the verification page */
  eventDate: string;
  /** Shown as "Organized by" on the verification page */
  organizedBy: string;
  /** Path to this workshop's certificate artwork, under /public */
  templatePath: string;
  /** Placeholder geometry for this workshop's template */
  layout: LayoutConfig;
}

export const WORKSHOPS: WorkshopDefinition[] = [
  {
    key: "lsw-2026",
    workshopName: "Laptop Survival Workshop",
    workshopFullTitle:
      "Laptop Survival Workshop: From Fresh Windows Installation to Complete PC Setup",
    workshopCode: "LSW",
    eventYear: "2026",
    eventDate: "10 August 2026",
    organizedBy: `${ORG_CONFIG.organizationName} (${ORG_CONFIG.institutionAbbreviation})`,
    templatePath: "/templates/lsw-2026.png",
    layout: DEFAULT_LAYOUT_CONFIG,
  },

    {
    key: "rec-2026",
    workshopName: "Online Real Estate Course",
    workshopFullTitle:
      "Real esate where he learned course",
    workshopCode: "REC",
    eventYear: "2027",
    eventDate: "19 December 2026",
    organizedBy: `${ORG_CONFIG.organizationName} (${ORG_CONFIG.institutionAbbreviation})`,
    templatePath: "/templates/rec-2026.png",
    layout: DEFAULT_LAYOUT_CONFIG,
  },

          // --- EXAMPLE: duplicate & fill in for your next workshop -----------------
  // {
  //   key: "aw-2026",
  //   workshopName: "Another Workshop",
  //   workshopFullTitle: "Another Workshop: Full Descriptive Title Here",
  //   workshopCode: "AW",
  //   eventYear: "2026",
  //   eventDate: "12 December 2026",
  //   organizedBy: `${ORG_CONFIG.organizationName} (${ORG_CONFIG.institutionAbbreviation})`,
  //   templatePath: "/templates/aw-2026.png",
  //   layout: DEFAULT_LAYOUT_CONFIG, // or a custom object if the new
  //                                   // template's placeholders sit
  //                                   // somewhere else — see README.
  // },
];

/** Builds the ID prefix for a workshop, e.g. "CBS-LSW-2026". */
export function getCertificateIdPrefix(workshop: WorkshopDefinition): string {
  return `${ORG_CONFIG.organizationAbbreviation}-${workshop.workshopCode}-${workshop.eventYear}`;
}

/** Looks up a workshop by its internal registry key. */
export function getWorkshopByKey(key: string): WorkshopDefinition | undefined {
  return WORKSHOPS.find((w) => w.key === key);
}

/** Case-insensitive lookup by the short code embedded in a Certificate ID
 *  (e.g. "LSW" from "CBS-LSW-2026-005"). */
export function getWorkshopByCode(
  code: string
): WorkshopDefinition | undefined {
  const upper = code.toUpperCase();
  return WORKSHOPS.find((w) => w.workshopCode.toUpperCase() === upper);
}
