"use client";

import { useCallback, useEffect, useState } from "react";
import { useAdminPassword, useAdminToast } from "../AdminShell";
import { AddWorkshopForm, ManageWorkshops } from "@/components/AdminForms";

type WorkshopSummary = { key: string; workshopName: string };

export default function WorkshopsPage() {
  const password = useAdminPassword();
  const toast = useAdminToast();
  const [workshops, setWorkshops] = useState<WorkshopSummary[]>([]);
  const [error, setError] = useState("");

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
      const message = err instanceof Error ? err.message : "Unable to load workshops";
      setError(message);
      toast({ title: "Could not load workshops", description: message, tone: "error" });
    }
  }, [password, toast]);

  useEffect(() => { void load(); }, [load]);

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-300">Admin</p>
        <h1 className="mt-2 text-3xl font-bold">Workshops</h1>
        <p className="mt-2 text-sm text-slate-400">Add workshops, manage existing entries, and review participant registrations.</p>
      </header>
      {error && <p role="alert" className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</p>}
      <AddWorkshopForm password={password} onDone={(workshop) => {
        setWorkshops((current) => [...current, workshop]);
      }} />
      <ManageWorkshops password={password} workshops={workshops} onDeleted={(deleted) => {
        setWorkshops((current) => current.filter((workshop) => workshop.key !== deleted.key));
      }} />
    </div>
  );
}
