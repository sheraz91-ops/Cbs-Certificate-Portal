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
    <PageShell link="/" title="Download your certificate instantly">
      <Suspense
        fallback={
          <div className="w-full max-w-md rounded-3xl bg-white/95 p-10 shadow-card ring-1 ring-black/5 flex items-center justify-center">
            <LoadingSpinner label="Loading..." />
          </div>
        }
      >
        <VerifyPanel />
      </Suspense>
    </PageShell>
  );
}
