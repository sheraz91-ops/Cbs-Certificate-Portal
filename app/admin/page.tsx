"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { getAdminOverviewStats } from "@/features/admin/api";
import { useAdminSession } from "./AdminShell";

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString();
}

function MetricCard({ label, value, description, href, icon }: { label: string; value: number; description: string; href: string; icon: string }) {
  return (
    <Link href={href} className="group rounded-2xl border border-slate-800 bg-slate-950 p-5 transition hover:-translate-y-0.5 hover:border-indigo-500/50 hover:bg-slate-900/80">
      <div className="flex items-start justify-between gap-3">
        <div><p className="text-sm font-medium text-slate-400">{label}</p><p className="mt-3 text-3xl font-bold tracking-tight text-white">{value.toLocaleString()}</p></div>
        <span aria-hidden="true" className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/10 text-lg text-indigo-300">{icon}</span>
      </div>
      <p className="mt-3 text-xs text-slate-500">{description}</p>
    </Link>
  );
}

export default function AdminPage() {
  const authenticated = useAdminSession();
  const overviewQuery = useQuery({ queryKey: ["admin", "overview"], queryFn: getAdminOverviewStats, enabled: authenticated, refetchOnWindowFocus: true });
  const overview = overviewQuery.data;
  const attendanceTotal = overview ? overview.totals.present + overview.totals.absent : 0;
  const attendancePercent = attendanceTotal ? Math.round((overview!.totals.present / attendanceTotal) * 100) : 0;

  return (
    <div className="mx-auto max-w-7xl space-y-7">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-indigo-300">CBS Certificate Portal</p>
          <h2 className="mt-2 text-3xl font-bold tracking-tight text-white sm:text-4xl">Overview</h2>
          <p className="mt-2 text-sm text-slate-400">A live summary of your workshops, people, registrations, and attendance.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/admin/workshops" className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-500">Create Workshop</Link>
          <Link href="/admin/users" className="rounded-xl border border-slate-700 px-4 py-2.5 text-sm font-semibold text-slate-200 transition hover:bg-slate-900">Add User</Link>
        </div>
      </header>

      {overviewQuery.isError && <p role="alert" className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">{overviewQuery.error.message}</p>}

      {overviewQuery.isPending ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{Array.from({ length: 4 }, (_, index) => <div key={index} className="h-36 animate-pulse rounded-2xl border border-slate-800 bg-slate-950" />)}</div>
      ) : overview ? (
        <>
          <section aria-label="Portal totals" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard label="Workshops" value={overview.totals.workshops} description="Events configured in the portal" href="/admin/workshops/manage" icon="▦" />
            <MetricCard label="Registered Users" value={overview.totals.registeredUsers} description={`${overview.totals.enrolledUsers.toLocaleString()} enrolled in at least one event`} href="/admin/users/all" icon="♙" />
            <MetricCard label="Event Registrations" value={overview.totals.registrations} description="Participant records across all events" href="/admin/participants" icon="▤" />
            <MetricCard label="Organizers" value={overview.totals.organizers} description={`${overview.totals.activeOrganizers.toLocaleString()} active organizer accounts`} href="/admin/organizers" icon="♧" />
          </section>

          <section className="grid gap-4 lg:grid-cols-[1.1fr_2fr]">
            <div className="rounded-2xl border border-slate-800 bg-slate-950 p-5 sm:p-6">
              <div className="flex items-start justify-between gap-3"><div><h3 className="text-lg font-semibold text-white">Attendance</h3><p className="mt-1 text-sm text-slate-400">Across all event registrations</p></div><span className="text-2xl font-bold text-emerald-300">{attendancePercent}%</span></div>
              <div className="mt-6 h-2.5 overflow-hidden rounded-full bg-slate-800" role="progressbar" aria-label="Present attendance percentage" aria-valuemin={0} aria-valuemax={100} aria-valuenow={attendancePercent}><div className="h-full rounded-full bg-emerald-400 transition-all" style={{ width: `${attendancePercent}%` }} /></div>
              <div className="mt-5 grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-emerald-500/5 p-3"><p className="text-xs text-slate-400">Present</p><p className="mt-1 text-xl font-semibold text-emerald-300">{overview.totals.present.toLocaleString()}</p></div>
                <div className="rounded-xl bg-slate-800/60 p-3"><p className="text-xs text-slate-400">Absent</p><p className="mt-1 text-xl font-semibold text-slate-200">{overview.totals.absent.toLocaleString()}</p></div>
              </div>
              <p className="mt-4 text-xs text-slate-500">{overview.totals.usersWithoutEvents.toLocaleString()} registered user{overview.totals.usersWithoutEvents === 1 ? "" : "s"} not enrolled in an event</p>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-950 p-5 sm:p-6">
              <div className="flex items-center justify-between gap-3"><div><h3 className="text-lg font-semibold text-white">Recent Workshops</h3><p className="mt-1 text-sm text-slate-400">Latest events added to the portal</p></div><Link href="/admin/workshops/manage" className="text-sm font-medium text-indigo-300 hover:text-indigo-200">View all</Link></div>
              {overview.recentWorkshops.length ? <div className="mt-5 divide-y divide-slate-800">{overview.recentWorkshops.map((workshop) => <div key={workshop.key} className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"><div className="min-w-0"><p className="truncate text-sm font-medium text-slate-100">{workshop.workshopName}</p><p className="mt-1 text-xs text-slate-500">{workshop.workshopCode} · {workshop.eventYear} · {workshop.eventDate}</p></div><span className="shrink-0 rounded-full bg-indigo-500/10 px-3 py-1 text-xs font-semibold text-indigo-200">{workshop.registrations} registration{workshop.registrations === 1 ? "" : "s"}</span></div>)}</div> : <p className="mt-5 rounded-xl border border-dashed border-slate-700 p-5 text-center text-sm text-slate-400">No workshops yet. Create one to get started.</p>}
            </div>
          </section>

          <section className="grid gap-4 xl:grid-cols-2">
            <div className="rounded-2xl border border-slate-800 bg-slate-950 p-5 sm:p-6">
              <div className="flex items-center justify-between gap-3"><div><h3 className="text-lg font-semibold text-white">Recently Registered Users</h3><p className="mt-1 text-sm text-slate-400">Newest participant accounts</p></div><Link href="/admin/users/all" className="text-sm font-medium text-indigo-300 hover:text-indigo-200">View all</Link></div>
              {overview.recentUsers.length ? <>
                <div className="mt-5 space-y-3 sm:hidden">{overview.recentUsers.map((user) => <article key={user.userId} className="min-w-0 rounded-xl border border-slate-800 bg-slate-900/60 p-3"><Link href={`/admin/users/${encodeURIComponent(user.userId)}`} className="break-words text-sm font-semibold text-slate-100 hover:text-indigo-200">{user.fullName}</Link><p className="mt-1 break-all text-xs text-slate-500">{user.emailAddress}</p><div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-slate-800 pt-3"><span className="break-all font-mono text-xs text-indigo-200">{user.userId}</span><span className="text-xs text-slate-400">{formatDate(user.createdAt)}</span></div></article>)}</div>
                <div className="mt-5 hidden overflow-x-auto sm:block"><table className="w-full min-w-[480px] text-left text-sm"><thead className="text-xs uppercase text-slate-500"><tr><th className="pb-3 font-medium">User</th><th className="pb-3 font-medium">Assigned ID</th><th className="pb-3 text-right font-medium">Joined</th></tr></thead><tbody className="divide-y divide-slate-800">{overview.recentUsers.map((user) => <tr key={user.userId}><td className="py-3"><Link href={`/admin/users/${encodeURIComponent(user.userId)}`} className="font-medium text-slate-100 hover:text-indigo-200">{user.fullName}</Link><span className="mt-0.5 block text-xs text-slate-500">{user.emailAddress}</span></td><td className="py-3 font-mono text-xs text-indigo-200">{user.userId}</td><td className="py-3 text-right text-xs text-slate-400">{formatDate(user.createdAt)}</td></tr>)}</tbody></table></div>
              </> : <p className="mt-5 text-sm text-slate-400">No users have registered yet.</p>}
            </div>
            <div className="rounded-2xl border border-slate-800 bg-slate-950 p-5 sm:p-6">
              <div className="flex items-center justify-between gap-3"><div><h3 className="text-lg font-semibold text-white">Recent Organizers</h3><p className="mt-1 text-sm text-slate-400">Latest event management accounts</p></div><Link href="/admin/organizers" className="text-sm font-medium text-indigo-300 hover:text-indigo-200">View all</Link></div>
              {overview.recentOrganizers.length ? <>
                <div className="mt-5 space-y-3 sm:hidden">{overview.recentOrganizers.map((organizer) => <article key={organizer.organizerId} className="min-w-0 rounded-xl border border-slate-800 bg-slate-900/60 p-3"><div className="flex items-start justify-between gap-3"><Link href={`/admin/organizers/${encodeURIComponent(organizer.organizerId)}`} className="break-words text-sm font-semibold text-slate-100 hover:text-indigo-200">{organizer.fullName}</Link><span className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-semibold ${organizer.isActive ? "bg-emerald-500/10 text-emerald-300" : "bg-slate-800 text-slate-400"}`}>{organizer.isActive ? "Active" : "Inactive"}</span></div><p className="mt-1 break-all text-xs text-slate-500">{organizer.emailAddress}</p><p className="mt-3 break-all border-t border-slate-800 pt-3 font-mono text-xs text-indigo-200">{organizer.organizerId}</p></article>)}</div>
                <div className="mt-5 hidden overflow-x-auto sm:block"><table className="w-full min-w-[460px] text-left text-sm"><thead className="text-xs uppercase text-slate-500"><tr><th className="pb-3 font-medium">Organizer</th><th className="pb-3 font-medium">Assigned ID</th><th className="pb-3 text-right font-medium">Status</th></tr></thead><tbody className="divide-y divide-slate-800">{overview.recentOrganizers.map((organizer) => <tr key={organizer.organizerId}><td className="py-3"><Link href={`/admin/organizers/${encodeURIComponent(organizer.organizerId)}`} className="font-medium text-slate-100 hover:text-indigo-200">{organizer.fullName}</Link><span className="mt-0.5 block text-xs text-slate-500">{organizer.emailAddress}</span></td><td className="py-3 font-mono text-xs text-indigo-200">{organizer.organizerId}</td><td className="py-3 text-right"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${organizer.isActive ? "bg-emerald-500/10 text-emerald-300" : "bg-slate-800 text-slate-400"}`}>{organizer.isActive ? "Active" : "Inactive"}</span></td></tr>)}</tbody></table></div>
              </> : <p className="mt-5 text-sm text-slate-400">No organizers have been added yet.</p>}
            </div>
          </section>
        </>
      ) : null}
    </div>
  );
}
