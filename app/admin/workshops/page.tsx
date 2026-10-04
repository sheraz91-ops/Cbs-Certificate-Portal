"use client";

import { useQueryClient } from "@tanstack/react-query";
import { AddWorkshopForm } from "@/components/AdminForms";
import type { WorkshopSummary } from "@/features/workshops/api";

export default function CreateWorkshopPage() {
  const queryClient = useQueryClient();

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-300">Admin · Event</p>
        <h1 className="mt-2 text-3xl font-bold">Create Event</h1>
        <p className="mt-2 text-sm text-slate-400">Set up an event and its certificate template.</p>
      </header>
      <AddWorkshopForm onDone={(workshop) => {
        queryClient.setQueryData<WorkshopSummary[]>(["admin", "workshops"], (current = []) => [...current, workshop]);
      }} />
    </div>
  );
}
