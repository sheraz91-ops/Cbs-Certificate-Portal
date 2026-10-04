"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { ASSET_PATHS, ORG_CONFIG } from "@/config/certificate.config";

const navigation = [
  { label: "Home", href: "/" },
  { label: "Download certificate", href: "/#download" },
  { label: "Verify certificate", href: "/verify" },
];

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="relative z-20 border-b border-white/10 bg-navy-950/90 text-white backdrop-blur-xl">
      <div className="relative mx-auto w-full max-w-7xl px-3 min-[380px]:px-4 sm:px-6 lg:px-8">
        <div className="flex min-h-16 items-center justify-between gap-3 py-2 sm:min-h-20 sm:py-3">
          <Link href="/" className="flex min-w-0 items-center gap-2.5 sm:gap-3">
            <Image
              src={ASSET_PATHS.logo}
              alt="CBS logo"
              width={48}
              height={48}
              priority
              className="h-10 w-10 shrink-0 rounded-full border border-gold-300/50 object-cover shadow-gold sm:h-12 sm:w-12"
            />
            <span className="min-w-0">
              <span className="block truncate font-display text-base font-semibold leading-tight sm:text-lg">
                {ORG_CONFIG.organizationAbbreviation}
              </span>
              <span className="mt-0.5 block truncate text-[9px] font-medium uppercase tracking-[0.1em] text-navy-100/65 sm:text-[10px] sm:tracking-[0.14em]">
                {ORG_CONFIG.institutionAbbreviation}
              </span>
            </span>
          </Link>

          <button
            type="button"
            aria-label={menuOpen ? "Close navigation menu" : "Open navigation menu"}
            aria-expanded={menuOpen}
            aria-controls="public-navigation"
            onClick={() => setMenuOpen((open) => !open)}
            className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/15 bg-white/5 text-white transition hover:border-gold-300/40 hover:bg-white/10 lg:hidden"
          >
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              fill="none"
              className="h-5 w-5"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
            >
              {menuOpen ? (
                <path d="m6 6 12 12M18 6 6 18" />
              ) : (
                <path d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>

          <nav
            id="public-navigation"
            aria-label="Main navigation"
            className={`${menuOpen ? "flex" : "hidden"} absolute left-0 right-0 top-full z-30 flex-col gap-1 border-b border-white/10 bg-navy-950 px-3 py-3 shadow-xl min-[380px]:px-4 sm:px-6 lg:static lg:flex lg:w-auto lg:flex-row lg:items-center lg:gap-5 lg:border-0 lg:bg-transparent lg:p-0 lg:shadow-none`}
          >
            {navigation.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMenuOpen(false)}
                className="flex min-h-11 items-center rounded-lg px-3 py-2 text-sm font-medium text-navy-100/80 transition hover:bg-white/5 hover:text-gold-200 lg:min-h-0 lg:px-0"
              >
                {item.label}
              </Link>
            ))}
            <Link
              href="/register"
              onClick={() => setMenuOpen(false)}
              className="mt-1 inline-flex min-h-11 items-center justify-center rounded-xl bg-gold-400 px-4 py-2 text-sm font-semibold text-navy-950 transition hover:bg-gold-300 lg:mt-0 lg:min-h-0 lg:rounded-full"
            >
              Register for an event
            </Link>
          </nav>
        </div>
      </div>
    </header>
  );
}
