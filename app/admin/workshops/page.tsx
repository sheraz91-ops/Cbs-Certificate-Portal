"use client";

import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAdminPassword, useAdminToast } from "../AdminShell";
import { AddWorkshopForm, ManageWorkshops } from "@/components/AdminForms";
import { getAdminWorkshops, type WorkshopSummary } from "@/features/workshops/api";

export default function WorkshopsPage() {
  const password = useAdminPassword();
  const toast = useAdminToast();
  const queryClient = useQueryClient();
  const workshopsQuery = useQuery({
    queryKey: ["admin", "workshops"],
    queryFn: () => getAdminWorkshops(password),
    enabled: Boolean(password),
  });
  const workshops = workshopsQuery.data ?? [];
  const error = workshopsQuery.error instanceof Error ? workshopsQuery.error.message : "";

  useEffect(() => {
    if (workshopsQuery.isError) toast({ title: "Could not load workshops", description: error, tone: "error" });
  }, [error, toast, workshopsQuery.isError]);

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-300">Admin</p>
        <h1 className="mt-2 text-3xl font-bold">Workshops</h1>
        <p className="mt-2 text-sm text-slate-400">Add workshops, manage existing entries, and review participant registrations.</p>
      </header>
      {error && <p role="alert" className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</p>}
      <AddWorkshopForm password={password} onDone={(workshop) => {
        queryClient.setQueryData<WorkshopSummary[]>(["admin", "workshops"], (current = []) => [...current, workshop]);
      }} />
      <ManageWorkshops password={password} workshops={workshops} onDeleted={(deleted) => {
        queryClient.setQueryData<WorkshopSummary[]>(["admin", "workshops"], (current = []) => current.filter((workshop) => workshop.key !== deleted.key));
      }} />
    </div>
  );
}
