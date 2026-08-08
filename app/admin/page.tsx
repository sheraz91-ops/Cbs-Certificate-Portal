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
      <div className="max-w-sm mx-auto mt-24 space-y-4">
        <h1 className="text-xl font-semibold">Admin</h1>
        <input
          type="password"
          placeholder="Admin password"
          className="w-full border rounded px-3 py-2"
          value={pwInput}
          onChange={(e) => setPwInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && tryUnlock(pwInput)}
        />
        <button className="w-full bg-black text-white rounded py-2" onClick={() => tryUnlock(pwInput)}>
          Unlock
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto py-12 px-4 space-y-12">
      <h1 className="text-2xl font-semibold">CBS Certificate Portal — Admin</h1>
      {status && <p className="text-sm bg-gray-100 rounded px-3 py-2 whitespace-pre-line">{status}</p>}

      <AddWorkshopForm
        password={password}
        onDone={(w) => {
          setWorkshops((prev) => [...prev, w]);
          setStatus(`Workshop "${w.workshopName}" (${w.key}) added and pushed to GitHub.`);
        }}
      />

      <AddParticipantsForm
        password={password}
        workshops={workshops}
        onDone={(msg) => setStatus(msg)}
      />
    </div>
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
    key && workshopName && workshopFullTitle && workshopCode && eventYear && eventDate;

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
    <section className="space-y-3">
      <h2 className="text-lg font-medium">Add workshop</h2>

      <div>
        <label className="text-xs text-gray-500">Key (lowercase, hyphenated, unique — e.g. nbw-2026)</label>
        <input
          className="w-full border rounded px-3 py-2"
          value={key}
          onChange={(e) => setKey(e.target.value)}
        />
      </div>
      <div>
        <label className="text-xs text-gray-500">Short display name (e.g. National Bootcamp Workshop)</label>
        <input
          className="w-full border rounded px-3 py-2"
          value={workshopName}
          onChange={(e) => setWorkshopName(e.target.value)}
        />
      </div>
      <div>
        <label className="text-xs text-gray-500">Full descriptive title</label>
        <input
          className="w-full border rounded px-3 py-2"
          value={workshopFullTitle}
          onChange={(e) => setWorkshopFullTitle(e.target.value)}
        />
      </div>
      <div className="flex gap-3">
        <div className="flex-1">
          <label className="text-xs text-gray-500">Code (e.g. NBW)</label>
          <input
            className="w-full border rounded px-3 py-2"
            value={workshopCode}
            onChange={(e) => setWorkshopCode(e.target.value.toUpperCase())}
          />
        </div>
        <div className="flex-1">
          <label className="text-xs text-gray-500">Year</label>
          <input
            className="w-full border rounded px-3 py-2"
            value={eventYear}
            onChange={(e) => setEventYear(e.target.value)}
          />
        </div>
      </div>
      <div>
        <label className="text-xs text-gray-500">Event date (e.g. 12 December 2026)</label>
        <input
          className="w-full border rounded px-3 py-2"
          value={eventDate}
          onChange={(e) => setEventDate(e.target.value)}
        />
      </div>
      <div>
        <label className="text-xs text-gray-500">Certificate template image (PNG)</label>
        <input
          type="file"
          accept="image/png,image/jpeg"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
        />
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {note && <p className="text-xs text-amber-700 bg-amber-50 rounded px-3 py-2">{note}</p>}

      <button
        disabled={busy || !canSubmit}
        onClick={submit}
        className="bg-black text-white rounded px-4 py-2 disabled:opacity-40"
      >
        {busy ? "Saving…" : "Save workshop"}
      </button>
      <p className="text-xs text-gray-500">
        Uses the default certificate layout (same placeholder positions as the current
        template). If this workshop&apos;s artwork puts the name/ID somewhere different,
        it&apos;ll render in the wrong spot until a custom layout is measured in — send me
        the blank template and I&apos;ll measure it.
      </p>
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
      const data = await callAdmin(password, { action: "add-participants", workshop, names });
      onDone(`${data.added} participant(s) added:\n${data.assignedIds.join("\n")}`);
      setSkipped(data.skipped || []);
      setNames("");
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="space-y-3">
      <h2 className="text-lg font-medium">Add participants</h2>
      <select
        className="w-full border rounded px-3 py-2"
        value={workshop}
        onChange={(e) => setWorkshop(e.target.value)}
      >
        <option value="">Select workshop…</option>
        {workshops.map((w) => (
          <option key={w.key} value={w.key}>
            {w.workshopName} ({w.key})
          </option>
        ))}
      </select>
      <textarea
        className="w-full border rounded px-3 py-2 h-40 font-mono text-sm"
        placeholder={
          "One name per line — certificate numbers are assigned automatically:\nFatima Noor\nAli Raza\n\nOr pin a specific number: Name, 12"
        }
        value={names}
        onChange={(e) => setNames(e.target.value)}
      />
      {error && <p className="text-sm text-red-600">{error}</p>}
      {skipped.length > 0 && (
        <div className="text-xs text-amber-700 bg-amber-50 rounded px-3 py-2">
          Skipped {skipped.length} line(s):
          <ul className="list-disc pl-4">
            {skipped.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ul>
        </div>
      )}
      <button
        disabled={busy || !workshop || !names.trim()}
        onClick={submit}
        className="bg-black text-white rounded px-4 py-2 disabled:opacity-40"
      >
        {busy ? "Saving…" : "Save participants"}
      </button>
    </section>
  );
}
