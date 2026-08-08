import type { ReactNode } from "react";
import Link from "next/link";
import Footer from "./Footer";
import LogoBadge from "./LogoBadge";
interface PageShellProps {
  children: ReactNode;
  title?: string;
  link?: string;
}
export default function PageShell({ children, title, link }: PageShellProps) {
  return (
    <main className="hero-bg relative min-h-screen overflow-hidden flex flex-col items-center justify-between px-4 py-8 safe-top safe-bottom sm:py-14">
      {/* Ambient glow accents — sized down on mobile so they don't
          overwhelm a narrow viewport, full size from sm: up. */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-24 -left-24 h-56 w-56 rounded-full bg-gold-400/20 blur-3xl animate-float sm:-top-32 sm:-left-32 sm:h-72 sm:w-72"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-20 -right-20 h-64 w-64 rounded-full bg-navy-400/30 blur-3xl animate-float sm:-bottom-24 sm:-right-24 sm:h-80 sm:w-80"
        style={{ animationDelay: "1.5s" }}
      />

      <div className="relative z-10 flex w-full flex-col items-center gap-8 sm:gap-8">
        {/* Logo — all size/position/style settings live in LogoBadge.tsx */}
        <LogoBadge />

        {/* Trust badge — reinforces that certificates issued here are
            checkable, tying into the /verify page. */}
        <Link
          href={link || "/verify"}
          className="group -mt-4 inline-flex items-center gap-2 rounded-full border border-emerald-400/25 bg-emerald-400/10 px-3.5 py-1.5 text-[11px] font-medium text-emerald-200/90 transition-colors hover:bg-emerald-400/15 sm:-mt-4"
        >
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
          </span>
          {title || "Every certificate is instantly verifiable"}
          <span className="text-emerald-300/70 transition-transform group-hover:translate-x-0.5">
            &rarr;
          </span>
        </Link>

        {children}
      </div>

      <div className="relative z-10 w-full">
        <Footer />
      </div>
    </main>
  );
}
