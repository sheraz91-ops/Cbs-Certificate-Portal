"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useSearchParams } from "next/navigation";
import { findParticipantByCertificateId } from "@/lib/participants";
import { getWorkshopByKey, type WorkshopDefinition } from "@/config/workshops";
import type { CertificateCandidate, Participant, VerifyStatus } from "@/types";
import LoadingSpinner from "./LoadingSpinner";

export default function VerifyPanel() {
  const searchParams = useSearchParams();
  const idFromUrl = searchParams.get("id") ?? "";

  const [inputValue, setInputValue] = useState(idFromUrl);
  const [status, setStatus] = useState<VerifyStatus>("idle");
  const [result, setResult] = useState<{
    participant: Participant;
    formattedId: string;
    workshop: WorkshopDefinition;
  } | null>(null);
  const [candidates, setCandidates] = useState<CertificateCandidate[]>([]);

  async function verify(id: string) {
    const trimmed = id.trim();
    if (!trimmed) return;

    setStatus("checking");
    await new Promise((resolve) => setTimeout(resolve, 300));

    const lookup = findParticipantByCertificateId(trimmed);

    if (lookup.status === "not-found") {
      setResult(null);
      setStatus("not-found");
      return;
    }

    if (lookup.status === "ambiguous") {
      setCandidates(lookup.candidates);
      setResult(null);
      setStatus("ambiguous");
      return;
    }

    const workshop = getWorkshopByKey(lookup.participant.workshop);
    if (!workshop) {
      // Data-integrity guard — participant references a workshop key
      // that no longer exists in the registry.
      setResult(null);
      setStatus("not-found");
      return;
    }

    setResult({
      participant: lookup.participant,
      formattedId: lookup.formattedId,
      workshop,
    });
    setStatus("verified");
  }

  // Auto-verify when arriving via a QR code / shared link with ?id=...
  useEffect(() => {
    if (idFromUrl) {
      verify(idFromUrl);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idFromUrl]);

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    verify(inputValue);
  }

  function pickCandidate(formattedId: string) {
    setInputValue(formattedId);
    verify(formattedId);
  }

  const isChecking = status === "checking";

  return (
    <div className="w-full max-w-md animate-scale-in flex flex-col gap-5">
      <div className="relative rounded-3xl bg-white/95 backdrop-blur shadow-card ring-1 ring-black/5 p-6 sm:p-8">
        <span className="pointer-events-none absolute top-3 left-3 h-6 w-6 border-t-2 border-l-2 border-gold-400 rounded-tl-lg" />
        <span className="pointer-events-none absolute top-3 right-3 h-6 w-6 border-t-2 border-r-2 border-gold-400 rounded-tr-lg" />
        <span className="pointer-events-none absolute bottom-3 left-3 h-6 w-6 border-b-2 border-l-2 border-gold-400 rounded-bl-lg" />
        <span className="pointer-events-none absolute bottom-3 right-3 h-6 w-6 border-b-2 border-r-2 border-gold-400 rounded-br-lg" />

        <div className="text-center mb-6">
          <h2 className="font-display text-xl font-semibold text-navy-900">
            Verify a Certificate
          </h2>
          <p className="text-sm text-navy-500 mt-1">
            Confirm a certificate&apos;s authenticity by its Certificate ID.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="verifyId"
              className="text-xs font-semibold uppercase tracking-wide text-navy-600"
            >
              Certificate ID
            </label>
            <input
              id="verifyId"
              name="verifyId"
              type="text"
              autoComplete="off"
              placeholder="e.g. CBS-LSW-2026-005"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              disabled={isChecking}
              className="w-full rounded-xl border border-navy-100 bg-navy-50/40 px-4 py-3 text-base text-navy-900 placeholder:text-navy-300 outline-none transition focus:border-gold-400 focus:ring-4 focus:ring-gold-100 disabled:opacity-60"
            />
          </div>

          <button
            type="submit"
            disabled={isChecking}
            className="relative w-full overflow-hidden rounded-xl bg-navy-800 px-5 py-3.5 text-sm font-semibold text-white shadow-gold transition-all hover:bg-navy-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-70"
          >
            <span className={isChecking ? "invisible" : ""}>Verify Certificate</span>
            {isChecking && (
              <span className="absolute inset-0 flex items-center justify-center">
                <LoadingSpinner label="Checking..." variant="light" />
              </span>
            )}
          </button>
        </form>
      </div>

      {status === "verified" && result && (
        <div className="animate-scale-in rounded-3xl bg-emerald-50 border border-emerald-200 p-6 shadow-card">
          <div className="flex items-center gap-3 mb-4">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white font-bold">
              ✓
            </span>
            <div>
              <p className="font-display text-lg font-semibold text-emerald-900">
                Certificate Verified
              </p>
              <p className="text-xs text-emerald-700">
                This certificate is authentic and on record.
              </p>
            </div>
          </div>

          <dl className="grid grid-cols-3 gap-y-2 text-sm">
            <dt className="col-span-1 text-emerald-700 font-medium">Name</dt>
            <dd className="col-span-2 text-emerald-950 font-semibold">
              {result.participant.name}
            </dd>

            <dt className="col-span-1 text-emerald-700 font-medium">
              Certificate ID
            </dt>
            <dd className="col-span-2 text-emerald-950 font-mono">
              {result.formattedId}
            </dd>

            <dt className="col-span-1 text-emerald-700 font-medium">
              Workshop
            </dt>
            <dd className="col-span-2 text-emerald-950">
              {result.workshop.workshopName}
            </dd>

            <dt className="col-span-1 text-emerald-700 font-medium">Date</dt>
            <dd className="col-span-2 text-emerald-950">
              {result.workshop.eventDate}
            </dd>

            <dt className="col-span-1 text-emerald-700 font-medium">
              Organized by
            </dt>
            <dd className="col-span-2 text-emerald-950">
              {result.workshop.organizedBy}
            </dd>
          </dl>

          <a
            href={`/certificate?id=${encodeURIComponent(result.formattedId)}`}
            className="mt-5 inline-block text-xs font-semibold text-emerald-800 underline underline-offset-2 hover:text-emerald-900"
          >
            View / download this certificate →
          </a>
        </div>
      )}

      {status === "ambiguous" && (
        <div className="animate-scale-in rounded-3xl bg-gold-50 border border-gold-200 p-6 shadow-card">
          <div className="flex items-center gap-3 mb-4">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gold-500 text-white font-bold">
              ?
            </span>
            <div>
              <p className="font-display text-lg font-semibold text-gold-900">
                Multiple matches found
              </p>
              <p className="text-xs text-gold-700">
                That number exists in more than one workshop. Which one is
                yours?
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            {candidates.map((c) => (
              <button
                key={c.formattedId}
                onClick={() => pickCandidate(c.formattedId)}
                className="w-full rounded-xl border border-gold-200 bg-white/70 px-4 py-3 text-left text-sm hover:border-gold-400 hover:bg-white transition-colors"
              >
                <span className="block font-semibold text-navy-900">
                  {c.participant.name}
                </span>
                <span className="block font-mono text-xs text-navy-500 mt-0.5">
                  {c.formattedId}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {status === "not-found" && (
        <div className="animate-scale-in rounded-3xl bg-rose-50 border border-rose-200 p-6 shadow-card text-center">
          <span className="mx-auto flex h-9 w-9 items-center justify-center rounded-full bg-rose-500 text-white font-bold mb-3">
            !
          </span>
          <p className="font-display text-lg font-semibold text-rose-900">
            Certificate Not Found
          </p>
          <p className="text-sm text-rose-700 mt-1">
            This Certificate ID is invalid or does not exist in our records.
          </p>
        </div>
      )}
    </div>
  );
}
