"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Image from "next/image";
import { useAdminPassword, useAdminToast } from "../AdminShell";
import { getWorkshopDetails, type WorkshopDetails } from "@/features/workshops/api";
import { deleteParticipant as deleteParticipantApi } from "@/features/participants/api";

type Participant = { id: string; name: string; workshop: string };
type Workshop = WorkshopDetails & {
  key: string;
  workshopName: string;
  workshopFullTitle: string;
  workshopCode: string;
  eventYear: string;
  eventDate: string;
  templatePath: string;
  participants: Participant[];
};

export default function WorkshopAdminPage() {
  const password = useAdminPassword();
  const toast = useAdminToast();
  const queryClient = useQueryClient();
  const queryKey = ["admin", "workshop-details"];
  const workshopsQuery = useQuery({
    queryKey,
    queryFn: () => getWorkshopDetails(password),
    enabled: Boolean(password),
  });
  const workshops = workshopsQuery.data ?? [];
  const error = workshopsQuery.error instanceof Error ? workshopsQuery.error.message : null;
  const loading = workshopsQuery.isFetching;
  const deleteMutation = useMutation({
    mutationFn: (input: { workshop: string; id: string; name: string }) => deleteParticipantApi(password, input),
    onSuccess: (_, deleted) => {
      queryClient.setQueryData<WorkshopDetails[]>(queryKey, (current = []) => current.map((item) =>
        item.key === deleted.workshop
          ? { ...item, participants: item.participants.filter((participant) => !(participant.id === deleted.id && participant.name === deleted.name)) }
          : item,
      ));
      void queryClient.invalidateQueries({ queryKey: ["certificate-lookup"] });
    },
  });
  const [openWorkshops, setOpenWorkshops] = useState<string[]>([]);
  const [visibleUsers, setVisibleUsers] = useState<Record<string, number>>({});
  const [deletingUser, setDeletingUser] = useState<string | null>(null);
  const [brokenTemplates, setBrokenTemplates] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (workshopsQuery.isError) toast({ title: "Could not load workshop data", description: error ?? "Unable to load workshops", tone: "error" });
  }, [error, toast, workshopsQuery.isError]);

  async function fetchDetails(showSuccess = false) {
    const result = await workshopsQuery.refetch();
    if (!result.isError && showSuccess) toast({ title: "Workshop data refreshed", description: "The list is up to date.", tone: "success" });
  }

  function toggleWorkshop(key: string) {
    setOpenWorkshops((current) =>
      current.includes(key) ? current.filter((item) => item !== key) : [...current, key]
    );
    setVisibleUsers((current) => ({ ...current, [key]: current[key] || 25 }));
  }

  async function deleteParticipant(workshop: Workshop, participant: Participant) {
    if (!window.confirm(`Remove ${participant.name} (ID ${participant.id}) from ${workshop.workshopName}?`)) return;

    const deleteKey = `${workshop.key}-${participant.id}-${participant.name}`;
    setDeletingUser(deleteKey);
    try {
      await deleteMutation.mutateAsync({ workshop: workshop.key, id: participant.id, name: participant.name });
      toast({ title: "Participant deleted", description: `${participant.name} was removed from ${workshop.workshopName}.`, tone: "success" });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to delete participant";
      toast({ title: "Could not delete participant", description: message, tone: "error" });
    } finally {
      setDeletingUser(null);
    }
  }

  return (
    <div className="text-white">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">All workshops</h1>
            <p className="mt-1 text-slate-400">Workshop information, certificate templates, and registered participants.</p>
          </div>
          <button type="button" onClick={() => void fetchDetails(true)} className="rounded-xl border border-slate-700 px-4 py-2 text-sm font-medium text-slate-200 hover:bg-slate-900">
            {loading ? "Refreshing…" : "Refresh"}
          </button>
        </div>
        {error && <p role="alert" className="mb-5 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</p>}

        <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="bg-slate-950 text-xs uppercase tracking-wide text-slate-400">
                <tr>
                  <th scope="col" className="px-5 py-4">Workshop</th>
                  <th scope="col" className="px-5 py-4">Code</th>
                  <th scope="col" className="px-5 py-4">Event date</th>
                  <th scope="col" className="px-5 py-4 text-right">Participants</th>
                  <th scope="col" className="px-5 py-4 text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {workshops.map((workshop) => {
                  const isOpen = openWorkshops.includes(workshop.key);
                  return (
                    <WorkshopRows
                      key={workshop.key}
                      workshop={workshop}
                      isOpen={isOpen}
                      visibleUsers={visibleUsers[workshop.key] || 25}
                      brokenTemplate={Boolean(brokenTemplates[workshop.key])}
                      deletingUser={deletingUser}
                      onToggle={() => toggleWorkshop(workshop.key)}
                      onTemplateError={() => setBrokenTemplates((current) => ({ ...current, [workshop.key]: true }))}
                      onShowMore={() => setVisibleUsers((current) => ({ ...current, [workshop.key]: (current[workshop.key] || 25) + 25 }))}
                      onDelete={(participant) => void deleteParticipant(workshop, participant)}
                    />
                  );
                })}
                {!loading && workshops.length === 0 && (
                  <tr><td colSpan={5} className="px-5 py-8 text-center text-slate-500">No workshops found.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

function WorkshopRows({
  workshop,
  isOpen,
  visibleUsers,
  brokenTemplate,
  deletingUser,
  onToggle,
  onTemplateError,
  onShowMore,
  onDelete,
}: {
  workshop: Workshop;
  isOpen: boolean;
  visibleUsers: number;
  brokenTemplate: boolean;
  deletingUser: string | null;
  onToggle: () => void;
  onTemplateError: () => void;
  onShowMore: () => void;
  onDelete: (participant: Participant) => void;
}) {
  return (
    <>
      <tr
        tabIndex={0}
        aria-expanded={isOpen}
        aria-controls={`workshop-details-${workshop.key}`}
        onClick={onToggle}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            onToggle();
          }
        }}
        className="cursor-pointer text-slate-200 outline-none transition hover:bg-slate-800/70 focus-visible:bg-slate-800 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-indigo-500"
      >
        <td className="px-5 py-4">
          <span className="block font-semibold text-white">{workshop.workshopName}</span>
          <span className="mt-1 block text-xs text-slate-500">{workshop.key}</span>
        </td>
        <td className="px-5 py-4 font-mono text-indigo-200">{workshop.workshopCode}</td>
        <td className="px-5 py-4 text-slate-300">{workshop.eventDate} ({workshop.eventYear})</td>
        <td className="px-5 py-4 text-right tabular-nums">{workshop.participants.length}</td>
        <td className="px-5 py-4 text-right text-xs font-semibold text-indigo-300">{isOpen ? "Hide ▲" : "View ▼"}</td>
      </tr>
      {isOpen && (
        <tr id={`workshop-details-${workshop.key}`}>
          <td colSpan={5} className="bg-slate-950/70 p-4 sm:p-6">
            <div className="space-y-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Workshop information</p>
                <p className="mt-2 text-base font-semibold text-white">{workshop.workshopFullTitle}</p>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <Info label="Workshop code" value={workshop.workshopCode} />
                  <Info label="Event date" value={`${workshop.eventDate} (${workshop.eventYear})`} />
                  <Info label="Certificate template" value={workshop.templatePath} />
                  <Info label="Registered participants" value={String(workshop.participants.length)} />
                </div>
              </div>

              {workshop.templatePath !== "Not set" && (
                <div>
                  <p className="mb-3 text-sm font-semibold text-slate-200">Certificate template</p>
                  {brokenTemplate ? (
                    <div className="w-fit max-w-full rounded-xl border border-amber-500/20 bg-amber-500/10 p-4 text-sm text-amber-200">
                      <p className="font-semibold">Template image not found</p>
                      <p className="mt-1 text-xs text-amber-200/80">The app could not load <span className="font-mono">{workshop.templatePath}</span>.</p>
                    </div>
                  ) : (
                    <a href={workshop.templatePath} target="_blank" rel="noreferrer" onClick={(event) => event.stopPropagation()} className="block w-fit overflow-hidden rounded-xl border border-slate-700 hover:border-indigo-400">
                      <Image
                        src={workshop.templatePath}
                        alt={`${workshop.workshopName} certificate template`}
                        width={1000}
                        height={700}
                        className="max-h-72 w-auto bg-slate-950 object-contain"
                        onError={onTemplateError}
                      />
                    </a>
                  )}
                </div>
              )}

              <section>
                <h3 className="font-semibold text-white">Registered participants ({workshop.participants.length})</h3>
                {workshop.participants.length === 0 ? (
                  <p className="mt-3 text-sm text-slate-500">No participants registered for this workshop.</p>
                ) : (
                  <div className="mt-3 overflow-x-auto rounded-xl border border-slate-800">
                    <table className="w-full min-w-[480px] text-left text-sm">
                      <thead className="bg-slate-900 text-xs uppercase text-slate-400">
                        <tr><th scope="col" className="px-4 py-3">Certificate ID</th><th scope="col" className="px-4 py-3">Name</th><th scope="col" className="px-4 py-3 text-right">Action</th></tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800">
                        {workshop.participants.slice(0, visibleUsers).map((participant) => {
                          const deleteKey = `${workshop.key}-${participant.id}-${participant.name}`;
                          return (
                            <tr key={deleteKey}>
                              <td className="px-4 py-3 font-mono text-indigo-200">{participant.id}</td>
                              <td className="px-4 py-3 text-slate-200">{participant.name}</td>
                              <td className="px-4 py-3 text-right">
                                <button type="button" disabled={deletingUser !== null} onClick={() => onDelete(participant)} className="rounded-md border border-red-500/30 px-2.5 py-1.5 text-xs font-semibold text-red-300 hover:bg-red-500/10 disabled:opacity-50">
                                  {deletingUser === deleteKey ? "Deleting…" : "Delete"}
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
                {visibleUsers < workshop.participants.length && (
                  <button type="button" onClick={onShowMore} className="mt-3 rounded-lg border border-slate-700 px-3 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-900">Show 25 more participants</button>
                )}
              </section>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-slate-900 p-4">
      <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 break-all text-sm font-medium text-slate-100">{value}</p>
    </div>
  );
}
