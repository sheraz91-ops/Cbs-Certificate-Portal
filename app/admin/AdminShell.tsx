"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

const AdminPasswordContext = createContext("");

export function useAdminPassword() {
  return useContext(AdminPasswordContext);
}

async function validatePassword(password: string) {
  const response = await fetch("/api/admin", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password, action: "list" }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Invalid admin password");
}

const navigation = [
  { href: "/admin", label: "Admin Home" },
  { href: "/admin/workshops", label: "Workshops" },
  { href: "/admin/all-workshops", label: "All workshop" },
  { href: "/admin/Participants", label: "Add Participants" },
];

export default function AdminShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [password, setPassword] = useState("");
  const [passwordInput, setPasswordInput] = useState("");
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const saved = sessionStorage.getItem("admin_pw") || "";
    if (!saved) {
      setReady(true);
      return;
    }
    validatePassword(saved)
      .then(() => setPassword(saved))
      .catch(() => sessionStorage.removeItem("admin_pw"))
      .finally(() => setReady(true));
  }, []);

  async function unlock(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await validatePassword(passwordInput);
      sessionStorage.setItem("admin_pw", passwordInput);
      setPassword(passwordInput);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to unlock admin area");
    } finally {
      setBusy(false);
    }
  }

  if (!ready) {
    return <main className="min-h-screen bg-slate-950" aria-label="Loading admin area" />;
  }

  if (!password) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 px-4 text-white">
        <form onSubmit={unlock} className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-7 shadow-2xl">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-300">Secure portal</p>
          <h1 className="mt-2 text-2xl font-bold">Admin Access</h1>
          <p className="mt-2 text-sm text-slate-400">Enter your administrator password to continue.</p>
          <input autoFocus type="password" value={passwordInput} onChange={(event) => setPasswordInput(event.target.value)} placeholder="Admin password" className="mt-6 h-12 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 outline-none focus:border-indigo-500" />
          {error && <p className="mt-3 text-sm text-red-300">{error}</p>}
          <button disabled={busy || !passwordInput} className="mt-4 h-12 w-full rounded-xl bg-indigo-600 font-semibold hover:bg-indigo-500 disabled:opacity-50">{busy ? "Unlocking…" : "Unlock admin area"}</button>
        </form>
      </main>
    );
  }

  return (
    <AdminPasswordContext.Provider value={password}>
      <div className="min-h-screen bg-slate-950 text-white md:flex">
        <aside className="border-b border-slate-800 bg-slate-900/70 p-4 md:min-h-screen md:w-64 md:shrink-0 md:border-b-0 md:border-r md:p-6">
          <Link href="/admin" className="text-lg font-bold tracking-tight">CBS Admin</Link>
          <nav aria-label="Admin navigation" className="mt-5 flex gap-2 overflow-x-auto md:flex-col">
            {navigation.map((item) => {
              const active = item.href === "/admin" ? pathname === item.href : pathname.toLowerCase() === item.href.toLowerCase();
              return <Link key={item.href} href={item.href} aria-current={active ? "page" : undefined} className={`shrink-0 rounded-xl px-3 py-2.5 text-sm font-medium transition ${active ? "bg-indigo-500/15 text-indigo-200" : "text-slate-400 hover:bg-slate-800 hover:text-white"}`}>{item.label}</Link>;
            })}
          </nav>
          <button type="button" onClick={() => { sessionStorage.removeItem("admin_pw"); setPassword(""); }} className="mt-5 rounded-lg px-3 py-2 text-xs font-medium text-slate-500 hover:text-white">Lock admin area</button>
        </aside>
        <main className="min-w-0 flex-1 p-4 sm:p-6 lg:p-10">{children}</main>
      </div>
    </AdminPasswordContext.Provider>
  );
}
