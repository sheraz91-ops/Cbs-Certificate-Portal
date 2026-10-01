"use client";

import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAdminPassword, useAdminToast } from "../AdminShell";
import { AddParticipantsForm } from "@/components/AdminForms";
import { getAdminWorkshops } from "@/features/workshops/api";

export default function ParticipantsPage() {
  const password = useAdminPassword();
  const toast = useAdminToast();
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
    <div className="mx-auto max-w-4xl space-y-6">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-300">
          Admin
        </p>
        <h1 className="mt-2 text-3xl font-bold">Add Participants</h1>
        <p className="mt-2 text-sm text-slate-400">
          Choose a workshop, then enter each participant with an optional
          certificate ID.
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
        password={password}
        workshops={workshops}
        onDone={() => undefined}
      />
    </div>
  );
}
