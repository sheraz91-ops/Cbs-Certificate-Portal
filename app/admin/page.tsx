"use client";

import { useEffect, useState } from "react";

type WorkshopSummary = { key: string; workshopName: string };

// Session-only password storage — cleared on tab close. The real gate is
// server-side: the API route checks ADMIN_PASSWORD on every request no
// matter what the client sends.
function usePassword() {
  const [password, setPassword] = useState("");
  useEffect(() => {
    const saved = sessionStorage.getItem("admin_pw");
    if (saved) setPassword(saved);
  }, []);
  const save = (pw: string) => {
    setPassword(pw);
    sessionStorage.setItem("admin_pw", pw);
  };
  return { password, save };
}

async function callAdmin(password: string, payload: Record<string, any>) {
  const res = await fetch("/api/admin", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password, ...payload }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Request failed");
  return data;
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string).split(",")[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function AdminPage() {
  const { password, save } = usePassword();
  const [unlocked, setUnlocked] = useState(false);
  const [pwInput, setPwInput] = useState("");
  const [workshops, setWorkshops] = useState<WorkshopSummary[]>([]);
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    if (password) tryUnlock(password);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [password]);

  async function tryUnlock(pw: string) {
    try {
      const data = await callAdmin(pw, { action: "list" });
      setWorkshops(data.workshops);
      setUnlocked(true);
      save(pw);
    } catch {
      setUnlocked(false);
    }
  }

  if (!unlocked) {
    return (
      <div className="min-h-screen bg-[#070b14] flex items-center justify-center px-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(99,102,241,0.16),transparent_35%),radial-gradient(circle_at_bottom_left,rgba(14,165,233,0.12),transparent_35%)]" />

        <div className="relative w-full max-w-md">
          <div className="bg-white/[0.06] border border-white/10 backdrop-blur-2xl rounded-3xl p-8 shadow-2xl shadow-black/30">
            <div className="flex justify-center mb-6">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center shadow-lg shadow-indigo-500/25">
                <svg
                  className="w-8 h-8 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="1.8"
                    d="M12 15v2m-6 4h12a2 2 0 002-2v-7a2 2 0 00-2-2H6a2 2 0 00-2 2v7a2 2 0 002 2zm10-11V7a4 4 0 00-8 0v1"
                  />
                </svg>
              </div>
            </div>

            <div className="text-center mb-8">
              <p className="text-indigo-400 text-xs font-semibold uppercase tracking-[0.2em] mb-2">
                Secure Portal
              </p>

              <h1 className="text-2xl font-bold text-white">Admin Access</h1>

              <p className="text-sm text-slate-400 mt-2">
                Enter your administrator password to continue
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-2">
                  Admin Password
                </label>

                <input
                  type="password"
                  placeholder="Enter your password"
                  className="w-full h-12 rounded-xl border border-white/10 bg-black/20 px-4 text-white placeholder:text-slate-500 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
                  value={pwInput}
                  onChange={(e) => setPwInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && tryUnlock(pwInput)}
                />
              </div>

              <button
                onClick={() => tryUnlock(pwInput)}
                className="w-full h-12 rounded-xl bg-gradient-to-r from-indigo-500 to-blue-600 text-white font-semibold shadow-lg shadow-indigo-500/20 transition hover:from-indigo-400 hover:to-blue-500 hover:shadow-indigo-500/30 active:scale-[0.98]"
              >
                Unlock Dashboard
              </button>
            </div>

            <div className="flex items-center justify-center gap-2 mt-7 text-xs text-slate-500">
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M12 11c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M5 20a7 7 0 0114 0"
                />
              </svg>
              Protected administrator area
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 bg-slate-950">
      {status && (
        <div className="whitespace-pre-line rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
          {status}
        </div>
      )}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-2xl bg-slate-950 p-6 shadow-sm transition hover:shadow-md">
          <AddWorkshopForm
            password={password}
            onDone={(w) => {
              setWorkshops((prev) => [...prev, w]);
              setStatus(
                `Workshop "${w.workshopName}" (${w.key}) added and pushed to GitHub.`,
              );
            }}
          />
        </div>

        <div className="rounded-2xl bg-slate-950 p-6 shadow-sm transition hover:shadow-md">
          <AddParticipantsForm
            password={password}
            workshops={workshops}
            onDone={(msg) => setStatus(msg)}
          />
        </div>
      </div>
      <ManageWorkshops
        password={password}
        workshops={workshops}
        onDeleted={(deleted, deletedParticipants) => {
          setWorkshops((current) => current.filter((w) => w.key !== deleted.key));
          setStatus(`Workshop "${deleted.workshopName}" deleted. ${deletedParticipants} participant record(s) were removed.`);
        }}
      />
      <a
        href="/admin/workshops"
        className="inline-flex rounded-xl border border-indigo-500/40 px-4 py-2.5 text-sm font-semibold text-indigo-300 transition hover:bg-indigo-500/10"
      >
        View all workshop details →
      </a>
    </div>
  );
}

function ManageWorkshops({
  password,
  workshops,
  onDeleted,
}: {
  password: string;
  workshops: WorkshopSummary[];
  onDeleted: (workshop: WorkshopSummary, deletedParticipants: number) => void;
}) {
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function deleteWorkshop(workshop: WorkshopSummary) {
    if (!window.confirm(`Delete "${workshop.workshopName}"? Its participant records will also be removed. This can be recovered from GitHub history.`)) return;

    setBusyKey(workshop.key);
    setError(null);
    try {
      const data = await callAdmin(password, { action: "delete-workshop", workshop: workshop.key });
      onDeleted(workshop, data.deletedParticipants);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusyKey(null);
    }
  }

  return (
    <section className="rounded-2xl border border-red-500/20 bg-slate-950 p-6 shadow-xl shadow-slate-950/10">
      <h2 className="text-lg font-semibold text-white">Manage Workshops</h2>
      <p className="mt-1 text-sm text-slate-400">Delete a workshop and all of its participant records.</p>
      {error && <p className="mt-4 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</p>}
      <div className="mt-4 divide-y divide-slate-800 rounded-xl border border-slate-800">
        {workshops.map((workshop) => (
          <div key={workshop.key} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
            <div>
              <p className="font-medium text-slate-100">{workshop.workshopName}</p>
              <p className="text-xs text-slate-500">{workshop.key}</p>
            </div>
            <button
              type="button"
              disabled={busyKey !== null}
              onClick={() => deleteWorkshop(workshop)}
              className="rounded-lg border border-red-500/30 px-3 py-2 text-xs font-semibold text-red-300 transition hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {busyKey === workshop.key ? "Deleting…" : "Delete workshop"}
            </button>
          </div>
        ))}
        {workshops.length === 0 && <p className="px-4 py-3 text-sm text-slate-500">No workshops found.</p>}
      </div>
      <p className="mt-3 text-xs text-slate-500">The certificate template image is retained so it can be recovered or reused.</p>
    </section>
  );
}

function AddWorkshopForm({
  password,
  onDone,
}: {
  password: string;
  onDone: (w: WorkshopSummary) => void;
}) {
  const [key, setKey] = useState("");
  const [workshopName, setWorkshopName] = useState("");
  const [workshopFullTitle, setWorkshopFullTitle] = useState("");
  const [workshopCode, setWorkshopCode] = useState("");
  const [eventYear, setEventYear] = useState(String(new Date().getFullYear()));
  const [eventDate, setEventDate] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);

  const canSubmit =
    key &&
    workshopName &&
    workshopFullTitle &&
    workshopCode &&
    eventYear &&
    eventDate;

  async function submit() {
    setBusy(true);
    setError(null);
    setNote(null);
    try {
      const imageBase64 = file ? await fileToBase64(file) : undefined;
      const imageExt = file?.name.split(".").pop();
      const data = await callAdmin(password, {
        action: "add-workshop",
        key,
        workshopName,
        workshopFullTitle,
        workshopCode,
        eventYear,
        eventDate,
        imageBase64,
        imageExt,
      });
      onDone(data.workshop);
      setNote(data.note);
      setKey("");
      setWorkshopName("");
      setWorkshopFullTitle("");
      setWorkshopCode("");
      setEventDate("");
      setFile(null);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-950 p-6 shadow-xl shadow-slate-950/10">
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-white">Create Workshop</h2>

        <p className="mt-1 text-sm text-slate-400">
          Add the workshop details and certificate template.
        </p>
      </div>

      <div className="space-y-5">
        <div>
          <label className="block text-sm font-medium text-slate-200 mb-2">
            Workshop Key
          </label>

          <input
            className="w-full h-11 rounded-xl border border-slate-700 bg-slate-900 px-4 text-sm text-white placeholder:text-slate-600 outline-none transition-all hover:border-slate-600 focus:border-indigo-500 focus:bg-slate-900 focus:ring-4 focus:ring-indigo-500/10"
            placeholder="nbw-2026"
            value={key}
            onChange={(e) => setKey(e.target.value)}
          />

          <p className="mt-1.5 text-xs text-slate-500">
            Lowercase, hyphenated, unique — e.g. nbw-2026
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-200 mb-2">
            Short Display Name
          </label>

          <input
            className="w-full h-11 rounded-xl border border-slate-700 bg-slate-900 px-4 text-sm text-white placeholder:text-slate-600 outline-none transition-all hover:border-slate-600 focus:border-indigo-500 focus:bg-slate-900 focus:ring-4 focus:ring-indigo-500/10"
            placeholder="National Bootcamp Workshop"
            value={workshopName}
            onChange={(e) => setWorkshopName(e.target.value)}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-200 mb-2">
            Full Descriptive Title
          </label>

          <input
            className="w-full h-11 rounded-xl border border-slate-700 bg-slate-900 px-4 text-sm text-white placeholder:text-slate-600 outline-none transition-all hover:border-slate-600 focus:border-indigo-500 focus:bg-slate-900 focus:ring-4 focus:ring-indigo-500/10"
            placeholder="Full workshop title"
            value={workshopFullTitle}
            onChange={(e) => setWorkshopFullTitle(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-200 mb-2">
              Workshop Code
            </label>

            <input
              className="w-full h-11 rounded-xl border border-slate-700 bg-slate-900 px-4 text-sm uppercase text-white placeholder:text-slate-600 outline-none transition-all hover:border-slate-600 focus:border-indigo-500 focus:bg-slate-900 focus:ring-4 focus:ring-indigo-500/10"
              placeholder="NBW"
              value={workshopCode}
              onChange={(e) => setWorkshopCode(e.target.value.toUpperCase())}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-200 mb-2">
              Year
            </label>

            <input
              className="w-full h-11 rounded-xl border border-slate-700 bg-slate-900 px-4 text-sm text-white placeholder:text-slate-600 outline-none transition-all hover:border-slate-600 focus:border-indigo-500 focus:bg-slate-900 focus:ring-4 focus:ring-indigo-500/10"
              placeholder="2026"
              value={eventYear}
              onChange={(e) => setEventYear(e.target.value)}
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-200 mb-2">
            Event Date
          </label>

          <input
            className="w-full h-11 rounded-xl border border-slate-700 bg-slate-900 px-4 text-sm text-white placeholder:text-slate-600 outline-none transition-all hover:border-slate-600 focus:border-indigo-500 focus:bg-slate-900 focus:ring-4 focus:ring-indigo-500/10"
            placeholder="12 December 2026"
            value={eventDate}
            onChange={(e) => setEventDate(e.target.value)}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-200 mb-2">
            Certificate Template Image
          </label>

          <label className="group flex flex-col items-center justify-center w-full min-h-32 rounded-2xl border-2 border-dashed border-slate-700 bg-slate-900 cursor-pointer transition-all hover:border-indigo-500/60 hover:bg-slate-900/80">
            <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center mb-3 transition group-hover:border-indigo-500/40 group-hover:bg-indigo-500/10">
              <svg
                className="w-5 h-5 text-slate-400 group-hover:text-indigo-400 transition"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="1.8"
                  d="M12 16V4m0 0L8 8m4-4l4 4M5 20h14"
                />
              </svg>
            </div>

            <span className="text-sm font-medium text-slate-200">
              Choose certificate template
            </span>

            <span className="text-xs text-slate-500 mt-1">
              PNG or JPEG image
            </span>

            <input
              type="file"
              accept="image/png,image/jpeg"
              className="hidden"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
            />
          </label>

          {file && (
            <div className="mt-2 flex items-center gap-2 text-xs text-indigo-400">
              <span className="w-2 h-2 rounded-full bg-indigo-500" />
              {file.name}
            </div>
          )}
        </div>

        {error && (
          <div className="flex items-start gap-3 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3">
            <svg
              className="w-5 h-5 text-red-400 shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M12 8v4m0 4h.01M10.29 3.86l-7.82 13.5A2 2 0 004.2 20h15.6a1.99 1.99 0 001.73-2.64l-7.82-13.5a2 2 0 00-3.42 0z"
              />
            </svg>

            <p className="text-sm text-red-300">{error}</p>
          </div>
        )}

        {note && (
          <div className="flex items-start gap-3 rounded-xl border border-amber-500/20 bg-amber-500/10 px-4 py-3">
            <svg
              className="w-5 h-5 text-amber-400 shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M12 9v2m0 4h.01M10.3 3.6l-7.2 12.5A2 2 0 004.8 19h14.4a1.99 1.99 0 001.7-2.9L13.7 3.6a1.99 1.99 0 00-3.4 0z"
              />
            </svg>

            <p className="text-xs leading-5 text-amber-300">{note}</p>
          </div>
        )}

        <button
          disabled={busy || !canSubmit}
          onClick={submit}
          className="w-full h-12 rounded-xl bg-indigo-600 text-white text-sm font-semibold shadow-lg shadow-indigo-950/20 transition-all hover:bg-indigo-500 active:scale-[0.99] disabled:cursor-not-allowed disabled:bg-slate-800 disabled:text-slate-500 disabled:shadow-none"
        >
          {busy ? "Saving…" : "Save Workshop"}
        </button>

        <div className="flex items-start gap-2 rounded-xl bg-slate-900 border border-slate-800 px-4 py-3">
          <svg
            className="w-4 h-4 text-slate-500 mt-0.5 shrink-0"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="1.8"
              d="M13 16h-1v-4h-1m1-4h.01M12 21a9 9 0 100-18 9 9 0 000 18z"
            />
          </svg>

          <p className="text-xs leading-5 text-slate-500">
            Uses the default certificate layout (same placeholder positions as
            the current template). If this workshop&apos;s artwork puts the
            name/ID somewhere different, it&apos;ll render in the wrong spot
            until a custom layout is measured in — send me the blank template
            and I&apos;ll measure it.
          </p>
        </div>
      </div>
    </section>
  );
}

function AddParticipantsForm({
  password,
  workshops,
  onDone,
}: {
  password: string;
  workshops: WorkshopSummary[];
  onDone: (statusMsg: string) => void;
}) {
  const [workshop, setWorkshop] = useState("");
  const [names, setNames] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [skipped, setSkipped] = useState<string[]>([]);

  async function submit() {
    setBusy(true);
    setError(null);
    setSkipped([]);
    try {
      const data = await callAdmin(password, {
        action: "add-participants",
        workshop,
        names,
      });
      onDone(
        `${data.added} participant(s) added:\n${data.assignedIds.join("\n")}`,
      );
      setSkipped(data.skipped || []);
      setNames("");
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-950 p-6 shadow-xl shadow-slate-950/10">
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-white">Add Participants</h2>

        <p className="mt-1 text-sm text-slate-400">
          Assign certificate numbers to workshop participants.
        </p>
      </div>

      <div className="space-y-5">
        <div>
          <label className="mb-2 block text-sm font-medium text-slate-200">
            Workshop
          </label>

          <select
            className="h-11 w-full rounded-xl border border-slate-700 bg-slate-900 px-4 text-sm font-medium text-white outline-none transition-all hover:border-slate-600 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
            value={workshop}
            onChange={(e) => setWorkshop(e.target.value)}
          >
            <option value="" className="bg-slate-900 text-slate-400">
              Select workshop…
            </option>

            {workshops.map((w) => (
              <option
                key={w.key}
                value={w.key}
                className="bg-slate-900 text-white"
              >
                {w.workshopName} ({w.key})
              </option>
            ))}
          </select>
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <label className="text-sm font-medium text-slate-200">
              Participant Names
            </label>

            <span className="text-xs text-slate-500">One name per line</span>
          </div>

          <textarea
            className="min-h-48 w-full resize-y rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 font-mono text-sm leading-6 text-slate-100 placeholder:text-slate-600 outline-none transition-all hover:border-slate-600 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
            placeholder={
              "One name per line — certificate numbers are assigned automatically:\nFatima Noor\nAli Raza\n\nOr pin a specific number: Name, 12"
            }
            value={names}
            onChange={(e) => setNames(e.target.value)}
          />

          <p className="mt-2 text-xs leading-5 text-slate-500">
            Certificate numbers will be assigned automatically unless a specific
            number is provided.
          </p>
        </div>

        {error && (
          <div className="flex items-start gap-3 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-red-500/10">
              <svg
                className="h-4 w-4 text-red-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M12 8v4m0 4h.01M10.29 3.86l-7.82 13.5A2 2 0 004.2 20h15.6a1.99 1.99 0 001.73-2.64l-7.82-13.5a2 2 0 00-3.42 0z"
                />
              </svg>
            </div>

            <p className="pt-1 text-sm text-red-300">{error}</p>
          </div>
        )}

        {skipped.length > 0 && (
          <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 px-4 py-3">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-500/10">
                <svg
                  className="h-4 w-4 text-amber-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M12 9v2m0 4h.01M10.3 3.6l-7.2 12.5A2 2 0 004.8 19h14.4a2 2 0 001.7-2.9L13.7 3.6a2 2 0 00-3.4 0z"
                  />
                </svg>
              </div>

              <p className="text-sm font-semibold text-amber-300">
                Skipped {skipped.length} line(s)
              </p>
            </div>

            <ul className="mt-3 list-disc space-y-1.5 pl-11 text-xs text-amber-300/80">
              {skipped.map((s, i) => (
                <li key={i}>{s}</li>
              ))}
            </ul>
          </div>
        )}

        <button
          disabled={busy || !workshop || !names.trim()}
          onClick={submit}
          className="h-12 w-full rounded-xl bg-indigo-600 text-sm font-semibold text-white shadow-lg shadow-indigo-950/20 transition-all hover:bg-indigo-500 active:scale-[0.99] disabled:cursor-not-allowed disabled:bg-slate-800 disabled:text-slate-500 disabled:shadow-none"
        >
          {busy ? "Saving…" : "Save Participants"}
        </button>
      </div>
    </section>
  );
}
