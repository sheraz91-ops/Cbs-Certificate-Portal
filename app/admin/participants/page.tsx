"use client";

import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAdminSession, useAdminToast } from "../AdminShell";
import { AddParticipantsForm } from "@/components/AdminForms";
import { getAdminWorkshops } from "@/features/workshops/api";

export default function ParticipantsPage() {
  const authenticated = useAdminSession();
  const toast = useAdminToast();
  const workshopsQuery = useQuery({
    queryKey: ["admin", "workshops"],
    queryFn: () => getAdminWorkshops(),
    enabled: authenticated,
  });
  const workshops = workshopsQuery.data ?? [];
  const error = workshopsQuery.error instanceof Error ? workshopsQuery.error.message : "";

  useEffect(() => {
    if (workshopsQuery.isError) toast({ title: "Could not load events", description: error, tone: "error" });
  }, [error, toast, workshopsQuery.isError]);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-300">
          Admin
        </p>
        <h1 className="mt-2 text-3xl font-bold">Add Users to Event</h1>
        <p className="mt-2 text-sm text-slate-400">
          Choose an event and enter one or more assigned user IDs. User details are registered on the Users page.
        </p>
      </header>
      {error && (
        <p
          role="alert"
          className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300"
        >
          {error}
        </p>
      )}
      <AddParticipantsForm
        workshops={workshops}
        onDone={() => undefined}
      />
    </div>
  );
}
