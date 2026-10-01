"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

const AdminPasswordContext = createContext("");
type ToastTone = "success" | "error" | "info";
type ToastInput = { title: string; description?: string; tone?: ToastTone };
type ToastItem = ToastInput & { id: number };
const AdminToastContext = createContext<(toast: ToastInput) => void>(
  () => undefined,
);

export function useAdminPassword() {
  return useContext(AdminPasswordContext);
}

export function useAdminToast() {
  return useContext(AdminToastContext);
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
  { href: "/admin", label: "Overview", icon: "⌂" },
  { href: "/admin/workshops", label: "Workshops", icon: "▦" },
  { href: "/admin/all-workshops", label: "All workshop", icon: "☷" },
  { href: "/admin/participants", label: "Add Participants", icon: "＋" },
];

export default function AdminShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [password, setPassword] = useState("");
  const [passwordInput, setPasswordInput] = useState("");
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  useEffect(() => {
    const savedTheme = localStorage.getItem("admin_theme");
    if (savedTheme === "light" || savedTheme === "dark") setTheme(savedTheme);

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

  const pushToast = useMemo(
    () => (toast: ToastInput) => {
      const id = Date.now() + Math.random();
      setToasts((current) => [...current, { ...toast, id }]);
      window.setTimeout(
        () => setToasts((current) => current.filter((item) => item.id !== id)),
        4500,
      );
    },
    [],
  );

  async function unlock(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await validatePassword(passwordInput);
      sessionStorage.setItem("admin_pw", passwordInput);
      pushToast({
        title: "Admin session unlocked",
        description: "You can now manage workshops and participants.",
        tone: "success",
      });
      setPassword(passwordInput);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to unlock admin area",
      );
    } finally {
      setBusy(false);
    }
  }

  function toggleTheme() {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    localStorage.setItem("admin_theme", next);
  }

  if (!ready) {
    return (
      <main
        className="min-h-screen bg-slate-950"
        aria-label="Loading admin area"
      />
    );
  }

  if (!password) {
    return (
      <main
        data-admin-theme={theme}
        className={`admin-shell ${theme === "light" ? "admin-theme-light" : ""} flex min-h-screen items-center justify-center px-4 py-10`}
      >
        <div className="w-full max-w-md">
          <div className="mb-6 flex justify-end">
            <ThemeButton theme={theme} onToggle={toggleTheme} />
          </div>
          <form
            onSubmit={unlock}
            className="admin-login-card rounded-3xl border p-8 shadow-2xl"
          >
            <div className="mb-7 flex items-center gap-3">
              <div className="admin-brand-mark flex h-12 w-12 items-center justify-center rounded-2xl text-xl font-black">
                C
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-400">
                  CBS Certificate Portal
                </p>
                <p className="mt-1 text-sm text-slate-500">Administration</p>
              </div>
            </div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-400">
              Secure portal
            </p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight">
              Admin Access
            </h1>
            <p className="mt-2 text-sm text-slate-400">
              Enter your administrator password to continue.
            </p>
            <label
              htmlFor="admin-password"
              className="mb-2 mt-6 block text-sm font-medium text-slate-300"
            >
              Admin password
            </label>
            <input
              id="admin-password"
              autoFocus
              type="password"
              value={passwordInput}
              onChange={(event) => setPasswordInput(event.target.value)}
              placeholder="Enter your password"
              className="h-12 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
            />
            {error && (
              <p role="alert" className="mt-3 text-sm text-red-400">
                {error}
              </p>
            )}
            <button
              disabled={busy || !passwordInput}
              className="mt-4 h-12 w-full rounded-xl bg-indigo-600 font-semibold text-white shadow-lg shadow-indigo-950/20 transition hover:bg-indigo-500 disabled:opacity-50"
            >
              {busy ? "Unlocking…" : "Unlock admin area"}
            </button>
            <p className="mt-5 text-center text-xs text-slate-500">
              Your session stays active in this tab only.
            </p>
          </form>
        </div>
      </main>
    );
  }

  const currentPage =
    navigation.find(
      (item) => item.href.toLowerCase() === pathname.toLowerCase(),
    )?.label ?? "Admin";

  return (
    <AdminPasswordContext.Provider value={password}>
      <AdminToastContext.Provider value={pushToast}>
        <div
          data-admin-theme={theme}
          className={`admin-shell ${theme === "light" ? "admin-theme-light" : ""} min-h-screen md:flex`}
        >
          <aside className="admin-sidebar flex shrink-0 flex-col border-b md:min-h-screen md:w-[260px] md:border-b-0 md:border-r">
            <div className="flex items-center gap-3 px-5 py-5 md:px-6 md:pt-7">
              <div className="admin-brand-mark flex h-11 w-11 items-center justify-center rounded-2xl text-lg font-black">
                C
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-bold tracking-wide">
                  CBS Admin
                </p>
                <p className="mt-0.5 text-xs text-slate-500">
                  Certificate Portal
                </p>
              </div>
            </div>
            <div className="px-5 pb-2 pt-3 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500 md:px-6">
              Workspace
            </div>
            <nav
              aria-label="Admin navigation"
              className="flex gap-2 overflow-x-auto px-3 pb-4 md:flex-col md:overflow-visible md:px-4"
            >
              {navigation.map((item) => {
                const active =
                  item.href === "/admin"
                    ? pathname === item.href
                    : pathname.toLowerCase() === item.href.toLowerCase();
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={`admin-nav-link flex shrink-0 items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${active ? "is-active" : "text-slate-400 hover:bg-slate-800 hover:text-white"}`}
                  >
                    <span
                      aria-hidden="true"
                      className="flex h-6 w-6 items-center justify-center text-base"
                    >
                      {item.icon}
                    </span>
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>
            <div className="mt-auto hidden px-5 pb-5 md:block md:px-6">
              <div className="admin-session-card rounded-2xl border p-4">
                <span className="flex items-center gap-2 text-xs font-semibold">
                  <span className="h-2 w-2 rounded-full bg-emerald-500" />
                  Secure session active
                </span>
                <p className="mt-2 text-[11px] leading-5 text-slate-500">
                  Administrator tools are available for this tab.
                </p>
              </div>
            </div>
          </aside>

          <div className="min-w-0 flex-1">
            <header className="admin-topbar sticky top-0 z-20 flex h-[68px] items-center justify-between border-b px-4 sm:px-6 lg:px-10">
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
                  Administration
                </p>
                <h1 className="mt-0.5 truncate text-sm font-semibold sm:text-base">
                  {currentPage}
                </h1>
              </div>
              <div className="flex items-center gap-2 sm:gap-3">
                <ThemeButton theme={theme} onToggle={toggleTheme} />
                <button
                  type="button"
                  onClick={() => {
                    sessionStorage.removeItem("admin_pw");
                    setPassword("");
                  }}
                  className="admin-utility-button rounded-xl border px-3 py-2 text-xs font-semibold sm:px-3.5 sm:text-sm"
                >
                  Lock<span className="hidden sm:inline"> session</span>
                </button>
              </div>
            </header>
            <main className="min-w-0 p-4 sm:p-6 lg:p-10">{children}</main>
          </div>

          <div
            className="admin-toast-stack"
            aria-live="polite"
            aria-atomic="false"
          >
            {toasts.map((toast) => (
              <div
                key={toast.id}
                role={toast.tone === "error" ? "alert" : "status"}
                className={`admin-toast ${toast.tone || "success"}`}
              >
                <span className="admin-toast-icon" aria-hidden="true">
                  {toast.tone === "error"
                    ? "!"
                    : toast.tone === "info"
                      ? "i"
                      : "✓"}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold">
                    {toast.title}
                  </span>
                  {toast.description && (
                    <span className="mt-0.5 block text-xs opacity-75">
                      {toast.description}
                    </span>
                  )}
                </span>
                <button
                  type="button"
                  aria-label="Dismiss notification"
                  onClick={() =>
                    setToasts((current) =>
                      current.filter((item) => item.id !== toast.id),
                    )
                  }
                  className="rounded-md px-1.5 py-1 text-lg leading-none opacity-60 hover:opacity-100"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>
      </AdminToastContext.Provider>
    </AdminPasswordContext.Provider>
  );
}

function ThemeButton({
  theme,
  onToggle,
}: {
  theme: "dark" | "light";
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
      className="admin-utility-button inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-semibold sm:text-sm"
    >
      <span aria-hidden="true">{theme === "dark" ? "☀" : "☾"}</span>
      <span className="hidden sm:inline">
        {theme === "dark" ? "Light mode" : "Dark mode"}
      </span>
    </button>
  );
}
