/** Geometry used by both the PDF and PNG certificate renderers. */
export interface LayoutConfig {
  readonly nameField: {
    readonly centerXRatio: number;
    readonly centerYRatio: number;
    readonly maskBox: { readonly leftRatio: number; readonly rightRatio: number; readonly topRatio: number; readonly bottomRatio: number };
    readonly font: string;
    readonly color: string;
    readonly maxFontSize: number;
    readonly minFontSize: number;
    readonly maxWidthRatio: number;
  };
  readonly idField: {
    readonly startXRatio: number;
    readonly centerYRatio: number;
    readonly maskBox: { readonly leftRatio: number; readonly rightRatio: number; readonly topRatio: number; readonly bottomRatio: number };
    readonly font: string;
    readonly color: string;
    readonly label: string;
    readonly maxFontSize: number;
    readonly minFontSize: number;
    readonly maxWidthRatio: number;
  };
  readonly qrField: {
    readonly box: { readonly leftRatio: number; readonly rightRatio: number; readonly topRatio: number; readonly bottomRatio: number };
    readonly caption: string;
    readonly captionCenterXRatio: number;
    readonly captionCenterYRatio: number;
    readonly captionFontSize: number;
    readonly captionColor: string;
  };
  readonly maskColor: string;
}

/** MongoDB workshop record returned by the API. */
export interface WorkshopDefinition {
  key: string;
  workshopName: string;
  workshopFullTitle: string;
  workshopCode: string;
  eventYear: string;
  eventDate: string;
  allowOutsiders?: boolean;
  organizedBy: string;
  templatePath: string;
  layout: LayoutConfig;
}
