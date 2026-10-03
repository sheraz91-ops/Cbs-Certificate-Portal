import Image from "next/image";
import Link from "next/link";
import { ASSET_PATHS, ORG_CONFIG } from "@/config/certificate.config";

const navigation = [
  { label: "Home", href: "/" },
  { label: "Download certificate", href: "/#download" },
  { label: "Verify certificate", href: "/verify" },
];

export default function Header() {
  return (
    <header className="relative z-20 border-b border-white/10 bg-navy-950/80 text-white backdrop-blur-xl">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-4 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
        <Link href="/" className="flex items-center gap-3 self-center lg:self-auto">
          <Image src={ASSET_PATHS.logo} alt="CBS logo" width={48} height={48} priority className="h-11 w-11 rounded-full border border-gold-300/50 object-cover shadow-gold" />
          <span>
            <span className="block font-display text-lg font-semibold leading-tight">{ORG_CONFIG.organizationAbbreviation}</span>
            <span className="mt-0.5 block text-[10px] font-medium uppercase tracking-[0.14em] text-navy-100/65">{ORG_CONFIG.institutionAbbreviation}</span>
          </span>
        </Link>
        <nav aria-label="Main navigation" className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs font-medium sm:text-sm">
          {navigation.map((item) => (
            <Link key={item.href} href={item.href} className="text-navy-100/75 transition hover:text-gold-200">{item.label}</Link>
          ))}
          <Link href="/register" className="rounded-full bg-gold-400 px-4 py-2 font-semibold text-navy-950 transition hover:bg-gold-300">Register for an event</Link>
        </nav>
      </div>
    </header>
  );
}
