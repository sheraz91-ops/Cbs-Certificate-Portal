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

/** Shape of a template's placeholder geometry. */
export interface LayoutConfig {
  readonly nameField: {
    readonly centerXRatio: number;
    readonly centerYRatio: number;
    readonly maskBox: {
      readonly leftRatio: number;
      readonly rightRatio: number;
      readonly topRatio: number;
      readonly bottomRatio: number;
    };
    readonly font: string;
    readonly color: string;
    readonly maxFontSize: number;
    readonly minFontSize: number;
    readonly maxWidthRatio: number;
  };
  readonly idField: {
    readonly startXRatio: number;
    readonly centerYRatio: number;
    readonly maskBox: {
      readonly leftRatio: number;
      readonly rightRatio: number;
      readonly topRatio: number;
      readonly bottomRatio: number;
    };
    readonly font: string;
    readonly color: string;
    readonly label: string;
    readonly maxFontSize: number;
    readonly minFontSize: number;
    readonly maxWidthRatio: number;
  };
  readonly qrField: {
    readonly box: {
      readonly leftRatio: number;
      readonly rightRatio: number;
      readonly topRatio: number;
      readonly bottomRatio: number;
    };
    readonly caption: string;
    readonly captionCenterXRatio: number;
    readonly captionCenterYRatio: number;
    readonly captionFontSize: number;
    readonly captionColor: string;
  };
  readonly maskColor: string;
}

