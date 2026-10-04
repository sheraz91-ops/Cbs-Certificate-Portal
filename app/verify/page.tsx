import { Suspense } from "react";
import type { Metadata } from "next";
import VerifyPanel from "@/components/VerifyPanel";
import PageShell from "@/components/PageShell";
import LoadingSpinner from "@/components/LoadingSpinner";

export const metadata: Metadata = {
  title: "Verify a Certificate",
  description: "Verify the authenticity of a CBS workshop certificate.",
};

export default function VerifyPage() {
  return (
    <PageShell>
      <section className="mx-auto w-full min-w-0 max-w-4xl px-3 py-8 min-[380px]:px-4 sm:px-6 sm:py-12 lg:py-16">
        <div className="mb-8 text-center text-white">
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-gold-300">
            Certificate services
          </p>
          <h1 className="mt-3 font-display text-2xl font-semibold min-[380px]:text-3xl sm:text-4xl">
            Verify a certificate
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-navy-100/65">
            Check that a CBS event certificate is authentic and on record.
          </p>
        </div>
        <div className="flex w-full min-w-0 items-center justify-center">
          <Suspense
            fallback={
              <div className="flex w-full max-w-md items-center justify-center rounded-3xl bg-white/95 p-5 shadow-card ring-1 ring-black/5 min-[380px]:p-8 sm:p-10">
                <LoadingSpinner label="Loading..." />
              </div>
            }
          >
            <VerifyPanel />
          </Suspense>
        </div>
      </section>
    </PageShell>
  );
}
