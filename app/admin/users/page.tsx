"use client";

import { useState, type FormEvent } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createUser } from "@/features/users/api";
import type { UserProfileInput } from "@/types/user";
import { useAdminPassword, useAdminToast } from "../AdminShell";

const fields = [
  ["emailAddress", "Email Address", "email"],
  ["fullName", "Full Name", "text"],
  ["registrationNumber", "Registration Number", "text"],
  ["department", "Department", "text"],
  ["semester", "Semester", "text"],
  ["section", "Section", "text"],
  ["institute", "Institute", "text"],
  ["whatsappNumber", "WhatsApp Number", "tel"],
  ["cnic", "CNIC", "text"],
] as const;

function emptyUser(): UserProfileInput {
  return {
    emailAddress: "", fullName: "", registrationNumber: "", department: "",
    semester: "", section: "", institute: "", whatsappNumber: "", cnic: "",
  };
}

export default function AddUserPage() {
  const password = useAdminPassword();
  const toast = useAdminToast();
  const queryClient = useQueryClient();
  const [form, setForm] = useState<UserProfileInput>(emptyUser());
  const createMutation = useMutation({
    mutationFn: (input: UserProfileInput) => createUser(password, input),
    onSuccess: async (user) => {
      await queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
      toast({ title: "User created", description: `Assigned ID: ${user.userId}`, tone: "success" });
      setForm(emptyUser());
    },
    onError: (error) => toast({ title: "Could not create user", description: error.message, tone: "error" }),
  });

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const cleaned = Object.fromEntries(Object.entries(form).map(([key, value]) => [key, value.trim()])) as UserProfileInput;
    await createMutation.mutateAsync(cleaned);
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-300">Admin · Users</p>
        <h2 className="mt-2 text-3xl font-bold">Add User</h2>
        <p className="mt-2 text-sm text-slate-400">Register a user once. The portal assigns their ID for workshop enrollment.</p>
      </header>

      <section className="rounded-2xl border border-slate-800 bg-slate-950 p-6 shadow-xl shadow-slate-950/10">
        <div className="mb-5">
          <h3 className="text-lg font-semibold text-white">User Details</h3>
          <p className="mt-1 text-sm text-slate-400">A unique assigned ID is generated when this form is saved.</p>
        </div>
        <form onSubmit={submit} className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {fields.map(([key, label, type]) => (
              <label key={key} className="block text-xs font-medium text-slate-300">
                {label} <span className="text-red-300">*</span>
                <input
                  required
                  type={type}
                  autoComplete={key === "emailAddress" ? "email" : key === "whatsappNumber" ? "tel" : "off"}
                  value={form[key]}
                  onChange={(event) => setForm((current) => ({ ...current, [key]: event.target.value }))}
                  className="mt-1.5 h-11 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 text-sm text-slate-100 outline-none focus:border-indigo-500"
                />
              </label>
            ))}
          </div>
          <button disabled={createMutation.isPending} className="h-11 rounded-xl bg-indigo-600 px-5 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50">
            {createMutation.isPending ? "Creating user…" : "Create User"}
          </button>
        </form>
      </section>
    </div>
  );
}
