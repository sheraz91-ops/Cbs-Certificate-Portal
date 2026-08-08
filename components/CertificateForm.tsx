"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  findParticipantByCertificateId,
  participants,
} from "@/lib/participants";
import {
  formatCertificateId,
  normalizeParticipantNumber,
} from "@/lib/formatId";
import { getWorkshopByKey, WORKSHOPS } from "@/config/workshops";
import type {
  AlertState,
  CertificateCandidate,
  GenerationStatus,
} from "@/types";
import AlertMessage from "./AlertMessage";
import LoadingSpinner from "./LoadingSpinner";

export default function CertificateForm() {
  const router = useRouter();
  const [certificateId, setCertificateId] = useState("");
  const [selectedWorkshop, setSelectedWorkshop] = useState("");
  const [status, setStatus] = useState<GenerationStatus>("idle");
  const [alert, setAlert] = useState<AlertState | null>(null);
  const [candidates, setCandidates] = useState<CertificateCandidate[]>([]);

  const isLoading = status === "loading";

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setAlert(null);
    setCandidates([]);

    const trimmedId = certificateId.trim();
    if (!trimmedId) {
      setStatus("error");
      setAlert({ type: "error", message: "Please enter your Certificate ID." });
      return;
    }

    setStatus("loading");

    // Small delay so the loading state is perceptible even on very fast
    // devices — avoids an abrupt flash before navigating away.
    await new Promise((resolve) => setTimeout(resolve, 350));

    // When a workshop is selected, its participant list is searched only.
    // This makes a simple number such as "5" open that workshop's exact
    // certificate instead of matching a different workshop with the same ID.
    if (selectedWorkshop) {
      const workshop = getWorkshopByKey(selectedWorkshop);
      const participant =
        workshop && /^\d+$/.test(trimmedId)
          ? participants.find(
              (item) =>
                item.workshop === selectedWorkshop &&
                normalizeParticipantNumber(item.id) ===
                  normalizeParticipantNumber(trimmedId),
            )
          : undefined;

      if (!workshop || !participant) {
        setStatus("error");
        setAlert({
          type: "error",
          message:
            "This Certificate ID was not found in the selected workshop.",
        });
        return;
      }

      router.push(
        `/certificate?id=${encodeURIComponent(formatCertificateId(participant.id, workshop))}`,
      );
      return;
    }

    const result = findParticipantByCertificateId(trimmedId);

    if (result.status === "not-found") {
      setStatus("error");
      setAlert({ type: "error", message: "Certificate ID not found." });
      return;
    }

    if (result.status === "ambiguous") {
      setStatus("idle");
      setCandidates(result.candidates);
      return;
    }

    router.push(`/certificate?id=${encodeURIComponent(result.formattedId)}`);
  }

  return (
    <div className="w-full max-w-md animate-scale-in">
      <div className="relative rounded-3xl bg-white/95 backdrop-blur shadow-card ring-1 ring-black/5 p-6 sm:p-8">
        {/* Gold corner accents for a premium, certificate-like feel */}
        <span className="pointer-events-none absolute top-3 left-3 h-6 w-6 border-t-2 border-l-2 border-gold-400 rounded-tl-lg" />
        <span className="pointer-events-none absolute top-3 right-3 h-6 w-6 border-t-2 border-r-2 border-gold-400 rounded-tr-lg" />
        <span className="pointer-events-none absolute bottom-3 left-3 h-6 w-6 border-b-2 border-l-2 border-gold-400 rounded-bl-lg" />
        <span className="pointer-events-none absolute bottom-3 right-3 h-6 w-6 border-b-2 border-r-2 border-gold-400 rounded-br-lg" />

        <div className="text-center mb-6">
          <h2 className="font-display text-xl font-semibold text-navy-900">
            Find Your Certificate
          </h2>
          <p className="text-sm text-navy-500 mt-1">
            Enter the Certificate ID you were assigned at the workshop.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="certificateWorkshop"
              className="text-xs font-semibold uppercase tracking-wide text-navy-600"
            >
              PROGRAM
            </label>
            <select
              id="certificateWorkshop"
              value={selectedWorkshop}
              onChange={(e) => {
                setSelectedWorkshop(e.target.value);
                if (status !== "idle") setStatus("idle");
                if (alert) setAlert(null);
              }}
              disabled={isLoading}
              className="w-full rounded-xl border border-navy-100 bg-navy-50/40 px-4 py-3 text-base text-navy-900 outline-none transition focus:border-gold-400 focus:ring-4 focus:ring-gold-100 disabled:opacity-60"
            >
              <option value="">Select a program</option>
              {WORKSHOPS.map((workshop) => (
                <option key={workshop.key} value={workshop.key}>
                  {workshop.workshopName}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="certificateId"
              className="text-xs font-semibold uppercase tracking-wide text-navy-600"
            >
              Certificate ID
            </label>
            <input
              id="certificateId"
              name="certificateId"
              type="text"
              autoComplete="off"
              placeholder={
                selectedWorkshop ? "e.g. 5" : "e.g. 5 or CBS-LSW-2026-005"
              }
              value={certificateId}
              onChange={(e) => {
                setCertificateId(e.target.value);
                if (status !== "idle") setStatus("idle");
                if (alert) setAlert(null);
                if (candidates.length > 0) setCandidates([]);
              }}
              disabled={isLoading}
              className="w-full rounded-xl border border-navy-100 bg-navy-50/40 px-4 py-3 text-base text-navy-900 placeholder:text-navy-300 outline-none transition focus:border-gold-400 focus:ring-4 focus:ring-gold-100 disabled:opacity-60"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="group relative w-full overflow-hidden rounded-xl bg-navy-800 px-5 py-3.5 text-sm font-semibold text-white shadow-gold transition-all hover:bg-navy-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-70"
          >
            <span
              className={
                isLoading
                  ? "invisible"
                  : "flex items-center justify-center gap-2"
              }
            >
              Generate Certificate
              <svg
                className="h-4 w-4 transition-transform group-hover:translate-x-0.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M13 7l5 5m0 0l-5 5m5-5H6"
                />
              </svg>
            </span>
            {isLoading && (
              <span className="absolute inset-0 flex items-center justify-center">
                <LoadingSpinner label="Looking up..." variant="light" />
              </span>
            )}
          </button>
        </form>

        {alert && (
          <div className="mt-4">
            <AlertMessage alert={alert} />
          </div>
        )}

        {candidates.length > 0 && (
          <div className="mt-5">
            <p className="mb-2 text-sm font-semibold text-navy-800">
              Certificates matching ID {certificateId.trim()}
            </p>
            <p className="mb-3 text-xs text-navy-500">
              Choose the workshop where you received your certificate.
            </p>
            <div className="flex flex-col gap-2">
              {candidates.map((c) => (
                <a
                  key={c.formattedId}
                  href={`/certificate?id=${encodeURIComponent(c.formattedId)}`}
                  className="w-full rounded-xl border border-navy-100 bg-navy-50/50 px-4 py-3 text-left text-sm hover:border-gold-400 hover:bg-gold-50 transition-colors"
                >
                  <span className="block font-semibold text-navy-900">
                    {c.participant.name}
                  </span>
                  <span className="mt-0.5 block text-xs font-medium text-navy-600">
                    {c.workshop.workshopName}
                  </span>
                  <span className="block font-mono text-xs text-navy-500 mt-0.5">
                    {c.formattedId}
                  </span>
                  <span className="mt-2 block text-xs font-semibold text-gold-700">
                    View certificate →
                  </span>
                </a>
              ))}
            </div>
          </div>
        )}

        <div className="mt-5 text-center">
          <a
            href="/verify"
            className="text-xs font-medium text-navy-400 hover:text-gold-600 transition-colors underline underline-offset-2"
          >
            Already have a certificate? Verify its authenticity →
          </a>
        </div>
      </div>
    </div>
  );
}
