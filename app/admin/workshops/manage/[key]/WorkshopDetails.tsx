"use client";

import { useEffect, useState, type FormEvent } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { deleteParticipant } from "@/features/participants/api";
import {
  deleteWorkshop,
  getWorkshopDetails,
  updateWorkshop,
  type UpdateWorkshopInput,
  type WorkshopDetails as WorkshopRecord,
} from "@/features/workshops/api";
import InputField from "@/components/InputField";
import {
  updateWorkshopSchema,
  validationMessage,
} from "@/lib/validation/schemas";
import { useAdminSession, useAdminToast } from "../../../AdminShell";

export default function WorkshopDetails({
  workshopKey,
}: {
  workshopKey: string;
}) {
  const authenticated = useAdminSession();
  const toast = useAdminToast();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<UpdateWorkshopInput | null>(null);
  const [formError, setFormError] = useState("");
  const queryKey = ["admin", "workshop-details"];
  const workshopsQuery = useQuery({
    queryKey,
    queryFn: () => getWorkshopDetails(),
    enabled: authenticated,
  });
  const workshop = workshopsQuery.data?.find(
    (item) => item.key === workshopKey,
  );
  const updateMutation = useMutation({
    mutationFn: updateWorkshop,
    onSuccess: async (updated) => {
      queryClient.setQueryData<WorkshopRecord[]>(queryKey, (current = []) =>
        current.map((item) =>
          item.key === workshopKey ? { ...item, ...updated } : item,
        ),
      );
      await Promise.all([
        queryClient.invalidateQueries({ queryKey }),
        queryClient.invalidateQueries({ queryKey: ["admin", "workshops"] }),
        queryClient.invalidateQueries({ queryKey: ["events"] }),
        queryClient.invalidateQueries({ queryKey: ["workshops", "public"] }),
        queryClient.invalidateQueries({ queryKey: ["certificate-lookup"] }),
      ]);
      setEditing(false);
      setFormError("");
      toast({
        title: "Workshop updated",
        description: `${updated.workshopName} details were saved.`,
        tone: "success",
      });
    },
  });
  const participantMutation = useMutation({
    mutationFn: (input: { id: string; name: string }) =>
      deleteParticipant({ ...input, workshop: workshopKey }),
    onSuccess: async (_, deleted) => {
      queryClient.setQueryData<WorkshopRecord[]>(queryKey, (current = []) =>
        current.map((item) =>
          item.key === workshopKey
            ? {
                ...item,
                participants: item.participants.filter(
                  (participant) =>
                    !(
                      participant.id === deleted.id &&
                      participant.name === deleted.name
                    ),
                ),
              }
            : item,
        ),
      );
      await queryClient.invalidateQueries({ queryKey: ["certificate-lookup"] });
    },
  });
  const removeWorkshopMutation = useMutation({
    mutationFn: () => deleteWorkshop(workshopKey),
    onSuccess: async (result) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["admin", "workshops"] }),
        queryClient.invalidateQueries({ queryKey }),
        queryClient.invalidateQueries({ queryKey: ["workshops", "public"] }),
        queryClient.invalidateQueries({ queryKey: ["events"] }),
        queryClient.invalidateQueries({ queryKey: ["certificate-lookup"] }),
      ]);
      toast({
        title: "Workshop deleted",
        description: `${result.deletedParticipants} participant record(s) were also removed.`,
        tone: "success",
      });
      router.replace("/admin/workshops/manage");
    },
    onError: (error) =>
      toast({
        title: "Could not delete workshop",
        description: error.message,
        tone: "error",
      }),
  });

  useEffect(() => {
    if (workshopsQuery.isError)
      toast({
        title: "Could not load workshop",
        description: workshopsQuery.error.message,
        tone: "error",
      });
  }, [toast, workshopsQuery.error, workshopsQuery.isError]);

  async function onDeleteParticipant(participant: {
    id: string;
    name: string;
  }) {
    if (
      !window.confirm(
        `Remove ${participant.name} (ID ${participant.id}) from ${workshop?.workshopName ?? "this workshop"}?`,
      )
    )
      return;
    try {
      await participantMutation.mutateAsync(participant);
      toast({
        title: "Participant deleted",
        description: `${participant.name} was removed from this workshop.`,
        tone: "success",
      });
    } catch (error) {
      toast({
        title: "Could not delete participant",
        description:
          error instanceof Error
            ? error.message
            : "Unable to delete participant",
        tone: "error",
      });
    }
  }

  function onDeleteWorkshop() {
    if (
      !workshop ||
      !window.confirm(
        `Delete "${workshop.workshopName}" and all ${workshop.participants.length} participant record(s)?`,
      )
    )
      return;
    removeWorkshopMutation.mutate();
  }

  function beginEditing() {
    if (!workshop) return;
    setDraft({
      key: workshop.key,
      workshopName: workshop.workshopName,
      workshopFullTitle: workshop.workshopFullTitle,
      workshopCode: workshop.workshopCode,
      eventYear: workshop.eventYear,
      eventDate: workshop.eventDate,
      isActive: workshop.isActive !== false,
      allowOutsiders: workshop.allowOutsiders ?? false,
    });
    setFormError("");
    setEditing(true);
  }

  function submitUpdate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!draft) return;
    const parsed = updateWorkshopSchema.safeParse(draft);
    if (!parsed.success) {
      setFormError(validationMessage(parsed.error));
      return;
    }
    setFormError("");
    updateMutation.mutate(parsed.data);
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <Link
        href="/admin/workshops/manage"
        className="inline-flex items-center gap-2 text-sm font-medium text-indigo-300 hover:text-indigo-200"
      >
        ← Manage Workshops
      </Link>
      {workshopsQuery.isPending ? (
        <p className="rounded-2xl border border-slate-800 bg-slate-950 px-6 py-10 text-center text-sm text-slate-400">
          Loading workshop…
        </p>
      ) : workshopsQuery.isError ? (
        <p
          role="alert"
          className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300"
        >
          {workshopsQuery.error.message}
        </p>
      ) : !workshop ? (
        <p
          role="alert"
          className="rounded-xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-200"
        >
          Workshop “{workshopKey}” was not found.
        </p>
      ) : (
        <>
          <header>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-300">
              Admin · Workshop
            </p>
            <h2 className="mt-2 text-3xl font-bold">{workshop.workshopName}</h2>
            <p className="mt-2 font-mono text-sm text-slate-400">
              {workshop.key}
            </p>
          </header>

          <section className="rounded-2xl border border-slate-800 bg-slate-950 p-4 shadow-xl shadow-slate-950/10 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 className="text-lg font-semibold text-white">
                Workshop Details
              </h3>
              {!editing && (
                <button
                  type="button"
                  onClick={beginEditing}
                  className="rounded-xl border border-indigo-400/30 px-4 py-2 text-sm font-semibold text-indigo-200 hover:bg-indigo-500/10"
                >
                  Edit workshop fields
                </button>
              )}
            </div>
            {editing && draft ? (
              <form onSubmit={submitUpdate} className="mt-5 space-y-5">
                <p className="text-xs text-slate-500">
                  Workshop ID is fixed because participant records and organizer
                  access use it.
                </p>
                <div className="grid gap-4 sm:grid-cols-2">
                  {(
                    [
                      ["workshopName", "Workshop Name"],
                      ["workshopFullTitle", "Full Descriptive Title"],
                      ["workshopCode", "Workshop Code"],
                      ["eventYear", "Event Year"],
                      ["eventDate", "Event Date"],
                    ] as const
                  ).map(([field, label]) => (
                    <label
                      key={field}
                      className="block text-xs font-medium text-slate-300"
                    >
                      {label}
                      <InputField
                        required
                        type="text"
                        inputMode={
                          field === "eventYear" ? "numeric" : undefined
                        }
                        placeholder={`Enter ${label.toLowerCase()}`}
                        value={draft[field]}
                        validationSchema={updateWorkshopSchema.shape[field]}
                        onChange={(event) =>
                          setDraft((current) =>
                            current
                              ? { ...current, [field]: event.target.value }
                              : current,
                          )
                        }
                        className="mt-1.5 h-11 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 text-sm text-slate-100 outline-none focus:border-indigo-500"
                      />
                    </label>
                  ))}
                </div>
                <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-800 bg-slate-900/60 p-4 text-sm text-slate-200">
                  <InputField
                    type="checkbox"
                    checked={draft.isActive}
                    validationSchema={updateWorkshopSchema.shape.isActive}
                    onChange={(event) =>
                      setDraft((current) =>
                        current
                          ? { ...current, isActive: event.target.checked }
                          : current,
                      )
                    }
                    className="mt-0.5 accent-indigo-500"
                  />
                  <span>
                    <span className="block font-medium">Active event</span>
                    <span className="mt-1 block text-xs text-slate-400">
                      Active events appear in public registration and accept new
                      registrations.
                    </span>
                  </span>
                </label>
                <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-800 bg-slate-900/60 p-4 text-sm text-slate-200">
                  <InputField
                    type="checkbox"
                    checked={draft.allowOutsiders}
                    validationSchema={updateWorkshopSchema.shape.allowOutsiders}
                    onChange={(event) =>
                      setDraft((current) =>
                        current
                          ? { ...current, allowOutsiders: event.target.checked }
                          : current,
                      )
                    }
                    className="mt-0.5 accent-indigo-500"
                  />
                  <span>
                    <span className="block font-medium">
                      Allow outside participants
                    </span>
                    <span className="mt-1 block text-xs text-slate-400">
                      Outside participants can register with any registration
                      number format.
                    </span>
                  </span>
                </label>
                {(formError || updateMutation.isError) && (
                  <p role="alert" className="text-sm text-red-300">
                    {formError ||
                      (updateMutation.isError
                        ? updateMutation.error.message
                        : "")}
                  </p>
                )}
                <div className="flex flex-wrap gap-3">
                  <button
                    type="submit"
                    disabled={updateMutation.isPending}
                    className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50"
                  >
                    {updateMutation.isPending
                      ? "Saving…"
                      : "Save workshop fields"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEditing(false);
                      setDraft(null);
                      setFormError("");
                    }}
                    className="rounded-xl border border-slate-700 px-4 py-2.5 text-sm font-semibold text-slate-300 hover:bg-slate-900"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <dl className="mt-5 grid gap-x-8 gap-y-5 sm:grid-cols-2 lg:grid-cols-3">
                <Info label="Workshop ID" value={workshop.key} />
                <Info label="Workshop Name" value={workshop.workshopName} />
                <Info label="Full Title" value={workshop.workshopFullTitle} />
                <Info label="Workshop Code" value={workshop.workshopCode} />
                <Info label="Event Year" value={workshop.eventYear} />
                <Info label="Event Date" value={workshop.eventDate} />
                <Info
                  label="Event Status"
                  value={workshop.isActive !== false ? "Active" : "Inactive"}
                />
                <Info
                  label="Outside Participants"
                  value={workshop.allowOutsiders ? "Allowed" : "Not allowed"}
                />
                <Info label="Organized By" value={workshop.organizedBy} />
                <Info
                  label="Certificate Template Path"
                  value={workshop.templatePath}
                />
                <Info
                  label="Registered Participants"
                  value={String(workshop.participants.length)}
                />
              </dl>
            )}
            {workshop.templatePath !== "Not set" && (
              <div className="mt-6">
                <h4 className="mb-3 text-sm font-semibold text-slate-200">
                  Certificate Template
                </h4>
                <a
                  href={workshop.templatePath}
                  target="_blank"
                  rel="noreferrer"
                  className="block w-fit overflow-hidden rounded-xl border border-slate-700 hover:border-indigo-400"
                >
                  <Image
                    src={workshop.templatePath}
                    alt={`${workshop.workshopName} certificate template`}
                    width={1000}
                    height={700}
                    className="max-h-80 w-auto bg-slate-950 object-contain"
                  />
                </a>
              </div>
            )}
          </section>

          <section className="rounded-2xl border border-slate-800 bg-slate-950 p-4 shadow-xl shadow-slate-950/10 sm:p-6">
            <h3 className="text-lg font-semibold text-white">
              Participants ({workshop.participants.length})
            </h3>
            {workshop.participants.length === 0 ? (
              <p className="mt-4 text-sm text-slate-400">
                No users are enrolled in this workshop.
              </p>
            ) : (
              <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:hidden">
                {workshop.participants.map((participant) => (
                  <article
                    key={`${participant.id}-${participant.name}`}
                    className="min-w-0 rounded-xl border border-slate-800 bg-slate-900/70 p-4"
                  >
                    <p className="break-words font-semibold text-slate-100">
                      {participant.name}
                    </p>
                    <dl className="mt-3 space-y-2 border-t border-slate-800 pt-3 text-xs">
                      <div>
                        <dt className="text-slate-500">User ID</dt>
                        <dd className="mt-0.5 break-all font-mono text-indigo-200">
                          {participant.userId ?? "Legacy record"}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-slate-500">Certificate ID</dt>
                        <dd className="mt-0.5 break-all font-mono text-indigo-200">
                          {participant.id}
                        </dd>
                      </div>
                    </dl>
                    <button
                      type="button"
                      disabled={participantMutation.isPending}
                      onClick={() => void onDeleteParticipant(participant)}
                      className="mt-4 min-h-10 w-full rounded-lg border border-red-500/30 px-3 py-2 text-sm font-semibold text-red-300 hover:bg-red-500/10 disabled:opacity-50"
                    >
                      Remove participant
                    </button>
                  </article>
                ))}
              </div>
            )}
            {workshop.participants.length > 0 && (
              <div className="mt-4 hidden overflow-x-auto rounded-xl border border-slate-800 lg:block">
                <table className="w-full min-w-[680px] text-left text-sm">
                  <thead className="bg-slate-900 text-xs uppercase text-slate-400">
                    <tr>
                      <th className="px-4 py-3">User ID</th>
                      <th className="px-4 py-3">Certificate ID</th>
                      <th className="px-4 py-3">Full Name</th>
                      <th className="px-4 py-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {workshop.participants.map((participant) => (
                      <tr key={`${participant.id}-${participant.name}`}>
                        <td className="px-4 py-3 font-mono text-indigo-200">
                          {participant.userId ?? "Legacy record"}
                        </td>
                        <td className="px-4 py-3 font-mono text-indigo-200">
                          {participant.id}
                        </td>
                        <td className="px-4 py-3 text-slate-200">
                          {participant.name}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            type="button"
                            disabled={participantMutation.isPending}
                            onClick={() =>
                              void onDeleteParticipant(participant)
                            }
                            className="rounded-md border border-red-500/30 px-2.5 py-1.5 text-xs font-semibold text-red-300 hover:bg-red-500/10 disabled:opacity-50"
                          >
                            Remove
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section className="flex flex-col gap-3 rounded-2xl border border-red-500/20 bg-slate-950 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-6">
            <div>
              <h3 className="font-semibold text-red-200">Delete Workshop</h3>
              <p className="mt-1 text-sm text-slate-400">
                Deletes this workshop and all its participant enrollments.
                Registered users remain.
              </p>
            </div>
            <button
              type="button"
              disabled={removeWorkshopMutation.isPending}
              onClick={onDeleteWorkshop}
              className="rounded-lg border border-red-500/40 px-4 py-2 text-sm font-semibold text-red-200 hover:bg-red-500/10 disabled:opacity-50"
            >
              {removeWorkshopMutation.isPending
                ? "Deleting…"
                : "Delete Workshop"}
            </button>
          </section>
        </>
      )}
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">
        {label}
      </dt>
      <dd className="mt-1 break-words text-sm font-medium text-slate-100">
        {value || "—"}
      </dd>
    </div>
  );
}
