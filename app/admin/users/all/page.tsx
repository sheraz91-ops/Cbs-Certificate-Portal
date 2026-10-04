"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { getUsers } from "@/features/users/api";
import { useAdminSession } from "../../AdminShell";
import InputField from "@/components/InputField";
import { searchTextSchema } from "@/lib/validation/schemas";

export default function AllUsersPage() {
  const authenticated = useAdminSession();
  const [search, setSearch] = useState("");
  const usersQuery = useQuery({
    queryKey: ["admin", "users"],
    queryFn: () => getUsers(),
    enabled: authenticated,
  });
  const users = usersQuery.data ?? [];
  const filteredUsers = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return users;
    return users.filter((user) =>
      [
        user.userId,
        user.fullName,
        user.emailAddress,
        user.registrationNumber,
        user.department,
      ].some((value) => value.toLowerCase().includes(query)),
    );
  }, [search, users]);

  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-300">
          Admin · Users
        </p>
        <h2 className="mt-2 text-3xl font-bold">All Users</h2>
        <p className="mt-2 text-sm text-slate-400">
          Select a user ID to view the complete profile.
        </p>
      </header>

      <section className="rounded-2xl border border-slate-800 bg-slate-950 p-4 shadow-xl shadow-slate-950/10 sm:p-6">
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <p className="text-sm text-slate-400">
            {users.length} registered user{users.length === 1 ? "" : "s"}
          </p>
          <label className="text-xs font-medium text-slate-300">
            Search users
            <InputField
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              validationSchema={searchTextSchema}
              placeholder="ID, name, email, registration, department"
              className="mt-1.5 h-10 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 text-sm text-slate-100 outline-none focus:border-indigo-500 sm:w-80"
            />
          </label>
        </div>
        {usersQuery.isError ? (
          <p
            role="alert"
            className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300"
          >
            {usersQuery.error.message}
          </p>
        ) : usersQuery.isPending ? (
          <p className="py-8 text-center text-sm text-slate-400">
            Loading users…
          </p>
        ) : filteredUsers.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-400">
            {users.length
              ? "No users match that search."
              : "No users have been registered yet."}
          </p>
        ) : (
          <>
            <div className="grid gap-3 sm:grid-cols-2 lg:hidden">
              {filteredUsers.map((user) => (
                <article
                  key={user.userId}
                  className="min-w-0 rounded-xl border border-slate-800 bg-slate-900/70 p-4"
                >
                  <p className="text-xs text-slate-500">User</p>
                  <p className="mt-1 break-words font-semibold text-slate-100">
                    {user.fullName}
                  </p>
                  <dl className="mt-3 space-y-2 border-t border-slate-800 pt-3 text-xs">
                    <div>
                      <dt className="text-slate-500">Assigned ID</dt>
                      <dd className="mt-0.5 break-all font-mono text-indigo-200">
                        <Link
                          href={`/admin/users/${encodeURIComponent(user.userId)}`}
                          className="underline decoration-indigo-500/40 underline-offset-4"
                        >
                          {user.userId}
                        </Link>
                      </dd>
                    </div>
                    <div>
                      <dt className="text-slate-500">Email</dt>
                      <dd className="mt-0.5 break-all text-slate-300">
                        {user.emailAddress}
                      </dd>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <dt className="text-slate-500">Registration</dt>
                        <dd className="mt-0.5 break-words text-slate-300">
                          {user.registrationNumber}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-slate-500">Department</dt>
                        <dd className="mt-0.5 break-words text-slate-300">
                          {user.department}
                        </dd>
                      </div>
                    </div>
                  </dl>
                </article>
              ))}
            </div>
            <div className="hidden overflow-x-auto rounded-xl border border-slate-800 lg:block">
              <table className="w-full min-w-[850px] text-left text-sm">
                <thead className="bg-slate-900 text-xs uppercase text-slate-400">
                  <tr>
                    {[
                      "Assigned ID",
                      "Full Name",
                      "Email Address",
                      "Registration Number",
                      "Department",
                    ].map((label) => (
                      <th key={label} scope="col" className="px-4 py-3">
                        {label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {filteredUsers.map((user) => (
                    <tr key={user.userId}>
                      <td className="whitespace-nowrap px-4 py-3 font-mono font-semibold">
                        <Link
                          href={`/admin/users/${encodeURIComponent(user.userId)}`}
                          className="text-indigo-300 underline decoration-indigo-500/40 underline-offset-4 hover:text-indigo-200"
                        >
                          {user.userId}
                        </Link>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-slate-200">
                        {user.fullName}
                      </td>
                      <td className="px-4 py-3 text-slate-300">
                        {user.emailAddress}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-slate-300">
                        {user.registrationNumber}
                      </td>
                      <td className="px-4 py-3 text-slate-300">
                        {user.department}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
