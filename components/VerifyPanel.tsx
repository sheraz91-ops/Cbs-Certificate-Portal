"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useSearchParams } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import type { WorkshopDefinition } from "@/types/workshop";
import type { CertificateCandidate, DatabaseLookupResult, Participant, VerifyStatus } from "@/types";
import { lookupCertificate } from "@/features/certificates/api";
import { getOrganizerAssignedEvents } from "@/features/certificates/organizer-api";
import LoadingSpinner from "./LoadingSpinner";
import { certificateLookupSchema, organizerCertificateIdentitySchema, validationMessage } from "@/lib/validation/schemas";
import InputField from "@/components/InputField";

export default function VerifyPanel() {
  const searchParams = useSearchParams();
  const idFromUrl = searchParams.get("id") ?? "";
  const workshopFromUrl = searchParams.get("workshop") ?? undefined;

  const [inputValue, setInputValue] = useState(idFromUrl);
  const [organizerName, setOrganizerName] = useState("");
  const [assignedWorkshops, setAssignedWorkshops] = useState<WorkshopDefinition[]>([]);
  const [selectedWorkshop, setSelectedWorkshop] = useState("");
  const [organizerMessage, setOrganizerMessage] = useState("");
  const [status, setStatus] = useState<VerifyStatus>("idle");
  const [result, setResult] = useState<{
    participant: Participant;
    formattedId: string;
    workshop: WorkshopDefinition;
  } | null>(null);
  const [candidates, setCandidates] = useState<CertificateCandidate[]>([]);
  const lookupMutation = useMutation({ mutationFn: ({ id, workshop }: { id: string; workshop?: string }) => lookupCertificate(id, workshop) });
  const assignedEventsMutation = useMutation({ mutationFn: getOrganizerAssignedEvents });

  async function verify(id: string, workshop?: string) {
    const trimmed = id.trim();
    if (!certificateLookupSchema.safeParse({ id: trimmed }).success) {
      setResult(null);
      setCandidates([]);
      setStatus("not-found");
      return;
    }

    setStatus("checking");
    await new Promise((resolve) => setTimeout(resolve, 300));

    let lookup: DatabaseLookupResult;
    try {
      lookup = await lookupMutation.mutateAsync({ id: trimmed, workshop });
    } catch {
      setResult(null);
      setStatus("not-found");
      return;
    }

    if (lookup.status === "not-found") {
      setResult(null);
      setStatus("not-found");
      return;
    }

    if (lookup.status === "attendance-required") {
      setResult(null);
      setStatus("attendance-required");
      return;
    }

    if (lookup.status === "ambiguous") {
      setCandidates(lookup.candidates);
      setResult(null);
      setStatus("ambiguous");
      return;
    }

    setResult({
      participant: lookup.participant,
      formattedId: lookup.formattedId,
      workshop: lookup.workshop,
    });
    setStatus("verified");
  }

  // Auto-verify when arriving via a QR code / shared link with ?id=...
  useEffect(() => {
    if (idFromUrl) {
      verify(idFromUrl, workshopFromUrl);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idFromUrl, workshopFromUrl]);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setOrganizerMessage("");
    const organizerId = inputValue.trim().toUpperCase();
    const isOrganizer = organizerId.startsWith("CBSO-");
    const directQrLookup = Boolean(workshopFromUrl && organizerId === idFromUrl.trim().toUpperCase());
    if (isOrganizer && !directQrLookup) {
      setStatus("idle");
      setResult(null);
      setCandidates([]);
      const identity = organizerCertificateIdentitySchema.safeParse({ organizerId, fullName: organizerName });
      if (!identity.success) {
        setOrganizerMessage(validationMessage(identity.error));
        setStatus("idle");
        return;
      }
      if (!assignedWorkshops.length) {
        try {
          const assigned = await assignedEventsMutation.mutateAsync(identity.data);
          setAssignedWorkshops(assigned);
          setSelectedWorkshop(assigned[0]?.key ?? "");
          setOrganizerMessage(assigned.length ? "Select one of your assigned events, then verify your certificate." : "No events are assigned to this organizer.");
        } catch (error) {
          setOrganizerMessage(error instanceof Error ? error.message : "Organizer details not found.");
        }
        return;
      }
      if (!selectedWorkshop || !assignedWorkshops.some((event) => event.key === selectedWorkshop)) {
        setOrganizerMessage("Select an assigned event.");
        return;
      }
      await verify(organizerId, selectedWorkshop);
      return;
    }
    await verify(inputValue, directQrLookup ? workshopFromUrl : undefined);
  }

  function pickCandidate(formattedId: string) {
    setInputValue(formattedId);
    verify(formattedId);
  }

  const isOrganizerInput = inputValue.trim().toUpperCase().startsWith("CBSO-");
  const directQrLookup = Boolean(workshopFromUrl && inputValue.trim().toUpperCase() === idFromUrl.trim().toUpperCase());
  const isChecking = status === "checking" || assignedEventsMutation.isPending;

  return (
    <div className="flex w-full min-w-0 max-w-md animate-scale-in flex-col gap-4 sm:gap-5">
      <div className="relative rounded-3xl bg-white/95 p-5 shadow-card ring-1 ring-black/5 backdrop-blur min-[380px]:p-6 sm:p-8">
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
            <InputField
              id="verifyId"
              name="verifyId"
              type="text"
              autoComplete="off"
              placeholder="Enter certificate ID"
              value={inputValue}
              validationSchema={certificateLookupSchema.shape.id}
              onChange={(e) => {
                setInputValue(e.target.value);
                setAssignedWorkshops([]);
                setSelectedWorkshop("");
                setOrganizerMessage("");
                setResult(null);
                setCandidates([]);
                setStatus("idle");
              }}
              disabled={isChecking}
              className="w-full rounded-xl border border-navy-100 bg-navy-50/40 px-4 py-3 text-base text-navy-900 placeholder:text-navy-300 outline-none transition focus:border-gold-400 focus:ring-4 focus:ring-gold-100 disabled:opacity-60"
            />
          </div>
          {isOrganizerInput && !directQrLookup && (
            <>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="verifyOrganizerName" className="text-xs font-semibold uppercase tracking-wide text-navy-600">Full Name</label>
                <InputField
                  id="verifyOrganizerName"
                  name="organizerName"
                  autoComplete="name"
                  placeholder="Enter full name"
                  value={organizerName}
                  validationSchema={organizerCertificateIdentitySchema.shape.fullName}
                  onChange={(e) => {
                    setOrganizerName(e.target.value);
                    setAssignedWorkshops([]);
                    setSelectedWorkshop("");
                    setOrganizerMessage("");
                    setResult(null);
                    setCandidates([]);
                    setStatus("idle");
                  }}
                  disabled={isChecking}
                  className="w-full rounded-xl border border-navy-100 bg-navy-50/40 px-4 py-3 text-base text-navy-900 placeholder:text-navy-300 outline-none transition focus:border-gold-400 focus:ring-4 focus:ring-gold-100 disabled:opacity-60"
                />
              </div>
              {assignedWorkshops.length > 0 && (
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="verifyOrganizerEvent" className="text-xs font-semibold uppercase tracking-wide text-navy-600">Assigned event</label>
                  <select id="verifyOrganizerEvent" value={selectedWorkshop} onChange={(e) => setSelectedWorkshop(e.target.value)} disabled={isChecking} className="w-full rounded-xl border border-navy-100 bg-navy-50/40 px-4 py-3 text-base text-navy-900 outline-none transition focus:border-gold-400 focus:ring-4 focus:ring-gold-100 disabled:opacity-60">
                    {assignedWorkshops.map((event) => <option key={event.key} value={event.key}>{event.workshopName} · {event.eventYear}</option>)}
                  </select>
                </div>
              )}
              {organizerMessage && <p role="alert" className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{organizerMessage}</p>}
            </>
          )}

          <button
            type="submit"
            disabled={isChecking}
            className="relative w-full overflow-hidden rounded-xl bg-navy-800 px-5 py-3.5 text-sm font-semibold text-white shadow-gold transition-all hover:bg-navy-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-70"
          >
            <span className={isChecking ? "invisible" : ""}>{isOrganizerInput && !directQrLookup && !assignedWorkshops.length ? "Find Assigned Events" : "Verify Certificate"}</span>
            {isChecking && (
              <span className="absolute inset-0 flex items-center justify-center">
                <LoadingSpinner label="Checking..." variant="light" />
              </span>
            )}
          </button>
        </form>
      </div>

      {status === "verified" && result && (
        <div className="animate-scale-in rounded-3xl border border-emerald-200 bg-emerald-50 p-4 shadow-card min-[380px]:p-6">
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

          <dl className="grid grid-cols-[minmax(5.5rem,0.7fr)_minmax(0,1.3fr)] gap-x-3 gap-y-2 text-sm sm:grid-cols-3">
            <dt className="text-emerald-700 font-medium sm:col-span-1">Name</dt>
            <dd className="min-w-0 break-words text-emerald-950 font-semibold sm:col-span-2">
              {result.participant.name}
            </dd>

            <dt className="text-emerald-700 font-medium sm:col-span-1">
              Certificate ID
            </dt>
            <dd className="min-w-0 break-all text-emerald-950 font-mono sm:col-span-2">
              {result.formattedId}
            </dd>

            <dt className="text-emerald-700 font-medium sm:col-span-1">
              Workshop
            </dt>
            <dd className="min-w-0 break-words text-emerald-950 sm:col-span-2">
              {result.workshop.workshopName}
            </dd>

            <dt className="text-emerald-700 font-medium sm:col-span-1">Date</dt>
            <dd className="min-w-0 break-words text-emerald-950 sm:col-span-2">
              {result.workshop.eventDate}
            </dd>

            <dt className="text-emerald-700 font-medium sm:col-span-1">
              Organized by
            </dt>
            <dd className="min-w-0 break-words text-emerald-950 sm:col-span-2">
              {result.workshop.organizedBy}
            </dd>
          </dl>

          <a
            href={`/certificate?id=${encodeURIComponent(result.formattedId)}&workshop=${encodeURIComponent(result.workshop.key)}`}
            className="mt-5 inline-block text-xs font-semibold text-emerald-800 underline underline-offset-2 hover:text-emerald-900"
          >
            View / download this certificate →
          </a>
        </div>
      )}

      {status === "attendance-required" && (
        <div role="status" className="animate-scale-in rounded-3xl border border-amber-200 bg-amber-50 p-4 shadow-card min-[380px]:p-6">
          <p className="font-display text-lg font-semibold text-amber-900">You were not present in this event.</p>
          <p className="mt-2 text-sm leading-6 text-amber-800">Your certificate is available after the organizer marks your attendance Present.</p>
        </div>
      )}

      {status === "ambiguous" && (
        <div className="animate-scale-in rounded-3xl border border-gold-200 bg-gold-50 p-4 shadow-card min-[380px]:p-6">
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
        <div className="animate-scale-in rounded-3xl border border-rose-200 bg-rose-50 p-4 text-center shadow-card min-[380px]:p-6">
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
