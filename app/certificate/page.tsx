import { Suspense } from "react";
import type { Metadata } from "next";
import CertificatePreview from "@/components/CertificatePreview";
import PageShell from "@/components/PageShell";
import LoadingSpinner from "@/components/LoadingSpinner";

export const metadata: Metadata = {
  title: "Certificate Preview",
  description: "Preview and download your certificate as PDF or PNG.",
};

export default function CertificatePage() {
  return (
    <PageShell>
      <section className="mx-auto w-full min-w-0 max-w-5xl px-3 py-8 min-[380px]:px-4 sm:px-6 sm:py-12 lg:py-14">
        <div className="mb-7 text-center text-white">
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-gold-300">
            CBS certificates
          </p>
          <h1 className="mt-3 font-display text-3xl font-semibold sm:text-4xl">
            Your certificate
          </h1>
        </div>
        <div className="w-full flex items-center justify-center">
          <Suspense
            fallback={
              <div className="flex w-full max-w-lg items-center justify-center rounded-3xl bg-white/95 p-5 shadow-card ring-1 ring-black/5 min-[380px]:p-8 sm:p-10">
                <LoadingSpinner label="Loading..." />
              </div>
            }
          >
            <CertificatePreview />
          </Suspense>
        </div>
      </section>
    </PageShell>
  );
}
