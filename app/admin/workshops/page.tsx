"use client";

import { useCallback, useEffect, useState } from "react";
import { useAdminPassword } from "../AdminShell";
import { AddWorkshopForm, ManageWorkshops } from "@/components/AdminForms";

type WorkshopSummary = { key: string; workshopName: string };

export default function WorkshopsPage() {
  const password = useAdminPassword();
  const [workshops, setWorkshops] = useState<WorkshopSummary[]>([]);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");

  const load = useCallback(async () => {
    try {
      const response = await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password, action: "list" }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to load workshops");
      setWorkshops(data.workshops);
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load workshops");
    }
  }, [password]);

  useEffect(() => { void load(); }, [load]);

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-300">Admin</p>
        <h1 className="mt-2 text-3xl font-bold">Workshops</h1>
        <p className="mt-2 text-sm text-slate-400">Add workshops, manage existing entries, and review participant registrations.</p>
      </header>
      {status && <p role="status" className="whitespace-pre-line rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">{status}</p>}
      {error && <p role="alert" className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</p>}
      <AddWorkshopForm password={password} onDone={(workshop) => {
        setWorkshops((current) => [...current, workshop]);
        setStatus(`Workshop "${workshop.workshopName}" (${workshop.key}) added and pushed to GitHub.`);
      }} />
      <ManageWorkshops password={password} workshops={workshops} onDeleted={(deleted, count) => {
        setWorkshops((current) => current.filter((workshop) => workshop.key !== deleted.key));
        setStatus(`Workshop "${deleted.workshopName}" deleted. ${count} participant record(s) were removed.`);
      }} />
    </div>
  );
}
