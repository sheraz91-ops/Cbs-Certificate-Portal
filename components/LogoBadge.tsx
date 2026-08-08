import Link from "next/link";
import { ASSET_PATHS, ORG_CONFIG } from "@/config/certificate.config";

/**
 * ============================================================================
 *  LOGO CONTROL PANEL — edit these values to adjust the crest at the top
 *  of every page (Home, Certificate, Verify). Nothing else in this file
 *  needs to change for everyday tweaks.
 * ============================================================================
 */
const LOGO_SETTINGS = {
  // --- SIZE ------------------------------------------------------------
  // The circular badge's diameter. Pick any Tailwind height/width pair.
  // Common sizes: h-12 w-12 (48px) · h-14 w-14 (56px) · h-16 w-16 (64px)
  //               h-20 w-20 (80px) · h-24 w-24 (96px)
  sizeMobile: "h-14 w-14",
  sizeDesktop: "sm:h-20 sm:w-20", // applies at the "sm" breakpoint (≥640px) and up

  // --- POSITION ----------------------------------------------------------
  // Nudge the logo block up/down. Leave "" for no adjustment, or use
  // Tailwind margin utilities, e.g. "-mt-4" (up) / "mt-4" (down).
  verticalOffset: "",

  // Space between the logo circle and the institution text below it.
  gapMobile: "gap-3",
  gapDesktop: "sm:gap-4",

  // --- BORDER & BACKDROP --------------------------------------------------
  borderWidth: "border", // border, border-2, border-4, or "" for none
  borderColor: "border-gold-400/60", // try border-white/40, border-navy-300/60...
  // Shows through if the logo PNG has transparent corners.
  backdrop: "bg-navy-800/60",

  // --- SHADOW / GLOW ON THE BADGE ITSELF -----------------------------------
  shadow: "shadow-gold", // shadow-gold, shadow-card, or "" for none

  // --- SOFT PULSING RING BEHIND THE LOGO -----------------------------------
  // Purely decorative "official" glow. Set enabled: false to remove it.
  pulseRing: {
    enabled: true,
    color: "bg-gold-400/25",
    blur: "blur-md",
  },

  // --- CAPTION TEXT UNDER THE LOGO ------------------------------------------
  captionEnabled: true,
  captionSizeMobile: "text-[10px]",
  captionSizeDesktop: "sm:text-[11px]",
  captionTracking: "tracking-[0.2em] sm:tracking-[0.3em]",
  captionColor: "text-navy-100/90",
};

export default function LogoBadge() {
  const { pulseRing } = LOGO_SETTINGS;

  return (
    <Link
      href="/"
      className={[
        "flex flex-col items-center animate-fade-in",
        LOGO_SETTINGS.gapMobile,
        LOGO_SETTINGS.gapDesktop,
        LOGO_SETTINGS.verticalOffset,
      ].join(" ")}
    >
      <div
        className={[
          "relative flex items-center justify-center",
          LOGO_SETTINGS.sizeMobile,
          LOGO_SETTINGS.sizeDesktop,
        ].join(" ")}
      >
        {pulseRing.enabled && (
          <span
            className={[
              "absolute inset-0 rounded-full animate-pulse",
              pulseRing.color,
              pulseRing.blur,
            ].join(" ")}
          />
        )}
        <div
          className={[
            "relative flex h-full w-full items-center justify-center overflow-hidden rounded-full",
            LOGO_SETTINGS.borderWidth,
            LOGO_SETTINGS.borderColor,
            LOGO_SETTINGS.backdrop,
            LOGO_SETTINGS.shadow,
          ].join(" ")}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={ASSET_PATHS.logo}
            alt={`${ORG_CONFIG.organizationAbbreviation} logo`}
            className="h-full w-full object-cover"
          />
        </div>
      </div>

      {/* {LOGO_SETTINGS.captionEnabled && (
        <span
          className={[
            "text-center font-semibold leading-relaxed",
            LOGO_SETTINGS.captionSizeMobile,
            LOGO_SETTINGS.captionSizeDesktop,
            LOGO_SETTINGS.captionTracking,
            LOGO_SETTINGS.captionColor,
          ].join(" ")}
        >
          {ORG_CONFIG.institutionAbbreviation} &mdash;{" "}
          {ORG_CONFIG.institutionName.split(",")[0]}
        </span>
      )} */}
    </Link>
  );
}
