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
import { detectTemplateLayout } from "@/lib/detectTemplateLayout";
import {
  templateFileMetadataSchema,
  updateWorkshopSchema,
  validationMessage,
} from "@/lib/validation/schemas";
import { useAdminSession, useAdminToast } from "../../../AdminShell";

function formatCustomAnswer(
  field: { type?: string; choices?: string[] } | undefined,
  value: string,
) {
  if (field?.type === "checkbox" && field.choices?.length) {
    try {
      const selected: unknown = JSON.parse(value);
      if (
        Array.isArray(selected) &&
        selected.every((choice) => typeof choice === "string")
      ) {
        return selected.join(", ") || "No selections";
      }
    } catch {
      return value;
    }
  }
  if (field?.type === "checkbox")
    return value === "true" ? "Checked" : "Not checked";
  if (field?.type === "yes_no")
    return value === "yes" ? "Yes" : value === "no" ? "No" : value;
  return value;
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string).split(",")[1]);
    reader.onerror = () => reject(new Error("Could not read the selected template image."));
    reader.readAsDataURL(file);
  });
}

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
  const [templateFile, setTemplateFile] = useState<File | null>(null);
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
      setTemplateFile(null);
      setFormError("");
      toast({
        title: "Event updated",
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
        title: "Event deleted",
        description: `${result.deletedParticipants} participant record(s) were also removed.`,
        tone: "success",
      });
      router.replace("/admin/workshops/manage");
    },
    onError: (error) =>
      toast({
        title: "Could not delete event",
        description: error.message,
        tone: "error",
      }),
  });

  useEffect(() => {
    if (workshopsQuery.isError)
      toast({
        title: "Could not load event",
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
        `Remove ${participant.name} (ID ${participant.id}) from ${workshop?.workshopName ?? "this event"}?`,
      )
    )
      return;
    try {
      await participantMutation.mutateAsync(participant);
      toast({
        title: "Participant deleted",
        description: `${participant.name} was removed from this event.`,
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
      isCompleted: workshop.isCompleted === true,
      allowOutsiders: workshop.allowOutsiders ?? false,
      registrationFields: (workshop.registrationFields ?? []).map((field) => ({
        ...field,
        type: field.type ?? "text",
        choices: field.choices ?? [],
        selectionMode: field.selectionMode ?? "multiple",
      })),
    });
    setFormError("");
    setEditing(true);
  }

  async function submitUpdate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!draft) return;
    const parsed = updateWorkshopSchema.safeParse(draft);
    if (!parsed.success) {
      setFormError(validationMessage(parsed.error));
      return;
    }
    setFormError("");
    try {
      if (!templateFile) {
        updateMutation.mutate(parsed.data);
        return;
      }
      const layout = await detectTemplateLayout(templateFile);
      updateMutation.mutate({
        ...parsed.data,
        imageBase64: await fileToBase64(templateFile),
        imageExt: templateFile.name.split(".").pop()?.toLowerCase(),
        layout,
      });
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Could not prepare the template image.");
    }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <Link
        href="/admin/workshops/manage"
        className="inline-flex items-center gap-2 text-sm font-medium text-indigo-300 hover:text-indigo-200"
      >
        ← Manage Events
      </Link>
      {workshopsQuery.isPending ? (
        <p className="rounded-2xl border border-slate-800 bg-slate-950 px-6 py-10 text-center text-sm text-slate-400">
          Loading event…
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
          Event “{workshopKey}” was not found.
        </p>
      ) : (
        <>
          <header>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-300">
              Admin · Event
            </p>
            <h2 className="mt-2 text-3xl font-bold">{workshop.workshopName}</h2>
            <p className="mt-2 font-mono text-sm text-slate-400">
              {workshop.key}
            </p>
          </header>

          <section className="rounded-2xl border border-slate-800 bg-slate-950 p-4 shadow-xl shadow-slate-950/10 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 className="text-lg font-semibold text-white">
                Event Details
              </h3>
              {!editing && (
                <button
                  type="button"
                  onClick={beginEditing}
                  className="rounded-xl border border-indigo-400/30 px-4 py-2 text-sm font-semibold text-indigo-200 hover:bg-indigo-500/10"
                >
                  Edit event fields
                </button>
              )}
            </div>
            {editing && draft ? (
              <form onSubmit={submitUpdate} className="mt-5 space-y-5">
                <p className="text-xs text-slate-500">
                  Event ID is fixed because participant records and organizer
                  access use it.
                </p>
                <div className="grid gap-4 sm:grid-cols-2">
                  {(
                    [
                      ["workshopName", "Event Name"],
                      ["workshopFullTitle", "Full Descriptive Title"],
                      ["workshopCode", "Event Code"],
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
                <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 text-sm text-slate-200">
                  <InputField
                    type="checkbox"
                    checked={draft.isCompleted}
                    validationSchema={updateWorkshopSchema.shape.isCompleted}
                    onChange={(event) =>
                      setDraft((current) =>
                        current
                          ? { ...current, isCompleted: event.target.checked }
                          : current,
                      )
                    }
                    className="mt-0.5 accent-amber-500"
                  />
                  <span>
                    <span className="block font-medium">
                      Mark event as completed
                    </span>
                    <span className="mt-1 block text-xs text-slate-400">
                      Organizers will lose access to attendance for this event.
                      Participant certificates will become available.
                    </span>
                  </span>
                </label>
                <section className="rounded-xl border border-slate-800 bg-slate-900/40 p-4">
                  <label className="block text-sm font-medium text-slate-200" htmlFor="event-certificate-template">Certificate template</label>
                  <p className="mt-1 text-xs text-slate-400">Upload a PNG or JPEG template with visible name and ID areas. The layout will be detected when you save.</p>
                  <input
                    id="event-certificate-template"
                    type="file"
                    accept="image/png,image/jpeg,.png,.jpg,.jpeg"
                    onChange={(event) => {
                      const selected = event.target.files?.[0] ?? null;
                      if (!selected) return;
                      const parsedFile = templateFileMetadataSchema.safeParse({ type: selected.type, size: selected.size });
                      if (!parsedFile.success) {
                        setTemplateFile(null);
                        setFormError(validationMessage(parsedFile.error));
                        event.target.value = "";
                        return;
                      }
                      setFormError("");
                      setTemplateFile(selected);
                    }}
                    className="mt-3 block min-h-11 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-300 file:mr-3 file:rounded-md file:border-0 file:bg-indigo-500/10 file:px-3 file:py-1.5 file:font-semibold file:text-indigo-200"
                  />
                  {templateFile && <p className="mt-2 break-all text-xs text-indigo-300">Selected: {templateFile.name}</p>}
                  {!templateFile && <p className="mt-2 text-xs text-slate-500">Current template: {workshop.templatePath === "Not set" ? "Not configured" : "Saved"}</p>}
                </section>
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
                <section className="rounded-xl border border-slate-800 bg-slate-900/40 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h4 className="text-sm font-semibold text-slate-100">
                        Custom registration fields
                      </h4>
                      <p className="mt-1 text-xs text-slate-400">
                        Edit extra questions shown during registration.
                      </p>
                    </div>
                    <button
                      type="button"
                      disabled={draft.registrationFields.length >= 30}
                      onClick={() =>
                        setDraft((current) =>
                          current
                            ? {
                                ...current,
                                registrationFields: [
                                  ...current.registrationFields,
                                  {
                                    key: `custom-${Date.now().toString(36)}-${current.registrationFields.length}`,
                                    label: "",
                                    type: "text",
                                    choices: [],
                                    selectionMode: "multiple",
                                    required: false,
                                  },
                                ],
                              }
                            : current,
                        )
                      }
                      className="rounded-lg border border-indigo-500/40 px-3 py-2 text-xs font-semibold text-indigo-200 disabled:opacity-50"
                    >
                      Add field
                    </button>
                  </div>
                  {draft.registrationFields.map((field, index) => (
                    <div
                      key={`${field.key}-${index}`}
                      className="mt-3 grid gap-3 rounded-lg border border-slate-800 p-3 sm:grid-cols-[minmax(0,1fr)_10rem_auto_auto] sm:items-center"
                    >
                      <InputField
                        value={field.label}
                        onChange={(event) =>
                          setDraft((current) =>
                            current
                              ? {
                                  ...current,
                                  registrationFields:
                                    current.registrationFields.map((item, i) =>
                                      i === index
                                        ? { ...item, label: event.target.value }
                                        : item,
                                    ),
                                }
                              : current,
                          )
                        }
                        placeholder="Field label"
                        className="h-10 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 text-sm text-white"
                      />
                      <select
                        aria-label={`Type for ${field.label || `custom field ${index + 1}`}`}
                        value={field.type ?? "text"}
                        onChange={(event) =>
                          setDraft((current) =>
                            current
                              ? {
                                  ...current,
                                  registrationFields:
                                    current.registrationFields.map(
                                      (item, i) => {
                                        if (i !== index) return item;
                                        const type = event.target.value as
                                          | "text"
                                          | "yes_no"
                                          | "checkbox";
                                        return {
                                          ...item,
                                          type,
                                          choices:
                                            type === "checkbox"
                                              ? item.choices
                                              : [],
                                        };
                                      },
                                    ),
                                }
                              : current,
                          )
                        }
                        className="h-10 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 text-sm text-white"
                      >
                        <option value="text">Text</option>
                        <option value="yes_no">Yes / No</option>
                        <option value="checkbox">Checkbox</option>
                      </select>
                      {field.type === "checkbox" && (
                        <div className="space-y-2 sm:col-span-4">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <span className="text-xs font-medium text-slate-300">
                              Choices (leave empty for a single checkbox)
                            </span>
                            <select
                              aria-label={`Selection mode for ${field.label || `custom field ${index + 1}`}`}
                              value={field.selectionMode ?? "multiple"}
                              onChange={(event) =>
                                setDraft((current) =>
                                  current
                                    ? {
                                        ...current,
                                        registrationFields:
                                          current.registrationFields.map(
                                            (item, i) =>
                                              i === index
                                                ? {
                                                    ...item,
                                                    selectionMode: event.target
                                                      .value as
                                                      | "multiple"
                                                      | "single",
                                                  }
                                                : item,
                                          ),
                                      }
                                    : current,
                                )
                              }
                              className="h-9 rounded-lg border border-slate-700 bg-slate-900 px-2 text-xs text-white"
                            >
                              <option value="multiple">
                                Allow multiple selections
                              </option>
                              <option value="single">Only one selection</option>
                            </select>
                          </div>
                          <div className="grid gap-2 sm:grid-cols-2">
                            {(field.choices ?? []).map(
                              (choice, choiceIndex) => (
                                <div key={choiceIndex} className="flex gap-2">
                                  <InputField
                                    aria-label={`Choice ${choiceIndex + 1}`}
                                    value={choice}
                                    onChange={(event) =>
                                      setDraft((current) =>
                                        current
                                          ? {
                                              ...current,
                                              registrationFields:
                                                current.registrationFields.map(
                                                  (item, i) =>
                                                    i === index
                                                      ? {
                                                          ...item,
                                                          choices: (
                                                            item.choices ?? []
                                                          ).map((value, j) =>
                                                            j === choiceIndex
                                                              ? event.target
                                                                  .value
                                                              : value,
                                                          ),
                                                        }
                                                      : item,
                                                ),
                                            }
                                          : current,
                                      )
                                    }
                                    placeholder={`Choice ${choiceIndex + 1}`}
                                    className="h-9 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 text-sm text-white"
                                  />
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setDraft((current) =>
                                        current
                                          ? {
                                              ...current,
                                              registrationFields:
                                                current.registrationFields.map(
                                                  (item, i) =>
                                                    i === index
                                                      ? {
                                                          ...item,
                                                          choices: (
                                                            item.choices ?? []
                                                          ).filter(
                                                            (_, j) =>
                                                              j !== choiceIndex,
                                                          ),
                                                        }
                                                      : item,
                                                ),
                                            }
                                          : current,
                                      )
                                    }
                                    className="px-2 text-xs text-rose-300"
                                  >
                                    Remove
                                  </button>
                                </div>
                              ),
                            )}
                          </div>
                          <button
                            type="button"
                            disabled={(field.choices?.length ?? 0) >= 30}
                            onClick={() =>
                              setDraft((current) =>
                                current
                                  ? {
                                      ...current,
                                      registrationFields:
                                        current.registrationFields.map(
                                          (item, i) =>
                                            i === index
                                              ? {
                                                  ...item,
                                                  choices: [
                                                    ...(item.choices ?? []),
                                                    "",
                                                  ],
                                                }
                                              : item,
                                        ),
                                    }
                                  : current,
                              )
                            }
                            className="text-xs font-semibold text-indigo-300 disabled:opacity-50"
                          >
                            Add choice
                          </button>
                        </div>
                      )}
                      <label className="flex items-center gap-2 text-xs text-slate-300">
                        <input
                          type="checkbox"
                          checked={field.required}
                          onChange={(event) =>
                            setDraft((current) =>
                              current
                                ? {
                                    ...current,
                                    registrationFields:
                                      current.registrationFields.map(
                                        (item, i) =>
                                          i === index
                                            ? {
                                                ...item,
                                                required: event.target.checked,
                                              }
                                            : item,
                                      ),
                                  }
                                : current,
                            )
                          }
                          className="accent-indigo-500"
                        />
                        Required
                      </label>
                      <button
                        type="button"
                        onClick={() =>
                          setDraft((current) =>
                            current
                              ? {
                                  ...current,
                                  registrationFields:
                                    current.registrationFields.filter(
                                      (_, i) => i !== index,
                                    ),
                                }
                              : current,
                          )
                        }
                        className="justify-self-start text-xs text-rose-300"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </section>
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
                    {updateMutation.isPending ? "Saving…" : "Save event fields"}
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
                <Info label="Event ID" value={workshop.key} />
                <Info label="Event Name" value={workshop.workshopName} />
                <Info label="Full Title" value={workshop.workshopFullTitle} />
                <Info label="Event Code" value={workshop.workshopCode} />
                <Info label="Event Year" value={workshop.eventYear} />
                <Info label="Event Date" value={workshop.eventDate} />
                <Info
                  label="Event Status"
                  value={workshop.isActive !== false ? "Active" : "Inactive"}
                />
                <Info
                  label="Completion Status"
                  value={workshop.isCompleted ? "Completed" : "Not completed"}
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
            <div className="mt-4 rounded-xl border border-slate-800 bg-slate-900/50 p-4">
              <div className="flex items-center justify-between gap-3">
                <h4 className="text-sm font-semibold text-slate-200">
                  Organizers assigned to this event
                </h4>
                <span className="rounded-full bg-indigo-500/10 px-2.5 py-1 text-xs font-semibold text-indigo-200">
                  {workshop.organizers.length}
                </span>
              </div>
              {workshop.organizers.length === 0 ? (
                <p className="mt-3 text-sm text-slate-500">
                  No organizers are assigned to this event.
                </p>
              ) : (
                <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                  {workshop.organizers.map((organizer) => (
                    <li
                      key={organizer.organizerId}
                      className="flex min-w-0 items-center justify-between gap-3 rounded-lg border border-slate-800 bg-slate-950/70 p-3"
                    >
                      <div className="min-w-0">
                        <Link
                          href={`/admin/organizers/${encodeURIComponent(organizer.organizerId)}`}
                          className="block truncate text-sm font-semibold text-indigo-200 hover:underline"
                        >
                          {organizer.fullName}
                        </Link>
                        <p className="mt-1 break-all text-xs text-slate-500">
                          {organizer.organizerId} · {organizer.emailAddress}
                        </p>
                      </div>
                      <span
                        className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-semibold ${organizer.isActive ? "bg-emerald-500/10 text-emerald-300" : "bg-slate-800 text-slate-400"}`}
                      >
                        {organizer.isActive ? "Active" : "Inactive"}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            {workshop.participants.length === 0 ? (
              <p className="mt-4 text-sm text-slate-400">
                No users are enrolled in this event.
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
                    {Object.keys(participant.customFields ?? {}).length > 0 && (
                      <dl className="mt-3 space-y-2 border-t border-slate-800 pt-3 text-xs">
                        {Object.entries(participant.customFields ?? {}).map(
                          ([key, value]) => (
                            <div key={key}>
                              <dt className="text-slate-500">
                                {workshop.registrationFields?.find(
                                  (field) => field.key === key,
                                )?.label ?? key}
                              </dt>
                              <dd className="mt-0.5 whitespace-pre-wrap break-words text-slate-300">
                                {formatCustomAnswer(
                                  workshop.registrationFields?.find(
                                    (item) => item.key === key,
                                  ),
                                  value,
                                )}
                              </dd>
                            </div>
                          ),
                        )}
                      </dl>
                    )}
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
                <table className="w-full min-w-[900px] text-left text-sm">
                  <thead className="bg-slate-900 text-xs uppercase text-slate-400">
                    <tr>
                      <th className="px-4 py-3">User ID</th>
                      <th className="px-4 py-3">Certificate ID</th>
                      <th className="px-4 py-3">Full Name</th>
                      <th className="px-4 py-3">Additional Details</th>
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
                        <td className="px-4 py-3 text-xs text-slate-400">
                          {Object.entries(participant.customFields ?? {})
                            .map(([key, value]) => {
                              const field = workshop.registrationFields?.find(
                                (item) => item.key === key,
                              );
                              const answer = formatCustomAnswer(field, value);
                              return `${field?.label ?? key}: ${answer}`;
                            })
                            .join(" · ") || "—"}
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
              <h3 className="font-semibold text-red-200">Delete Event</h3>
              <p className="mt-1 text-sm text-slate-400">
                Deletes this event and all its participant enrollments.
                Registered users remain.
              </p>
            </div>
            <button
              type="button"
              disabled={removeWorkshopMutation.isPending}
              onClick={onDeleteWorkshop}
              className="rounded-lg border border-red-500/40 px-4 py-2 text-sm font-semibold text-red-200 hover:bg-red-500/10 disabled:opacity-50"
            >
              {removeWorkshopMutation.isPending ? "Deleting…" : "Delete Event"}
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
