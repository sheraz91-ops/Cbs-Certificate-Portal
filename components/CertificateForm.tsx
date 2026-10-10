"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "@tanstack/react-query";
import type { WorkshopDefinition } from "@/types/workshop";
import { getWorkshops } from "@/features/workshops/api";
import { lookupCertificate } from "@/features/certificates/api";
import {
  getOrganizerAssignedEvents,
  prepareOrganizerCertificate,
} from "@/features/certificates/organizer-api";
import { generateCertificatePdf, downloadPdf } from "@/lib/generateCertificate";
import { buildVerifyUrl } from "@/lib/qrcode";
import type {
  AlertState,
  CertificateCandidate,
  DatabaseLookupResult,
  GenerationStatus,
} from "@/types";
import AlertMessage from "./AlertMessage";
import LoadingSpinner from "./LoadingSpinner";
import {
  certificateLookupSchema,
  organizerCertificateIdentitySchema,
  validationMessage,
} from "@/lib/validation/schemas";
import InputField from "@/components/InputField";

type WorkshopOption = Pick<WorkshopDefinition, "key" | "workshopName" | "isCompleted">;

export default function CertificateForm() {
  const router = useRouter();
  const [certificateId, setCertificateId] = useState("");
  const [organizerName, setOrganizerName] = useState("");
  const [assignedWorkshops, setAssignedWorkshops] = useState<
    WorkshopDefinition[]
  >([]);
  const [selectedWorkshop, setSelectedWorkshop] = useState("");
  const [status, setStatus] = useState<GenerationStatus>("idle");
  const [alert, setAlert] = useState<AlertState | null>(null);
  const [candidates, setCandidates] = useState<CertificateCandidate[]>([]);
  const workshopsQuery = useQuery({
    queryKey: ["workshops", "public"],
    queryFn: getWorkshops,
  });
  const lookupMutation = useMutation({
    mutationFn: ({ id, workshop }: { id: string; workshop?: string }) =>
      lookupCertificate(id, workshop),
  });
  const assignedEventsMutation = useMutation({
    mutationFn: getOrganizerAssignedEvents,
  });
  const organizerCertificateMutation = useMutation({
    mutationFn: prepareOrganizerCertificate,
  });
  const workshops: WorkshopOption[] = workshopsQuery.data ?? [];
  const isOrganizer = certificateId.trim().toUpperCase().startsWith("CBSO-");

  const isLoading =
    status === "loading" ||
    assignedEventsMutation.isPending ||
    organizerCertificateMutation.isPending;

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setAlert(null);
    setCandidates([]);

    if (isOrganizer) {
      const identity = organizerCertificateIdentitySchema.safeParse({
        organizerId: certificateId,
        fullName: organizerName,
      });
      if (!identity.success) {
        setStatus("error");
        setAlert({ type: "error", message: validationMessage(identity.error) });
        return;
      }

      setStatus("loading");
      try {
        if (!assignedWorkshops.length) {
          const assigned = await assignedEventsMutation.mutateAsync(
            identity.data,
          );
          setAssignedWorkshops(assigned);
          setSelectedWorkshop(assigned[0]?.key ?? "");
          setStatus("idle");
          setAlert(
            assigned.length
              ? {
                  type: "success",
                  message:
                    "Select one of your completed assigned events, then generate your certificate.",
                }
              : {
                  type: "error",
                  message: "No completed events are available for this organizer yet.",
                },
          );
          return;
        }
        if (
          !selectedWorkshop ||
          !assignedWorkshops.some(
            (workshop) => workshop.key === selectedWorkshop,
          )
        ) {
          setStatus("error");
          setAlert({ type: "error", message: "Select an assigned event." });
          return;
        }
        if (assignedWorkshops.find((workshop) => workshop.key === selectedWorkshop)?.isCompleted !== true) {
          setStatus("error");
          setAlert({ type: "error", message: "This event has not been marked completed yet. Certificates are not available." });
          return;
        }
        const certificate = await organizerCertificateMutation.mutateAsync({
          ...identity.data,
          workshop: selectedWorkshop,
        });
        const plan = {
          fullName: certificate.fullName,
          formattedId: certificate.organizerId,
          verifyUrl: buildVerifyUrl(
            certificate.organizerId,
            certificate.workshop.key,
          ),
          workshop: certificate.workshop,
        };
        const bytes = await generateCertificatePdf(plan);
        const safeName = certificate.fullName
          .trim()
          .replace(/[^a-z0-9]+/gi, "_");
        downloadPdf(bytes, `${certificate.organizerId}_${safeName}.pdf`);
        setStatus("idle");
        setAlert({
          type: "success",
          message: "Your certificate has been downloaded.",
        });
      } catch (error) {
        setStatus("error");
        setAlert({
          type: "error",
          message:
            error instanceof Error
              ? error.message
              : "Unable to prepare your certificate.",
        });
      }
      return;
    }

    const parsedInput = certificateLookupSchema.safeParse({
      id: certificateId,
      workshop: selectedWorkshop || undefined,
    });
    if (!parsedInput.success) {
      setStatus("error");
      setAlert({
        type: "error",
        message: validationMessage(parsedInput.error),
      });
      return;
    }

    setStatus("loading");

    // Small delay so the loading state is perceptible even on very fast
    // devices — avoids an abrupt flash before navigating away.
    await new Promise((resolve) => setTimeout(resolve, 350));

    let result: DatabaseLookupResult;
    try {
      result = await lookupMutation.mutateAsync(parsedInput.data);
    } catch {
      setStatus("error");
      setAlert({
        type: "error",
        message: "Unable to look up this certificate. Please try again.",
      });
      return;
    }

    if (result.status === "not-found") {
      setStatus("error");
      setAlert({ type: "error", message: "Certificate ID not found." });
      return;
    }

    if (result.status === "attendance-required") {
      setStatus("error");
      setAlert({
        type: "error",
        message:
          "You were not present in this event. Your certificate is available after the organizer marks your attendance Present.",
      });
      return;
    }

    if (result.status === "event-not-completed") {
      setStatus("error");
      setAlert({ type: "error", message: "This event has not happened yet or has not been marked completed by CBS. Certificates will be available after completion." });
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
    <div className="w-full min-w-0 max-w-md animate-scale-in">
      <div className="relative rounded-3xl bg-white/95 p-5 shadow-card ring-1 ring-black/5 backdrop-blur min-[380px]:p-6 sm:p-8">
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
            Enter your certificate ID and participation. Organizers can use their CBSO ID and full name to see their assigned events.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="certificateWorkshop"
              className="text-xs font-semibold uppercase tracking-wide text-navy-600"
            >
              {isOrganizer ? "Assigned event" : "Participation"}
            </label>
            <select
              id="certificateWorkshop"
              value={selectedWorkshop}
              onChange={(e) => {
                setSelectedWorkshop(e.target.value);
                if (status !== "idle") setStatus("idle");
                if (alert) setAlert(null);
              }}
              disabled={
                isLoading ||
                workshopsQuery.isLoading ||
                (isOrganizer && assignedWorkshops.length === 0)
              }
              className="w-full rounded-xl border border-navy-100 bg-navy-50/40 px-4 py-3 text-base text-navy-900 outline-none transition focus:border-gold-400 focus:ring-4 focus:ring-gold-100 disabled:opacity-60"
            >
              <option value="">
                {isOrganizer
                  ? assignedWorkshops.length
                    ? "Select an assigned event"
                    : "Find assigned events first"
                  : "Select your participation"}
              </option>
              {(isOrganizer ? assignedWorkshops : workshops).map((workshop) => (
                <option key={workshop.key} value={workshop.key}>
                  {workshop.workshopName}
                </option>
              ))}
            </select>
          </div>
          {isOrganizer && (
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="organizerFullName"
                className="text-xs font-semibold uppercase tracking-wide text-navy-600"
              >
                Full Name
              </label>
              <InputField
                id="organizerFullName"
                name="organizerFullName"
                autoComplete="name"
                placeholder="Enter full name"
                value={organizerName}
                validationSchema={
                  organizerCertificateIdentitySchema.shape.fullName
                }
                onChange={(e) => {
                  setOrganizerName(e.target.value);
                  setAssignedWorkshops([]);
                  setSelectedWorkshop("");
                  setAlert(null);
                }}
                disabled={isLoading}
                className="w-full rounded-xl border border-navy-100 bg-navy-50/40 px-4 py-3 text-base text-navy-900 placeholder:text-navy-300 outline-none transition focus:border-gold-400 focus:ring-4 focus:ring-gold-100 disabled:opacity-60"
              />
            </div>
          )}
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="certificateId"
              className="text-xs font-semibold uppercase tracking-wide text-navy-600"
            >
              Certificate ID
            </label>
            <InputField
              id="certificateId"
              name="certificateId"
              type="text"
              autoComplete="off"
              placeholder="Enter certificate ID"
              value={certificateId}
              validationSchema={certificateLookupSchema.shape.id}
              onChange={(e) => {
                const nextId = e.target.value;
                const nextIsOrganizer = nextId.trim().toUpperCase().startsWith("CBSO-");
                setCertificateId(nextId);
                if (isOrganizer || nextIsOrganizer) {
                  setAssignedWorkshops([]);
                  setSelectedWorkshop("");
                }
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
              {isOrganizer && !assignedWorkshops.length
                ? "Find Assigned Events"
                : "Generate Certificate"}
            
            </span>
            {isLoading && (
              <span className="absolute inset-0 flex items-center justify-center">
                <LoadingSpinner label="Looking up..." variant="light" />
              </span>
            )}
          </button>
        </form>

       

        {candidates.length > 0 && (
          <div className="mt-5">
            <p className="mb-2 text-sm font-semibold text-navy-800">
              Certificates matching ID {certificateId.trim()}
            </p>
            <p className="mb-3 text-xs text-navy-500">
              Choose the event where you received your certificate.
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
