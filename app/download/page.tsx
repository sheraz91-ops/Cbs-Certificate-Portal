import CertificateForm from "@/components/CertificateForm";
import PageShell from "@/components/PageShell";
import Link from "next/link";
import React from "react";

const Download = () => {
  return (
    <PageShell>
      <section
        id="download"
        aria-labelledby="download-heading"
        className="scroll-mt-8 border-t border-white/10 py-12 sm:py-16 lg:py-20"
      >
        <div className="mx-auto grid min-w-0 max-w-6xl px-10 gap-6 sm:gap-8 lg:grid-cols-[0.8fr_1.2fr] lg:items-center">
          <div className="text-white">
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-gold-300">
              CBS certificates
            </p>
            <h2
              id="download-heading"
              className="mt-3 font-display text-3xl font-semibold sm:text-4xl"
            >
              Find your certificate.
            </h2>
            <p className="mt-4 text-sm leading-7 text-navy-100/65">
              Enter the certificate ID you received for your event. You can
              preview and download your certificate once it is found.
            </p>
            <Link
              href="/verify"
              className="mt-5 inline-flex text-sm font-semibold text-gold-200 underline decoration-gold-300/50 underline-offset-4 hover:text-gold-100"
            >
              Go to certificate verification
            </Link>
          </div>
          <CertificateForm />
        </div>
      </section>
    </PageShell>
  );
};

export default Download;
