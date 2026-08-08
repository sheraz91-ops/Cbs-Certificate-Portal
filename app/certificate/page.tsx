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
      <Suspense
        fallback={
          <div className="w-full max-w-lg rounded-3xl bg-white/95 p-10 shadow-card ring-1 ring-black/5 flex items-center justify-center">
            <LoadingSpinner label="Loading..." />
          </div>
        }
      >
        <CertificatePreview />
      </Suspense>
    </PageShell>
  );
}
