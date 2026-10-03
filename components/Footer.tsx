import Link from "next/link";
import { ORG_CONFIG } from "@/config/certificate.config";

export default function Footer() {
  return (
    <footer className="border-t border-white/10 bg-navy-950/40 px-4 py-8 text-navy-100/65 sm:px-6">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-white">{ORG_CONFIG.organizationName}</p>
          <p className="mt-1 text-xs">{ORG_CONFIG.institutionName}</p>
          <p className="mt-3 text-[11px]">&copy; {new Date().getFullYear()} CBS · All rights reserved.</p>
        </div>
        <nav aria-label="Footer navigation" className="flex flex-wrap gap-x-5 gap-y-2 text-xs font-medium">
          <Link href="/#download" className="transition hover:text-gold-200">Download certificate</Link>
          <Link href="/verify" className="transition hover:text-gold-200">Verify certificate</Link>
          <Link href="/register" className="transition hover:text-gold-200">Register for an event</Link>
          <Link href="/organizer/login" className="transition hover:text-gold-200">Organizer sign in</Link>
        </nav>
      </div>
    </footer>
  );
}
