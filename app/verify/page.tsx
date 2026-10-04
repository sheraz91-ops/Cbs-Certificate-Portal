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
      <section className="mx-auto w-full max-w-4xl px-4 py-12 sm:px-6 sm:py-16">
        <div className="mb-8 text-center text-white">
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-gold-300">Certificate services</p>
          <h1 className="mt-3 font-display text-3xl font-semibold sm:text-4xl">Verify a certificate</h1>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-navy-100/65">Check that a CBS event certificate is authentic and on record.</p>
        </div>
      <Suspense
        fallback={
          <div className="w-full max-w-md rounded-3xl bg-white/95 p-10 shadow-card ring-1 ring-black/5 flex items-center justify-center">
            <LoadingSpinner label="Loading..." />
          </div>
        }
      >
        <VerifyPanel />
      </Suspense>
      </section>
    </PageShell>
  );
}
