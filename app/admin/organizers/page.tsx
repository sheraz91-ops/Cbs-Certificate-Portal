"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import InputField from "@/components/InputField";
import { getOrganizers } from "@/features/organizers/api";
import { useAdminSession } from "../AdminShell";
import { searchTextSchema } from "@/lib/validation/schemas";

export default function OrganizersPage() {
  const authenticated = useAdminSession();
  const [search, setSearch] = useState("");
  const organizersQuery = useQuery({ queryKey: ["admin", "organizers"], queryFn: getOrganizers, enabled: authenticated });
  const organizers = organizersQuery.data ?? [];
  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return organizers;
    return organizers.filter((organizer) => [organizer.organizerId, organizer.fullName, organizer.emailAddress, organizer.registrationNumber, organizer.department].some((value) => value.toLowerCase().includes(query)));
  }, [organizers, search]);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <header><p className="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-300">Admin · Organizer</p><h2 className="mt-2 text-3xl font-bold">All Organizers</h2><p className="mt-2 text-sm text-slate-400">Select an assigned Organizer ID to view and manage the organizer profile and event access.</p></header>
      <section className="rounded-2xl border border-slate-800 bg-slate-950 p-6 shadow-xl shadow-slate-950/10">
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><p className="text-sm text-slate-400">{organizers.length} organizer{organizers.length === 1 ? "" : "s"}</p><label className="text-xs font-medium text-slate-300">Search organizers<InputField value={search} onChange={(event) => setSearch(event.target.value)} validationSchema={searchTextSchema} placeholder="ID, name, email, registration, department" className="mt-1.5 h-10 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 text-sm text-slate-100 outline-none focus:border-indigo-500 sm:w-80" /></label></div>
        {organizersQuery.isError ? <p role="alert" className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">{organizersQuery.error.message}</p> : organizersQuery.isPending ? <p className="py-8 text-center text-sm text-slate-400">Loading organizers…</p> : filtered.length === 0 ? <p className="py-8 text-center text-sm text-slate-400">{organizers.length ? "No organizers match that search." : "No organizer accounts have been created yet."}</p> : (
          <div className="overflow-x-auto rounded-xl border border-slate-800"><table className="w-full min-w-[850px] text-left text-sm">
            <thead className="bg-slate-900 text-xs uppercase text-slate-400"><tr><th className="px-4 py-3">Organizer ID</th><th className="px-4 py-3">Full Name</th><th className="px-4 py-3">Email Address</th><th className="px-4 py-3">Registration Number</th><th className="px-4 py-3">Department</th><th className="px-4 py-3">Events</th></tr></thead>
            <tbody className="divide-y divide-slate-800">{filtered.map((organizer) => <tr key={organizer.organizerId} className="text-slate-200"><td className="px-4 py-3"><Link href={`/admin/organizers/${encodeURIComponent(organizer.organizerId)}`} className="font-mono font-semibold text-indigo-300 underline-offset-4 hover:text-indigo-200 hover:underline">{organizer.organizerId}</Link></td><td className="px-4 py-3 font-medium">{organizer.fullName}</td><td className="px-4 py-3 text-slate-400">{organizer.emailAddress}</td><td className="px-4 py-3 text-slate-400">{organizer.registrationNumber}</td><td className="px-4 py-3 text-slate-400">{organizer.department}</td><td className="px-4 py-3">{organizer.workshops.length}</td></tr>)}</tbody>
          </table></div>
        )}
      </section>
    </div>
  );
}
