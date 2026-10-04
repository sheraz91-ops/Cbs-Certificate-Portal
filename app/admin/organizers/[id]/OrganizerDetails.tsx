"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import InputField from "@/components/InputField";
import PasswordField from "@/components/PasswordField";
import UserProfileField from "@/components/UserProfileField";
import { getEvents } from "@/features/events/api";
import { assignOrganizerEvents, deleteOrganizer, getOrganizerById, setOrganizerActive, updateOrganizer, type OrganizerDetails as OrganizerRecord } from "@/features/organizers/api";
import { useAdminSession, useAdminToast } from "../../AdminShell";
import { updateOrganizerSchema, validationMessage } from "@/lib/validation/schemas";
import type { UserProfileInput } from "@/types/user";

const fields = [
  ["emailAddress", "Email Address"],
  ["fullName", "Full Name"],
  ["registrationNumber", "Registration Number"],
  ["department", "Department"],
  ["semester", "Semester"],
  ["section", "Section"],
  ["institute", "Institute"],
  ["whatsappNumber", "WhatsApp Number"],
  ["cnic", "CNIC"],
] as const;

type OrganizerProfile = UserProfileInput & { workshops: string[]; password: string };

function toProfile(organizer: OrganizerRecord): OrganizerProfile {
  return {
    emailAddress: organizer.emailAddress,
    fullName: organizer.fullName,
    registrationNumber: organizer.registrationNumber,
    department: organizer.department,
    semester: organizer.semester,
    section: organizer.section,
    institute: organizer.institute,
    whatsappNumber: organizer.whatsappNumber,
    cnic: organizer.cnic,
    workshops: organizer.workshops,
    password: "",
  };
}

