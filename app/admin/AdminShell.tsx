"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { getAdminSession, loginAdmin, logoutAdmin } from "@/features/admin/api";
import PasswordField from "@/components/PasswordField";
import { adminLoginSchema, validationMessage } from "@/lib/validation/schemas";
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

const AdminSessionContext = createContext(false);
type ToastTone = "success" | "error" | "info";
type ToastInput = { title: string; description?: string; tone?: ToastTone };
type ToastItem = ToastInput & { id: number };
const AdminToastContext = createContext<(toast: ToastInput) => void>(
  () => undefined,
);

export function useAdminSession() {
  return useContext(AdminSessionContext);
}

export function useAdminToast() {
  return useContext(AdminToastContext);
}

type NavigationLink = { href: string; label: string; icon?: string };
type NavigationGroup = {
  key: "workshops" | "users" | "organizers";
  label: string;
  icon: string;
  children: NavigationLink[];
};
type NavigationItem = NavigationLink | NavigationGroup;

const navigation: NavigationItem[] = [
  { href: "/admin", label: "Overview", icon: "⌂" },
  {
    key: "workshops",
    label: "Workshop",
    icon: "▦",
    children: [
      { href: "/admin/workshops", label: "Create Workshop" },
      { href: "/admin/workshops/manage", label: "Manage Workshop" },
    ],
  },
  {
    key: "users",
    label: "User",
    icon: "♙",
    children: [
      { href: "/admin/users", label: "Add User" },
      { href: "/admin/users/all", label: "All Users" },
    ],
  },
  {
    key: "organizers",
    label: "Organizer",
    icon: "â—‰",
    children: [
      { href: "/admin/organizers/create", label: "Add Organizer" },
      { href: "/admin/organizers", label: "All Organizers" },
    ],
  },
  { href: "/admin/participants", label: "Add Users to Workshop", icon: "＋" },
];

