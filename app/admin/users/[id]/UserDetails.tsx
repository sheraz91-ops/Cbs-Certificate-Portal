"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { getUserById } from "@/features/users/api";
import { useAdminPassword } from "../../AdminShell";

const detailFields = [
  ["emailAddress", "Email Address"],
  ["fullName", "Full Name"],
  ["registrationNumber", "Registration Number"],
  ["department", "Department"],
  ["semester", "Semester"],
  ["section", "Section"],
  ["institute", "Institute"],
  ["whatsappNumber", "WhatsApp Number"],
  ["cnic", "CNIC"],
] as const;

export default function UserDetails({ userId }: { userId: string }) {
  const password = useAdminPassword();
  const userQuery = useQuery({
    queryKey: ["admin", "users", userId],
    queryFn: () => getUserById(password, userId),
    enabled: Boolean(password && userId),
  });
  const user = userQuery.data;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Link href="/admin/users/all" className="inline-flex items-center gap-2 text-sm font-medium text-indigo-300 hover:text-indigo-200">← All Users</Link>
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-300">Admin · Users</p>
        <h2 className="mt-2 text-3xl font-bold">User Details</h2>
        <p className="mt-2 font-mono text-sm text-slate-400">{userId}</p>
      </header>

      {userQuery.isPending ? (
        <p className="rounded-2xl border border-slate-800 bg-slate-950 px-6 py-10 text-center text-sm text-slate-400">Loading user details…</p>
      ) : userQuery.isError ? (
        <p role="alert" className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">{userQuery.error.message}</p>
      ) : user ? (
        <section className="rounded-2xl border border-slate-800 bg-slate-950 p-6 shadow-xl shadow-slate-950/10">
          <div className="mb-6 border-b border-slate-800 pb-5">
            <p className="text-xs font-medium uppercase tracking-wider text-slate-500">Assigned User ID</p>
            <p className="mt-2 font-mono text-xl font-semibold text-indigo-200">{user.userId}</p>
          </div>
          <dl className="grid gap-x-8 gap-y-5 sm:grid-cols-2">
            {detailFields.map(([key, label]) => (
              <div key={key}>
                <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</dt>
                <dd className="mt-1 break-words text-sm font-medium text-slate-100">{user[key]}</dd>
              </div>
            ))}
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">Created</dt>
              <dd className="mt-1 text-sm font-medium text-slate-100">{new Date(user.createdAt).toLocaleString()}</dd>
            </div>
          </dl>
        </section>
      ) : null}
    </div>
  );
}
