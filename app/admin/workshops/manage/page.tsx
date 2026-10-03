"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { getWorkshopDetails } from "@/features/workshops/api";
import { useAdminSession } from "../../AdminShell";
import InputField from "@/components/InputField";
import { searchTextSchema } from "@/lib/validation/schemas";

export default function ManageWorkshopsPage() {
  const authenticated = useAdminSession();
  const [search, setSearch] = useState("");
  const workshopsQuery = useQuery({
    queryKey: ["admin", "workshop-details"],
    queryFn: () => getWorkshopDetails(),
    enabled: authenticated,
  });
  const workshops = workshopsQuery.data ?? [];
  const filteredWorkshops = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return workshops;
    return workshops.filter((workshop) => [workshop.key, workshop.workshopName, workshop.workshopCode, workshop.eventYear].some((value) => value.toLowerCase().includes(query)));
  }, [search, workshops]);

  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-300">Admin · Workshop</p>
        <h2 className="mt-2 text-3xl font-bold">Manage Workshops</h2>
        <p className="mt-2 text-sm text-slate-400">Select a workshop ID to manage its details and participants.</p>
      </header>

      <section className="rounded-2xl border border-slate-800 bg-slate-950 p-6 shadow-xl shadow-slate-950/10">
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <p className="text-sm text-slate-400">{workshops.length} workshop{workshops.length === 1 ? "" : "s"}</p>
          <label className="text-xs font-medium text-slate-300">
            Search workshops
            <InputField value={search} onChange={(event) => setSearch(event.target.value)} validationSchema={searchTextSchema} placeholder="ID, name, code, or year" className="mt-1.5 h-10 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 text-sm text-slate-100 outline-none focus:border-indigo-500 sm:w-72" />
          </label>
        </div>
        {workshopsQuery.isError ? (
          <p role="alert" className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">{workshopsQuery.error.message}</p>
        ) : workshopsQuery.isPending ? (
          <p className="py-8 text-center text-sm text-slate-400">Loading workshops…</p>
        ) : filteredWorkshops.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-400">{workshops.length ? "No workshops match that search." : "No workshops have been created yet."}</p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-800">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="bg-slate-900 text-xs uppercase text-slate-400">
                <tr>
                  {["Workshop ID", "Workshop Name", "Code", "Event Date", "Status", "Outside Participants", "Participants"].map((label) => <th key={label} scope="col" className="px-4 py-3">{label}</th>)}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {filteredWorkshops.map((workshop) => (
                  <tr key={workshop.key}>
                    <td className="whitespace-nowrap px-4 py-3 font-mono font-semibold">
                      <Link href={`/admin/workshops/manage/${encodeURIComponent(workshop.key)}`} className="text-indigo-300 underline decoration-indigo-500/40 underline-offset-4 hover:text-indigo-200">{workshop.key}</Link>
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-200">{workshop.workshopName}</td>
                    <td className="px-4 py-3 font-mono text-slate-300">{workshop.workshopCode}</td>
                    <td className="px-4 py-3 text-slate-300">{workshop.eventDate} ({workshop.eventYear})</td>
                    <td className="px-4 py-3"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${workshop.isActive !== false ? "bg-emerald-500/10 text-emerald-300" : "bg-slate-800 text-slate-400"}`}>{workshop.isActive !== false ? "Active" : "Inactive"}</span></td>
                    <td className="px-4 py-3"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${workshop.allowOutsiders ? "bg-emerald-500/10 text-emerald-300" : "bg-slate-800 text-slate-400"}`}>{workshop.allowOutsiders ? "Allowed" : "Not allowed"}</span></td>
                    <td className="px-4 py-3 tabular-nums text-slate-300">{workshop.participants.length}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
