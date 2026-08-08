import { ORG_CONFIG } from "@/config/certificate.config";

export default function Header() {
  return (
    <header className="w-full flex flex-col items-center text-center gap-2.5 animate-fade-in sm:gap-3">
      <div className="flex items-center gap-2.5 text-gold-300 sm:gap-3">
        <span className="h-px w-7 bg-gradient-to-r from-transparent to-gold-400 sm:w-10" />
        <span className="whitespace-nowrap uppercase tracking-[0.25em] text-[11px] font-semibold sm:text-xs sm:tracking-[0.35em]">
          {ORG_CONFIG.organizationName}
        </span>
        <span className="h-px w-7 bg-gradient-to-l from-transparent to-gold-400 sm:w-10" />
      </div>

      <h1 className="font-display text-[28px] leading-[1.15] font-semibold text-white sm:text-4xl md:text-5xl">
        {ORG_CONFIG.siteTitle}
      </h1>

      {/* Institution name already appears in the crest line above this
          header (see PageShell), so the tagline here focuses purely on
          the action — avoids repeating "Muhammad Nawaz Sharif University
          of Agriculture, Multan" twice on a narrow mobile screen. */}
      <p className="max-w-xs text-[15px] leading-relaxed text-navy-100/90 sm:max-w-xl sm:text-base">
        {ORG_CONFIG.siteTagline}
      </p>
    </header>
  );
}