export default function AdminShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const queryClient = useQueryClient();
  const [authenticated, setAuthenticated] = useState(false);
  const [passwordInput, setPasswordInput] = useState("");
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [openMenus, setOpenMenus] = useState<
    Record<NavigationGroup["key"], boolean>
  >({
    users: pathname.toLowerCase().startsWith("/admin/users"),
    workshops: pathname.toLowerCase().startsWith("/admin/workshops"),
    organizers: pathname.toLowerCase().startsWith("/admin/organizers"),
  });

  useEffect(() => {
    const savedTheme = localStorage.getItem("admin_theme");
    if (savedTheme === "light" || savedTheme === "dark") setTheme(savedTheme);

    sessionStorage.removeItem("admin_pw");
    const hasSessionMarker =
      sessionStorage.getItem("admin_session") === "active";
    if (!hasSessionMarker) {
      setReady(true);
      return;
    }
    getAdminSession()
      .then(() => setAuthenticated(true))
      .catch(() => sessionStorage.removeItem("admin_session"))
      .finally(() => setReady(true));
  }, []);

  useEffect(() => {
    if (pathname.toLowerCase().startsWith("/admin/users"))
      setOpenMenus((current) => ({ ...current, users: true }));
    if (pathname.toLowerCase().startsWith("/admin/workshops"))
      setOpenMenus((current) => ({ ...current, workshops: true }));
    if (pathname.toLowerCase().startsWith("/admin/organizers"))
      setOpenMenus((current) => ({ ...current, organizers: true }));
  }, [pathname]);

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

  useEffect(() => {
    const expireSession = () => {
      sessionStorage.removeItem("admin_session");
      setAuthenticated(false);
      queryClient.removeQueries({ queryKey: ["admin"] });
    };
    window.addEventListener("admin-session-expired", expireSession);
    return () =>
      window.removeEventListener("admin-session-expired", expireSession);
  }, [queryClient]);

  async function unlock(event: React.FormEvent) {
    event.preventDefault();
    const parsed = adminLoginSchema.safeParse({ password: passwordInput });
    if (!parsed.success) {
      setError(validationMessage(parsed.error));
      return;
    }
    setBusy(true);
    setError("");
    try {
      await loginAdmin(passwordInput);
      sessionStorage.setItem("admin_session", "active");
      setAuthenticated(true);
      pushToast({
        title: "Admin session unlocked",
        description: "You can now manage users, workshops, and participants.",
        tone: "success",
      });
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to unlock admin area",
      );
    } finally {
      setPasswordInput("");
      setBusy(false);
    }
  }

  async function lockSession() {
    try {
      await logoutAdmin();
    } catch {
      // Always lock this tab locally, even when the server cannot be reached.
    } finally {
      sessionStorage.removeItem("admin_session");
      setAuthenticated(false);
      setPasswordInput("");
      queryClient.removeQueries({ queryKey: ["admin"] });
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

  if (!authenticated) {
    return (
      <main
        data-admin-theme={theme}
        className={`admin-shell ${theme === "light" ? "admin-theme-light" : ""} flex min-h-screen items-center justify-center px-4 py-10`}
      >
        <div className="w-full max-w-md">
          <div className="mb-6 flex items-center justify-between">
            <Link
              href="/"
              aria-label="Back to home"
              title="Back to home"
              className="admin-utility-button inline-flex h-10 w-10 items-center justify-center rounded-xl border transition hover:bg-white/5"
            >
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                fill="none"
                className="h-5 w-5"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M19 12H5m7 7-7-7 7-7" />
              </svg>
            </Link>
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
            <PasswordField
              id="admin-password"
              autoFocus
              value={passwordInput}
              validationSchema={adminLoginSchema.shape.password}
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

  const flatNavigation = navigation.flatMap((item): NavigationLink[] =>
    "children" in item
      ? item.children
      : [{ href: item.href, label: item.label, icon: item.icon }],
  );
  const currentPage =
    flatNavigation.find(
      (item) => item.href.toLowerCase() === pathname.toLowerCase(),
    )?.label ??
    (pathname.toLowerCase().startsWith("/admin/users/")
      ? "User Details"
      : pathname.toLowerCase().startsWith("/admin/workshops/")
        ? "Workshop Details"
        : pathname.toLowerCase().startsWith("/admin/organizers/")
          ? "Organizer Details"
          : "Admin");

  return (
    <AdminSessionContext.Provider value={authenticated}>
      <AdminToastContext.Provider value={pushToast}>
        <div
          data-admin-theme={theme}
          className={`admin-shell ${theme === "light" ? "admin-theme-light" : ""} min-h-screen md:flex`}
        >
          <aside className="admin-sidebar flex shrink-0 flex-col border-b md:sticky md:top-0 md:h-screen md:w-[260px] md:self-start md:overflow-y-auto md:border-b-0 md:border-r">
            <div className="flex items-center gap-3 px-5 py-5 md:px-6 md:pt-7">
              <div className="admin-brand-mark flex h-11 w-11 items-center justify-center rounded-2xl text-lg font-black">
                C
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-bold tracking-wide">
                  CBS Admin
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
                if ("children" in item) {
                  const active = pathname
                    .toLowerCase()
                    .startsWith(`/admin/${item.key}`);
                  const isOpen = openMenus[item.key];
                  return (
                    <div key={item.label} className="flex shrink-0 flex-col">
                      <button
                        type="button"
                        aria-expanded={isOpen}
                        aria-controls={`admin-${item.key}-submenu`}
                        onClick={() =>
                          setOpenMenus((current) => ({
                            ...current,
                            [item.key]: !current[item.key],
                          }))
                        }
                        className={`admin-nav-link flex items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium transition ${active ? "is-active" : "text-slate-400 hover:bg-slate-800 hover:text-white"}`}
                      >
                        <span
                          aria-hidden="true"
                          className="flex h-6 w-6 items-center justify-center text-base"
                        >
                          <NavigationIcon label={item.label} />
                        </span>
                        <span className="flex-1">{item.label}</span>
                        <svg
                          aria-hidden="true"
                          viewBox="0 0 20 20"
                          fill="none"
                          className={`h-4 w-4 transition-transform ${isOpen ? "rotate-180" : ""}`}
                        >
                          <path
                            d="m5 7.5 5 5 5-5"
                            stroke="currentColor"
                            strokeWidth="1.7"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </button>
                      {isOpen && (
                        <div
                          id={`admin-${item.key}-submenu`}
                          className="mt-1 flex flex-col gap-1 pl-9"
                        >
                          {item.children.map((child) => {
                            const childActive =
                              pathname.toLowerCase() ===
                              child.href.toLowerCase();
                            return (
                              <Link
                                key={child.href}
                                href={child.href}
                                aria-current={childActive ? "page" : undefined}
                                className={`rounded-lg px-3 py-2 text-sm transition ${childActive ? "bg-indigo-500/10 font-semibold text-indigo-200" : "text-slate-400 hover:bg-slate-800 hover:text-white"}`}
                              >
                                <NavigationIcon label={child.label} small />
                                {child.label}
                              </Link>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                }

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
                      <NavigationIcon label={item.label} />
                    </span>
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>
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
                  onClick={() => void lockSession()}
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
    </AdminSessionContext.Provider>
  );
}

function NavigationIcon({
  label,
  small = false,
}: {
  label: string;
  small?: boolean;
}) {
  const iconClass = small
    ? "mr-2 inline-block h-4 w-4 align-[-3px]"
    : "h-5 w-5";
  const common = {
    "aria-hidden": true as const,
    viewBox: "0 0 24 24",
    fill: "none",
    className: iconClass,
    stroke: "currentColor",
    strokeWidth: 1.7,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };

  if (label === "Overview")
    return (
      <svg {...common}>
        <rect x="3" y="3" width="8" height="8" rx="1.5" />
        <rect x="13" y="3" width="8" height="5" rx="1.5" />
        <rect x="13" y="10" width="8" height="11" rx="1.5" />
        <rect x="3" y="13" width="8" height="8" rx="1.5" />
      </svg>
    );
  if (label === "User")
    return (
      <svg {...common}>
        <circle cx="9" cy="8" r="4" />
        <path d="M2 20v-1.5a4 4 0 014-4h6a4 4 0 014 4V20M16 5a4 4 0 010 6M20 15a4 4 0 012 3.5V20" />
      </svg>
    );
  if (label === "Organizer")
    return (
      <svg {...common}>
        <path d="M12 22s8-4 8-11V5l-8-3-8 3v6c0 7 8 11 8 11z" />
        <path d="M9 12l2 2 4-4" />
      </svg>
    );
  if (label.startsWith("Add Users to Workshop"))
    return (
      <svg {...common}>
        <rect x="3" y="4" width="18" height="16" rx="2" />
        <path d="M8 2v4M16 2v4M3 9h18M8 13h3M8 16h3M16 13v5M13.5 15.5h5" />
      </svg>
    );
  if (label.includes("Workshop"))
    return label.startsWith("Create") ? (
      <svg {...common}>
        <rect x="3" y="4" width="18" height="17" rx="2" />
        <path d="M16 2v4M8 2v4M3 9h18M12 12v6M9 15h6" />
      </svg>
    ) : (
      <svg {...common}>
        <rect x="3" y="4" width="18" height="17" rx="2" />
        <path d="M16 2v4M8 2v4M3 9h18M8 14h3M8 17h8" />
      </svg>
    );
  if (label === "Add User")
    return (
      <svg {...common}>
        <path d="M15 19v-1.5a4 4 0 00-4-4H7a4 4 0 00-4 4V19" />
        <circle cx="9" cy="7" r="4" />
        <path d="M19 8v6M16 11h6" />
      </svg>
    );
  if (label === "All Users")
    return (
      <svg {...common}>
        <path d="M16 20v-1.5a4 4 0 00-4-4H7a4 4 0 00-4 4V20" />
        <circle cx="9.5" cy="7" r="4" />
        <path d="M17 4.2a4 4 0 010 7.6M20 14.5a4 4 0 011 3V20" />
      </svg>
    );
  if (label === "Add Organizer")
    return (
      <svg {...common}>
        <path d="M14 19v-1.5a4 4 0 00-4-4H6a4 4 0 00-4 4V19" />
        <circle cx="8" cy="7" r="4" />
        <path d="M19 7v6M16 10h6" />
      </svg>
    );
  if (label === "All Organizers")
    return (
      <svg {...common}>
        <circle cx="9" cy="8" r="4" />
        <path d="M2 20v-1.5a4 4 0 014-4h6a4 4 0 014 4V20M16 11l2 2 4-4" />
      </svg>
    );
  return (
    <svg {...common}>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="M8 2v4M16 2v4M3 9h18M8 13h3M8 16h8" />
    </svg>
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
