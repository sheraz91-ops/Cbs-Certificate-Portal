import Link from "next/link";
import CertificateForm from "@/components/CertificateForm";
import PageShell from "@/components/PageShell";
import { ORG_CONFIG } from "@/config/certificate.config";

const pillars = [
  {
    number: "01",
    title: "Character and leadership",
    description: "Create opportunities for students to practice responsibility, confidence, and thoughtful leadership.",
  },
  {
    number: "02",
    title: "Learning by doing",
    description: "Bring students together through events, activities, and shared experiences beyond the classroom.",
  },
  {
    number: "03",
    title: "A stronger community",
    description: "Encourage respect, collaboration, and positive contributions across the university community.",
  },
];

export default function HomePage() {
  return (
    <PageShell>
      <div className="mx-auto w-full min-w-0 max-w-7xl px-3 min-[380px]:px-4 sm:px-6 lg:px-8">
        <section className="grid min-h-0 min-w-0 items-center gap-9 py-9 min-[380px]:py-12 sm:min-h-0 sm:gap-12 sm:py-16 lg:grid-cols-[1.1fr_0.9fr] lg:py-20 2xl:min-h-[590px] 2xl:py-24">
          <div className="min-w-0 max-w-2xl text-white">
            <p className="inline-flex items-center gap-2 rounded-full border border-gold-300/25 bg-gold-300/10 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-gold-200">
              {ORG_CONFIG.institutionAbbreviation} · Student community
            </p>
            <h1 className="mt-5 max-w-full font-display text-4xl font-semibold leading-[1.08] tracking-tight min-[380px]:text-5xl sm:mt-6 sm:text-6xl lg:text-6xl 2xl:text-7xl">
              Character grows <span className="text-gold-300">together.</span>
            </h1>
            <p className="mt-6 max-w-xl text-base leading-7 text-navy-100/75 sm:text-lg sm:leading-8">
              {ORG_CONFIG.organizationName} at {ORG_CONFIG.institutionName} brings students together to learn, lead, and make a positive difference in campus life.
            </p>
            <div className="mt-7 flex w-full flex-col gap-3 min-[440px]:flex-row min-[440px]:flex-wrap sm:mt-8">
              <Link href="/register" className="inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-gold-400 px-4 py-3 text-center text-sm font-bold text-navy-950 shadow-gold transition hover:bg-gold-300 min-[440px]:w-auto min-[440px]:px-5">Register for an event</Link>
              <Link href="/#download" className="inline-flex min-h-12 w-full items-center justify-center rounded-xl border border-white/20 bg-white/5 px-4 py-3 text-center text-sm font-semibold text-white transition hover:border-gold-300/50 hover:bg-white/10 min-[440px]:w-auto min-[440px]:px-5">Download a certificate</Link>
            </div>
            <div className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-3 text-xs text-navy-100/55">
              <span>Explore CBS events</span><span className="h-1 w-1 rounded-full bg-gold-300" />
              <Link href="/verify" className="transition hover:text-gold-200">Verify a certificate</Link>
            </div>
          </div>

          <aside className="relative mx-auto w-full min-w-0 max-w-md">
            <div aria-hidden className="absolute -inset-5 rounded-[2rem] bg-gradient-to-br from-gold-300/20 via-transparent to-blue-400/10 blur-2xl" />
            <div className="relative overflow-hidden rounded-[1.5rem] border border-white/15 bg-gradient-to-br from-white/10 to-white/[0.03] p-5 shadow-2xl backdrop-blur min-[380px]:p-7 sm:rounded-[1.75rem] sm:p-9">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-[0.2em] text-gold-200">About CBS</span>
                <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-gold-300/25 bg-gold-300/10 font-display text-lg font-bold text-gold-200">C</span>
              </div>
              <h2 className="mt-8 font-display text-3xl font-semibold leading-snug text-white">A place to build skills that last.</h2>
              <p className="mt-4 text-sm leading-7 text-navy-100/65">CBS supports student growth through activities that value character, communication, teamwork, and service.</p>
              <div className="mt-8 space-y-4 border-t border-white/10 pt-6">
                {[["Learn", "Discover strengths through new experiences."], ["Lead", "Practice taking initiative and working with others."], ["Contribute", "Help build a welcoming, engaged campus."]].map(([title, copy]) => (
                  <div key={title} className="flex gap-3">
                    <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-gold-300" />
                    <p className="text-sm leading-6 text-navy-100/70"><strong className="font-semibold text-white">{title}.</strong> {copy}</p>
                  </div>
                ))}
              </div>
            </div>
          </aside>
        </section>

        <section aria-labelledby="society-heading" className="min-w-0 border-t border-white/10 py-12 sm:py-16 lg:py-20">
          <div className="min-w-0 max-w-2xl">
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-gold-300">What we believe</p>
            <h2 id="society-heading" className="mt-3 font-display text-3xl font-semibold text-white sm:text-4xl">Character is built through action.</h2>
            <p className="mt-4 text-sm leading-7 text-navy-100/65 sm:text-base">The society creates room for students to connect, take part, and grow through meaningful campus experiences.</p>
          </div>
          <div className="mt-7 grid gap-3 sm:mt-9 sm:gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {pillars.map((pillar) => (
              <article key={pillar.number} className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 transition hover:border-gold-300/25 hover:bg-white/[0.06] sm:p-6">
                <span className="font-mono text-xs text-gold-300">{pillar.number}</span>
                <h3 className="mt-4 font-display text-xl font-semibold text-white">{pillar.title}</h3>
                <p className="mt-3 text-sm leading-6 text-navy-100/60">{pillar.description}</p>
              </article>
            ))}
          </div>
        </section>

        <section id="download" aria-labelledby="download-heading" className="scroll-mt-8 border-t border-white/10 py-12 sm:py-16 lg:py-20">
          <div className="mx-auto grid min-w-0 max-w-5xl gap-6 sm:gap-8 lg:grid-cols-[0.8fr_1.2fr] lg:items-center">
            <div className="text-white">
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-gold-300">CBS certificates</p>
              <h2 id="download-heading" className="mt-3 font-display text-3xl font-semibold sm:text-4xl">Find your certificate.</h2>
              <p className="mt-4 text-sm leading-7 text-navy-100/65">Enter the certificate ID you received for your event. You can preview and download your certificate once it is found.</p>
              <Link href="/verify" className="mt-5 inline-flex text-sm font-semibold text-gold-200 underline decoration-gold-300/50 underline-offset-4 hover:text-gold-100">Go to certificate verification</Link>
            </div>
            <CertificateForm />
          </div>
        </section>
      </div>
    </PageShell>
  );
}