export default function OrganizerDetails({ organizerId }: { organizerId: string }) {
  const authenticated = useAdminSession();
  const toast = useAdminToast();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [profile, setProfile] = useState<OrganizerProfile | null>(null);
  const [formError, setFormError] = useState("");
  const [deletePassword, setDeletePassword] = useState("");
  const organizerQuery = useQuery({ queryKey: ["admin", "organizers", organizerId], queryFn: () => getOrganizerById(organizerId), enabled: Boolean(authenticated && organizerId) });
  const eventsQuery = useQuery({ queryKey: ["events"], queryFn: getEvents, enabled: authenticated });
  const organizer = organizerQuery.data;

  useEffect(() => {
    if (organizer) setProfile(toProfile(organizer));
  }, [organizer]);

  const mutation = useMutation({
    mutationFn: updateOrganizer,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["admin", "organizers", organizerId] }),
        queryClient.invalidateQueries({ queryKey: ["admin", "organizers"] }),
      ]);
      setEditing(false);
      toast({ title: "Organizer details saved", description: "The assigned Organizer ID was left unchanged.", tone: "success" });
    },
  });
  const statusMutation = useMutation({
    mutationFn: (isActive: boolean) => setOrganizerActive(organizerId, isActive),
    onSuccess: async (result) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["admin", "organizers", organizerId] }),
        queryClient.invalidateQueries({ queryKey: ["admin", "organizers"] }),
        queryClient.invalidateQueries({ queryKey: ["admin", "organizer-sessions"] }),
        queryClient.invalidateQueries({ queryKey: ["admin", "overview"] }),
        queryClient.invalidateQueries({ queryKey: ["admin", "workshop-details"] }),
      ]);
      toast({ title: result.isActive ? "Organizer activated" : "Organizer deactivated", description: result.isActive ? "The organizer can sign in again." : "The organizer has been signed out and can no longer sign in.", tone: "success" });
    },
    onError: (error) => toast({ title: "Could not update organizer status", description: error.message, tone: "error" }),
  });
  const deleteMutation = useMutation({
    mutationFn: (password: string) => deleteOrganizer(organizerId, password),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["admin", "organizers"] }),
        queryClient.invalidateQueries({ queryKey: ["admin", "organizer-sessions"] }),
        queryClient.invalidateQueries({ queryKey: ["admin", "overview"] }),
        queryClient.invalidateQueries({ queryKey: ["admin", "workshop-details"] }),
      ]);
      toast({ title: "Organizer deleted", description: "The organizer account and active sessions were removed.", tone: "success" });
      router.replace("/admin/organizers");
    },
  });
  const assignmentMutation = useMutation({
    mutationFn: (nextEvents: string[]) => assignOrganizerEvents(organizerId, nextEvents),
    onSuccess: async (_result, nextEvents) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["admin", "organizers", organizerId] }),
        queryClient.invalidateQueries({ queryKey: ["admin", "organizers"] }),
        queryClient.invalidateQueries({ queryKey: ["admin", "workshop-details"] }),
      ]);
      toast({ title: "Event access removed", description: `This organizer is now assigned to ${nextEvents.length} event${nextEvents.length === 1 ? "" : "s"}.`, tone: "success" });
    },
    onError: (error) => toast({ title: "Could not update event access", description: error.message, tone: "error" }),
  });

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!profile) return;
    const parsed = updateOrganizerSchema.safeParse({ organizerId, ...profile });
    if (!parsed.success) {
      setFormError(validationMessage(parsed.error));
      return;
    }
    setFormError("");
    mutation.mutate(parsed.data);
  }

  function toggleWorkshop(key: string) {
    setProfile((current) => current ? { ...current, workshops: current.workshops.includes(key) ? current.workshops.filter((item) => item !== key) : [...current.workshops, key] } : current);
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <Link href="/admin/organizers" className="inline-flex items-center gap-2 text-sm font-medium text-indigo-300 hover:text-indigo-200">← All Organizers</Link>
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-300">Admin · Organizers</p>
        <h2 className="mt-2 text-3xl font-bold">Organizer Details</h2>
        <p className="mt-2 font-mono text-sm text-slate-400">{organizerId}</p>
      </header>

      {organizerQuery.isPending ? (
        <p className="rounded-2xl border border-slate-800 bg-slate-950 px-6 py-10 text-center text-sm text-slate-400">Loading organizer details…</p>
      ) : organizerQuery.isError ? (
        <p role="alert" className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">{organizerQuery.error.message}</p>
      ) : organizer && profile ? (
        <section className="rounded-2xl border border-slate-800 bg-slate-950 p-4 shadow-xl shadow-slate-950/10 sm:p-6">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-5">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-slate-500">Assigned Organizer ID</p>
              <p className="mt-2 font-mono text-xl font-semibold text-indigo-200">{organizer.organizerId}</p>
              <p className="mt-2 text-sm text-slate-400">Created {new Date(organizer.createdAt).toLocaleString()} · {organizer.isActive ? "Active" : "Inactive"}</p>
            </div>
            {!editing && <div className="flex flex-wrap items-center gap-2">
              <span className={`rounded-full px-3 py-1.5 text-xs font-semibold ${organizer.isActive ? "bg-emerald-500/10 text-emerald-300" : "bg-slate-800 text-slate-400"}`}>{organizer.isActive ? "Active" : "Inactive"}</span>
              <button type="button" disabled={statusMutation.isPending} onClick={() => statusMutation.mutate(!organizer.isActive)} className="rounded-xl border border-amber-400/30 px-4 py-2 text-sm font-semibold text-amber-200 hover:bg-amber-500/10 disabled:opacity-50">{organizer.isActive ? "Deactivate" : "Activate"}</button>
              <button type="button" onClick={() => setEditing(true)} className="rounded-xl border border-indigo-400/30 px-4 py-2 text-sm font-semibold text-indigo-200 hover:bg-indigo-500/10">Edit details</button>
            </div>}
          </div>

          {editing ? (
            <form onSubmit={submit}>
              <div className="grid gap-4 sm:grid-cols-2">
                {fields.map(([key, label]) => (
                  <label key={key} className="block text-xs font-medium text-slate-300">{label}
                    <UserProfileField name={key} registrationMode="campus" value={profile[key]} onValueChange={(value) => setProfile((current) => current ? { ...current, [key]: value } : current)} className="mt-1.5 h-11 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 text-sm text-slate-100 outline-none focus:border-indigo-500" />
                  </label>
                ))}
                <label className="block text-xs font-medium text-slate-300 sm:col-span-2">Set a new password (optional)
                  <PasswordField autoComplete="new-password" value={profile.password} onChange={(event) => setProfile((current) => current ? { ...current, password: event.target.value } : current)} className="mt-1.5 h-11 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 text-sm text-slate-100 outline-none focus:border-indigo-500" />
                  <span className="mt-1 block text-xs text-slate-500">Leave blank to keep the current password. New passwords must contain at least 16 characters.</span>
                </label>
              </div>
              <fieldset className="mt-6">
                <legend className="text-sm font-semibold text-white">Assigned Events</legend>
                <p className="mt-1 text-xs text-slate-500">The organizer can manage participants and attendance for these events.</p>
                {eventsQuery.isPending ? <p className="mt-4 text-sm text-slate-400">Loading events…</p> : eventsQuery.isError ? <p role="alert" className="mt-4 text-sm text-red-300">{eventsQuery.error.message}</p> : (
                  <div className="mt-4 grid gap-2 sm:grid-cols-2">{eventsQuery.data?.map((item) => <label key={item.key} className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-800 bg-slate-900/60 p-3 text-sm text-slate-200"><InputField type="checkbox" checked={profile.workshops.includes(item.key)} onChange={() => toggleWorkshop(item.key)} className="mt-0.5 accent-indigo-500" /><span><span className="block font-medium">{item.workshopName}</span><span className="mt-0.5 block text-xs text-slate-500">{item.eventDate} · {item.eventYear}</span></span></label>)}</div>
                )}
              </fieldset>
              {(formError || mutation.isError) && <p role="alert" className="mt-4 text-sm text-red-300">{formError || (mutation.isError ? mutation.error.message : "")}</p>}
              <div className="mt-5 flex gap-3">
                <button type="submit" disabled={mutation.isPending || eventsQuery.isPending} className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50">{mutation.isPending ? "Saving…" : "Save details"}</button>
                <button type="button" onClick={() => { setProfile(toProfile(organizer)); setFormError(""); setEditing(false); }} className="rounded-xl border border-slate-700 px-4 py-2.5 text-sm font-semibold text-slate-300 hover:bg-slate-900">Cancel</button>
              </div>
            </form>
          ) : (
            <>
              <dl className="grid gap-x-8 gap-y-5 sm:grid-cols-2">
                {fields.map(([key, label]) => <div key={key}><dt className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</dt><dd className="mt-1 break-words text-sm font-medium text-slate-100">{organizer[key]}</dd></div>)}
              </dl>
              <div className="mt-8"><h3 className="text-lg font-semibold text-white">Assigned Events</h3>{organizer.workshops.length === 0 ? <p className="mt-3 text-sm text-slate-400">No events are assigned.</p> : <ul className="mt-3 grid gap-2 sm:grid-cols-2">{organizer.workshops.map((key) => { const item = eventsQuery.data?.find((event) => event.key === key); return <li key={key} className="rounded-xl border border-slate-800 bg-slate-900/60 p-3"><span className="block text-sm font-medium text-slate-100">{item?.workshopName ?? key}</span>{item && <span className="mt-1 block text-xs text-slate-500">{item.eventDate} · {item.eventYear}</span>}</li>; })}</ul>}</div>
            </>
          )}
          {!editing && organizer.workshops.length > 0 && <section className="mt-8 rounded-xl border border-slate-800 bg-slate-900/40 p-4">
            <h3 className="text-sm font-semibold text-slate-200">Manage event access</h3>
            <p className="mt-1 text-xs text-slate-500">Remove this organizer from an event without editing the rest of their profile.</p>
            <ul className="mt-3 grid gap-2 sm:grid-cols-2">{organizer.workshops.map((key) => { const item = eventsQuery.data?.find((event) => event.key === key); return <li key={key} className="flex min-w-0 items-center justify-between gap-3 rounded-lg border border-slate-800 bg-slate-950/70 p-3"><span className="min-w-0 truncate text-sm text-slate-200">{item?.workshopName ?? key}</span><button type="button" disabled={assignmentMutation.isPending} onClick={() => assignmentMutation.mutate(organizer.workshops.filter((assigned) => assigned !== key))} className="shrink-0 rounded-lg border border-rose-500/30 px-3 py-2 text-xs font-semibold text-rose-200 hover:bg-rose-500/10 disabled:opacity-50">Remove event</button></li>; })}</ul>
            {assignmentMutation.isError && <p role="alert" className="mt-3 text-sm text-red-300">{assignmentMutation.error.message}</p>}
          </section>}
          <div className="mt-8 border-t border-red-500/20 pt-6">
            <h3 className="font-semibold text-red-200">Delete organizer</h3>
            <p className="mt-1 text-sm text-slate-400">This permanently removes the organizer and revokes their active sessions. Enter the admin password to confirm.</p>
            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
              <label className="block min-w-0 flex-1 text-xs font-medium text-slate-300">Admin password
                <PasswordField autoComplete="current-password" value={deletePassword} onChange={(event) => setDeletePassword(event.target.value)} className="mt-1.5 h-11 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 text-sm text-slate-100 outline-none focus:border-red-400" />
              </label>
              <button type="button" disabled={!deletePassword || deleteMutation.isPending} onClick={() => deleteMutation.mutate(deletePassword)} className="min-h-11 rounded-xl bg-red-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-600 disabled:opacity-50">{deleteMutation.isPending ? "Deleting…" : "Delete organizer"}</button>
            </div>
            {deleteMutation.isError && <p role="alert" className="mt-3 text-sm text-red-300">{deleteMutation.error.message}</p>}
          </div>
        </section>
      ) : null}
    </div>
  );
}
