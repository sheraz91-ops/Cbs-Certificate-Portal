"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getOrganizerSessions, revokeOrganizerSession } from "@/features/organizers/api";
import { useAdminSession, useAdminToast } from "../../AdminShell";

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

export default function OrganizerSessionsPage() {
  const authenticated = useAdminSession();
  const toast = useAdminToast();
  const queryClient = useQueryClient();
  const sessionsQuery = useQuery({ queryKey: ["admin", "organizer-sessions"], queryFn: getOrganizerSessions, enabled: authenticated });
  const revokeMutation = useMutation({
    mutationFn: revokeOrganizerSession,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["admin", "organizer-sessions"] });
      toast({ title: "Session revoked", description: "The organizer will need to sign in again.", tone: "success" });
    },
    onError: (error) => toast({ title: "Could not revoke session", description: error.message, tone: "error" }),
  });
  const sessions = sessionsQuery.data ?? [];

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-300">Admin · Organizer</p>
        <h2 className="mt-2 text-3xl font-bold">Organizer Sessions</h2>
        <p className="mt-2 text-sm text-slate-400">View active organizer sign-ins and revoke access when needed.</p>
      </header>
      <section className="rounded-2xl border border-slate-800 bg-slate-950 p-4 shadow-xl sm:p-6">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-slate-400">{sessions.length} active session{sessions.length === 1 ? "" : "s"}</p>
          <button type="button" onClick={() => void sessionsQuery.refetch()} disabled={sessionsQuery.isFetching} className="rounded-lg border border-slate-700 px-3 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-900 disabled:opacity-50">Refresh</button>
        </div>
        {sessionsQuery.isError ? <p role="alert" className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">{sessionsQuery.error.message}</p>
          : sessionsQuery.isPending ? <p className="py-8 text-center text-sm text-slate-400">Loading sessions…</p>
            : sessions.length === 0 ? <p className="py-8 text-center text-sm text-slate-400">There are no active organizer sessions.</p>
              : <div className="grid gap-3">
                {sessions.map((session) => <article key={session.id} className="flex min-w-0 flex-col gap-4 rounded-xl border border-slate-800 bg-slate-900/60 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="break-words font-semibold text-slate-100">{session.fullName} <span className="font-mono text-xs text-indigo-300">{session.organizerId}</span></p>
                    <p className="mt-1 break-all text-sm text-slate-400">{session.emailAddress}</p>
                    <dl className="mt-3 grid gap-x-5 gap-y-1 text-xs text-slate-500 min-[480px]:grid-cols-2">
                      <div><dt className="inline">Signed in: </dt><dd className="inline text-slate-300">{formatDate(session.createdAt)}</dd></div>
                      <div><dt className="inline">Expires: </dt><dd className="inline text-slate-300">{formatDate(session.expiresAt)}</dd></div>
                    </dl>
                  </div>
                  <button type="button" onClick={() => revokeMutation.mutate(session.id)} disabled={revokeMutation.isPending} className="min-h-10 shrink-0 rounded-lg border border-rose-500/30 px-4 py-2 text-sm font-semibold text-rose-200 hover:bg-rose-500/10 disabled:cursor-wait disabled:opacity-50">Revoke session</button>
                </article>)}
              </div>}
      </section>
    </div>
  );
}