const REC_2026_LAYOUT_CONFIG: LayoutConfig = {
  nameField: {
    centerXRatio: 0.512,
    centerYRatio: 0.417,
    maskBox: {
      leftRatio: 0.35,
      rightRatio: 0.674,
      topRatio: 0.368,
      bottomRatio: 0.466,
    },
    font: "serif",
    color: "#222222",
    maxFontSize: 42,
    minFontSize: 16,
    maxWidthRatio: 0.64,
  },
  idField: {
    startXRatio: 0.757,
    centerYRatio: 0.718,
    maskBox: {
      leftRatio: 0.75,
      rightRatio: 0.85,
      topRatio: 0.68,
      bottomRatio: 0.76,
    },
    font: "sans-bold",
    color: "#222222",
    label: "",
    maxFontSize: 16,
    minFontSize: 8,
    maxWidthRatio: 0.18,
  },
  qrField: DEFAULT_LAYOUT_CONFIG.qrField,
  maskColor: DEFAULT_LAYOUT_CONFIG.maskColor,
};

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
    key: "tst-2026",
    workshopName: "testing worshop",
    workshopFullTitle:
      "teisng is easy",
    workshopCode: "TST",
    eventYear: "2026",
    eventDate: "13 Dec",
    organizedBy: `${ORG_CONFIG.organizationName} (${ORG_CONFIG.institutionAbbreviation})`,
    templatePath: "/templates/tst-2026.png",
    layout:     {
        "nameField": {
            "centerXRatio": 0.5099275653923542,
            "centerYRatio": 0.534592526163451,
            "maskBox": {
                "leftRatio": 0.18092756539235413,
                "rightRatio": 0.8384275653923542,
                "topRatio": 0.5162049731224325,
                "bottomRatio": 0.5522728656259686
            },
            "font": "serif",
            "color": "#201e19",
            "maxFontSize": 42,
            "minFontSize": 16,
            "maxWidthRatio": 0.714
        },
        "idField": {
            "startXRatio": 0.6557933862943285,
            "centerYRatio": 0.6396291443445306,
            "maskBox": {
                "leftRatio": 0.6557933862943285,
                "rightRatio": 0.7882933862943284,
                "topRatio": 0.5395584229866804,
                "bottomRatio": 0.7389926521238799
            },
            "font": "sans-bold",
            "color": "#5e5852",
            "label": "",
            "maxFontSize": 18,
            "minFontSize": 8,
            "maxWidthRatio": 0.159
        },
        "qrField": {
            "box": {
                "leftRatio": 0.8219,
                "rightRatio": 0.9116,
                "topRatio": 0.2533,
                "bottomRatio": 0.373
            },
            "caption": "SCAN TO VERIFY",
            "captionCenterXRatio": 0.8667,
            "captionCenterYRatio": 0.3859,
            "captionFontSize": 8.5,
            "captionColor": "#0b1c47"
        },
        "maskColor": "#f9f9f9"
    },
  },

    {
    key: "yyy",
    workshopName: "Youtube",
    workshopFullTitle:
      "yyy yyy ",
    workshopCode: "YYY",
    eventYear: "2026",
    eventDate: "12 dec",
    organizedBy: `${ORG_CONFIG.organizationName} (${ORG_CONFIG.institutionAbbreviation})`,
    templatePath: "/templates/yyy.png",
    layout:     {
        "nameField": {
            "centerXRatio": 0.5195189572493555,
            "centerYRatio": 0.476095517729289,
            "maskBox": {
                "leftRatio": 0.15726895724935552,
                "rightRatio": 0.8812689572493555,
                "topRatio": 0.45700075110976995,
                "bottomRatio": 0.49448307077030745
            },
            "font": "serif",
            "color": "#204e74",
            "maxFontSize": 42,
            "minFontSize": 16,
            "maxWidthRatio": 0.7805
        },
        "idField": {
            "startXRatio": 0.5753105503136003,
            "centerYRatio": 0.9251493299962714,
            "maskBox": {
                "leftRatio": 0.5753105503136003,
                "rightRatio": 0.6973105503136003,
                "topRatio": 0.795729245130642,
                "bottomRatio": 1
            },
            "font": "sans-bold",
            "color": "#305f3c",
            "label": "",
            "maxFontSize": 18,
            "minFontSize": 8,
            "maxWidthRatio": 0.14850000000000002
        },
        "qrField": {
            "box": {
                "leftRatio": 0.8219,
                "rightRatio": 0.9116,
                "topRatio": 0.2533,
                "bottomRatio": 0.373
            },
            "caption": "SCAN TO VERIFY",
            "captionCenterXRatio": 0.8667,
            "captionCenterYRatio": 0.3859,
            "captionFontSize": 8.5,
            "captionColor": "#0b1c47"
        },
        "maskColor": "#f9f9f9"
    },
  },

    {
    key: "yyy-2026",
    workshopName: "Youtube worshop",
    workshopFullTitle:
      "Youtube is here",
    workshopCode: "YYY",
    eventYear: "2026",
    eventDate: "12 Dec",
    organizedBy: `${ORG_CONFIG.organizationName} (${ORG_CONFIG.institutionAbbreviation})`,
    templatePath: "/templates/yyy-2026.png",
    layout:     {
        "nameField": {
            "centerXRatio": 0.5222017102615694,
            "centerYRatio": 0.4666089478086647,
            "maskBox": {
                "leftRatio": 0.15995171026156943,
                "rightRatio": 0.8839517102615694,
                "topRatio": 0.44751418118914565,
                "bottomRatio": 0.48499650084968315
            },
            "font": "serif",
            "color": "#204e74",
            "maxFontSize": 42,
            "minFontSize": 16,
            "maxWidthRatio": 0.7805
        },
        "idField": {
            "startXRatio": 0.5873829235176685,
            "centerYRatio": 0.9384303715517677,
            "maskBox": {
                "leftRatio": 0.5873829235176685,
                "rightRatio": 0.7093829235176685,
                "topRatio": 0.8090102866861383,
                "bottomRatio": 1
            },
            "font": "sans-bold",
            "color": "#305f3c",
            "label": "",
            "maxFontSize": 18,
            "minFontSize": 8,
            "maxWidthRatio": 0.14850000000000002
        },
        "qrField": {
            "box": {
                "leftRatio": 0.8219,
                "rightRatio": 0.9116,
                "topRatio": 0.2533,
                "bottomRatio": 0.373
            },
            "caption": "SCAN TO VERIFY",
            "captionCenterXRatio": 0.8667,
            "captionCenterYRatio": 0.3859,
            "captionFontSize": 8.5,
            "captionColor": "#0b1c47"
        },
        "maskColor": "#f9f9f9"
    },
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
