"use client";

import { useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import InputField from "@/components/InputField";
import UserProfileField from "@/components/UserProfileField";
import PasswordField from "@/components/PasswordField";
import { useAdminSession, useAdminToast } from "../../AdminShell";
import { createOrganizer, type CreateOrganizerInput } from "@/features/organizers/api";
import { getEvents } from "@/features/events/api";
import { createOrganizerBaseSchema, createOrganizerSchema, validationMessage } from "@/lib/validation/schemas";

const profileFields = [
  ["emailAddress", "Email Address"],
  ["fullName", "Full Name"],
  ["registrationNumber", "Registration Number"],
  ["department", "Department"],
  ["semester", "Semester"],
  ["section", "Section"],
  ["institute", "Institute"],
  ["whatsappNumber", "WhatsApp Number"],
] as const;

const requiredFields = new Set(["fullName", "registrationNumber", "semester", "whatsappNumber"]);
const empty: CreateOrganizerInput = {
  emailAddress: "", fullName: "", registrationNumber: "", department: "",
  semester: "", section: "", institute: "", whatsappNumber: "",
  password: "", workshops: [],
};

export default function CreateOrganizerPage() {
  const authenticated = useAdminSession();
  const toast = useAdminToast();
  const queryClient = useQueryClient();
  const [form, setForm] = useState<CreateOrganizerInput>(empty);
  const [formError, setFormError] = useState("");
  const eventsQuery = useQuery({ queryKey: ["events"], queryFn: getEvents, enabled: authenticated });
  const mutation = useMutation({
    mutationFn: createOrganizer,
    onSuccess: async (organizer) => {
      await queryClient.invalidateQueries({ queryKey: ["admin", "organizers"] });
      toast({ title: "Organizer created", description: `Assigned ID: ${organizer.organizerId}`, tone: "success" });
      setForm(empty);
    },
  });

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsed = createOrganizerSchema.safeParse(form);
    if (!parsed.success) {
      setFormError(validationMessage(parsed.error));
      return;
    }
    setFormError("");
    mutation.mutate(parsed.data);
  }

  function toggleWorkshop(key: string) {
    setForm((current) => ({ ...current, workshops: current.workshops.includes(key) ? current.workshops.filter((entry) => entry !== key) : [...current.workshops, key] }));
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <header><p className="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-300">Admin · Organizer</p><h2 className="mt-2 text-3xl font-bold">Add Organizer</h2><p className="mt-2 text-sm text-slate-400">Enter organizer details, set a password, and choose which events they can manage.</p></header>
      <form onSubmit={submit} className="space-y-5 rounded-2xl border border-slate-800 bg-slate-950 p-4 shadow-xl sm:space-y-6 sm:p-6">
        <div><h3 className="text-lg font-semibold text-white">Organizer Details</h3><p className="mt-1 text-sm text-slate-400">CBS assigns the Organizer ID after this form is saved.</p></div>
        <div className="grid min-w-0 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {profileFields.map(([key, label]) => <label key={key} className="text-xs font-medium text-slate-300">{label} {requiredFields.has(key) ? <span className="text-red-300">*</span> : <span className="text-slate-500">(optional)</span>}
            <UserProfileField name={key} required={requiredFields.has(key)} validationSchema={createOrganizerBaseSchema.shape[key]} registrationMode="campus" autoComplete={key === "emailAddress" ? "email" : key === "whatsappNumber" ? "tel" : "off"} value={form[key] ?? ""} onValueChange={(value) => setForm((current) => ({ ...current, [key]: value }))} className="mt-1.5 h-11 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 text-sm text-white outline-none focus:border-indigo-500" />
          </label>)}
          <label className="text-xs font-medium text-slate-300 sm:col-span-2 lg:col-span-3">Organizer Password <span className="text-red-300">*</span>
            <PasswordField required autoComplete="new-password" value={form.password} validationSchema={createOrganizerBaseSchema.shape.password} onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))} className="mt-1.5 h-11 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 text-sm text-white outline-none focus:border-indigo-500" />
            <span className="mt-1 block text-xs text-slate-500">Use at least 16 characters and share it privately.</span>
          </label>
          <p className="text-xs text-slate-500">Email is optional, but an organizer needs an email address to sign in.</p>
        </div>
        <fieldset>
          <legend className="text-sm font-semibold text-white">Assigned Events <span className="text-red-300">*</span></legend>
          <p className="mt-1 text-xs text-slate-500">The organizer can view participants and update attendance only for selected events.</p>
          {eventsQuery.isPending ? <p className="mt-4 text-sm text-slate-400">Loading events…</p> : eventsQuery.isError ? <p role="alert" className="mt-4 text-sm text-red-300">{eventsQuery.error.message}</p> : (eventsQuery.data ?? []).length === 0 ? <p className="mt-4 text-sm text-slate-400">Create an event before adding an organizer.</p> : (
            <div className="mt-4 grid gap-2 sm:grid-cols-2">{eventsQuery.data?.map((item) => <label key={item.key} className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-800 bg-slate-900/60 p-3 text-sm text-slate-200"><InputField type="checkbox" checked={form.workshops.includes(item.key)} onChange={() => toggleWorkshop(item.key)} className="mt-0.5 accent-indigo-500" /><span><span className="block font-medium">{item.workshopName}</span><span className="mt-0.5 block text-xs text-slate-500">{item.eventDate} · {item.eventYear}</span></span></label>)}</div>
          )}
        </fieldset>
        {(formError || mutation.isError) && <p role="alert" className="text-sm text-red-300">{formError || (mutation.isError ? mutation.error.message : "")}</p>}
        <button type="submit" disabled={mutation.isPending || eventsQuery.isPending || !eventsQuery.data?.length} className="h-11 rounded-xl bg-indigo-600 px-5 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50">{mutation.isPending ? "Creating organizer…" : "Create Organizer"}</button>
      </form>
    </div>
  );
}
