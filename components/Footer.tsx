import Link from "next/link";
import { ORG_CONFIG } from "@/config/certificate.config";

export default function Footer() {
  return (
    <footer className="border-t border-white/10 bg-navy-950/60 px-3 py-6 text-navy-100/65 min-[380px]:px-4 sm:px-6 sm:py-8 lg:px-8">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-5 sm:gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <p className="break-words text-sm font-semibold text-white">
            {ORG_CONFIG.organizationName}
          </p>
          <p className="mt-1 break-words text-xs">
            {ORG_CONFIG.institutionName}
          </p>
          <p className="mt-3 text-[11px]">
            &copy; {new Date().getFullYear()} CBS · All rights reserved.
          </p>
        </div>
        <nav
          aria-label="Footer navigation"
          className="grid grid-cols-2 gap-x-4 gap-y-3 border-t border-white/10 pt-4 text-xs font-medium min-[520px]:flex min-[520px]:flex-wrap min-[520px]:gap-x-5 min-[520px]:border-0 min-[520px]:pt-0 lg:justify-end"
        >
          <Link href="/#download" className="py-1 transition hover:text-gold-200">
            Download certificate
          </Link>
          <Link href="/verify" className="py-1 transition hover:text-gold-200">
            Verify certificate
          </Link>
          <Link href="/register" className="py-1 transition hover:text-gold-200">
            Register for an event
          </Link>
          <Link href="/organizer/login" className="py-1 transition hover:text-gold-200">
            Organizer sign in
          </Link>
        </nav>
      </div>
    </footer>
  );
}
