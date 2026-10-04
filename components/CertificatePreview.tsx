"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { buildVerifyUrl } from "@/lib/qrcode";
import { lookupCertificate } from "@/features/certificates/api";
import {
  generateCertificatePdf,
  downloadPdf,
  downloadBytes,
} from "@/lib/generateCertificate";
import {
  canvasToDataUrl,
  canvasToPngBytes,
  renderCertificateCanvas,
} from "@/lib/renderCertificatePng";
import type { CertificatePlan, PreviewStatus } from "@/types";
import LoadingSpinner from "./LoadingSpinner";

export default function CertificatePreview() {
  const searchParams = useSearchParams();
  const idParam = searchParams.get("id") ?? "";
  const workshopParam = searchParams.get("workshop") ?? undefined;
  const lookupQuery = useQuery({
    queryKey: ["certificate-lookup", idParam, workshopParam],
    queryFn: () => lookupCertificate(idParam, workshopParam),
    enabled: Boolean(idParam),
  });

  const [status, setStatus] = useState<PreviewStatus>("loading");
  const [plan, setPlan] = useState<CertificatePlan | null>(null);
  const [previewSrc, setPreviewSrc] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState<"pdf" | "png" | null>(
    null,
  );
  const [candidates, setCandidates] = useState<
    { formattedId: string; name: string }[]
  >([]);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      if (!idParam) {
        setStatus("not-found");
        return;
      }
      if (lookupQuery.isPending) {
        setStatus("loading");
        return;
      }
      if (lookupQuery.isError || !lookupQuery.data) {
        setStatus("error");
        return;
      }
      const result = lookupQuery.data;

      if (result.status === "not-found") {
        setStatus("not-found");
        return;
      }

      if (result.status === "attendance-required") {
        setStatus("attendance-required");
        return;
      }

      if (result.status === "ambiguous") {
        setCandidates(
          result.candidates.map((c) => ({
            formattedId: c.formattedId,
            name: c.participant.name,
          })),
        );
        setStatus("ambiguous");
        return;
      }

      try {
        const resolvedPlan = {
          fullName: result.participant.name,
          formattedId: result.formattedId,
          verifyUrl: buildVerifyUrl(result.formattedId, result.workshop.key),
          workshop: result.workshop,
        };
        const canvas = await renderCertificateCanvas(resolvedPlan);
        if (cancelled) return;

        canvasRef.current = canvas;
        setPreviewSrc(canvasToDataUrl(canvas));
        setPlan(resolvedPlan);
        setStatus("ready");
      } catch (err) {
        console.error(err);
        if (!cancelled) setStatus("error");
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [idParam, lookupQuery.data, lookupQuery.isError, lookupQuery.isPending]);

  async function handleDownloadPdf() {
    if (!plan) return;
    setIsDownloading("pdf");
    try {
      const bytes = await generateCertificatePdf(plan);
      downloadPdf(bytes, `${plan.formattedId}_${slug(plan.fullName)}.pdf`);
    } catch (err) {
      console.error(err);
    } finally {
      setIsDownloading(null);
    }
  }

  async function handleDownloadPng() {
    if (!plan || !canvasRef.current) return;
    setIsDownloading("png");
    try {
      const bytes = await canvasToPngBytes(canvasRef.current);
      downloadBytes(
        bytes,
        `${plan.formattedId}_${slug(plan.fullName)}.png`,
        "image/png",
      );
    } catch (err) {
      console.error(err);
    } finally {
      setIsDownloading(null);
    }
  }

  if (status === "loading") {
    return (
      <div className="flex w-full max-w-lg animate-scale-in flex-col items-center gap-4 rounded-3xl bg-white/95 p-5 shadow-card ring-1 ring-black/5 min-[380px]:p-8 sm:p-10">
        <LoadingSpinner label="Rendering your certificate..." />
      </div>
    );
  }

  if (status === "ambiguous") {
    return (
      <div className="flex w-full max-w-md animate-scale-in flex-col items-center gap-4 rounded-3xl bg-white/95 p-5 text-center shadow-card ring-1 ring-black/5 min-[380px]:p-7 sm:p-8">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-gold-100 text-gold-700 text-xl font-bold">
          ?
        </span>
        <h2 className="font-display text-xl font-semibold text-navy-900">
          Multiple certificates found
        </h2>
        <p className="text-sm text-navy-500">
          That number matches participants in more than one workshop. Select
          yours below:
        </p>
        <div className="w-full flex flex-col gap-2">
          {candidates.map((c) => (
            <Link
              key={c.formattedId}
              href={`/certificate?id=${encodeURIComponent(c.formattedId)}`}
              className="w-full rounded-xl border border-navy-100 bg-navy-50/50 px-4 py-3 text-left text-sm hover:border-gold-400 hover:bg-gold-50 transition-colors"
            >
              <span className="block font-semibold text-navy-900">
                {c.name}
              </span>
              <span className="block font-mono text-xs text-navy-500 mt-0.5">
                {c.formattedId}
              </span>
            </Link>
          ))}
        </div>
        <Link
          href="/"
          className="mt-1 text-xs font-medium text-navy-400 hover:text-gold-600 underline underline-offset-2 transition-colors"
        >
          ← Back to search
        </Link>
      </div>
    );
  }

  if (
    status === "not-found" ||
    status === "attendance-required" ||
    status === "error"
  ) {
    return (
      <div className="flex w-full max-w-md animate-scale-in flex-col items-center gap-4 rounded-3xl bg-white/95 p-5 text-center shadow-card ring-1 ring-black/5 min-[380px]:p-7 sm:p-8">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-rose-100 text-rose-600 text-xl font-bold">
          !
        </span>
        <h2 className="font-display text-xl font-semibold text-navy-900">
          {status === "attendance-required"
            ? "You were not present in this event."
            : status === "not-found"
              ? "Certificate ID not found."
              : "Something went wrong."}
        </h2>
        <p className="text-sm text-navy-500">
          {status === "attendance-required"
            ? "Your certificate is available after the organizer marks your attendance Present."
            : status === "not-found"
              ? "Please double-check your Certificate ID and try again."
              : "We couldn't render your certificate. Please try again."}
        </p>
        <Link
          href="/"
          className="mt-2 rounded-xl bg-navy-800 px-5 py-2.5 text-sm font-semibold text-white shadow-gold hover:bg-navy-700 transition-colors"
        >
          ← Back to search
        </Link>
      </div>
    );
  }

  return (
    <div className="w-full max-w-2xl animate-scale-in flex flex-col items-center gap-6">
      <div className="w-full rounded-3xl bg-white/95 p-4 sm:p-6 shadow-card ring-1 ring-black/5">
        {previewSrc && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={previewSrc}
            alt={`Certificate preview for ${plan?.fullName}`}
            className="w-full rounded-xl ring-1 ring-navy-100"
          />
        )}
      </div>

      <div className="flex w-full flex-col gap-5 rounded-3xl bg-white/95 p-5 shadow-card ring-1 ring-black/5 min-[380px]:p-6">
        <div className="text-center">
          <p className="text-xs uppercase tracking-wide text-navy-400 font-semibold">
            Certificate ready for
          </p>
          <h2 className="mt-1 break-words font-display text-xl font-semibold text-navy-900 min-[380px]:text-2xl">
            {plan?.fullName}
          </h2>
          <p className="mt-1 break-words text-xs text-navy-500 min-[380px]:text-sm">
            ID: <span className="font-mono">{plan?.formattedId}</span> &middot;{" "}
            {plan?.workshop.workshopName}
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={handleDownloadPdf}
            disabled={isDownloading !== null}
            className="flex-1 rounded-xl bg-navy-800 px-5 py-3 text-sm font-semibold text-white shadow-gold hover:bg-navy-700 transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {isDownloading === "pdf" ? (
              <LoadingSpinner label="Preparing PDF..." variant="light" />
            ) : (
              <>Download PDF</>
            )}
          </button>
          <button
            onClick={handleDownloadPng}
            disabled={isDownloading !== null}
            className="flex-1 rounded-xl border-2 border-navy-800 px-5 py-3 text-sm font-semibold text-navy-800 hover:bg-navy-50 transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {isDownloading === "png" ? (
              <LoadingSpinner label="Preparing PNG..." variant="dark" />
            ) : (
              <>Download PNG</>
            )}
          </button>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-2 text-center text-xs font-medium sm:gap-4">
          <a
            href={plan ? buildVerifyUrl(plan.formattedId, plan.workshop.key) : "/verify"}
            className="text-navy-400 hover:text-gold-600 underline underline-offset-2 transition-colors"
          >
            Verify this certificate
          </a>
          <span className="text-navy-200">•</span>
          <Link
            href="/#download"
            className="text-navy-400 hover:text-gold-600 underline underline-offset-2 transition-colors"
          >
            Search another ID
          </Link>
        </div>
      </div>
    </div>
  );
}

function slug(text: string): string {
  return text.trim().replace(/\s+/g, "_");
}
