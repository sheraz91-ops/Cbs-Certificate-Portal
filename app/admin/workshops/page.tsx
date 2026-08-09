"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

type Participant = { id: string; name: string; workshop: string };
type Workshop = {
  key: string;
  workshopName: string;
  workshopFullTitle: string;
  workshopCode: string;
  eventYear: string;
  eventDate: string;
  templatePath: string;
  participants: Participant[];
};

async function loadWorkshops(password: string) {
  const response = await fetch("/api/admin", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password, action: "workshop-details" }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Unable to load workshops");
  return data.workshops as Workshop[];
}

export default function WorkshopAdminPage() {
  const [password, setPassword] = useState("");
  const [input, setInput] = useState("");
  const [workshops, setWorkshops] = useState<Workshop[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [openWorkshops, setOpenWorkshops] = useState<string[]>([]);
  const [visibleUsers, setVisibleUsers] = useState<Record<string, number>>({});
  const [deletingUser, setDeletingUser] = useState<string | null>(null);
  const [brokenTemplates, setBrokenTemplates] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const saved = sessionStorage.getItem("admin_pw");
    if (saved) {
      setPassword(saved);
      void fetchDetails(saved);
    }
  }, []);

  async function fetchDetails(adminPassword: string) {
    setLoading(true);
    setError(null);
    try {
      setWorkshops(await loadWorkshops(adminPassword));
      setPassword(adminPassword);
      sessionStorage.setItem("admin_pw", adminPassword);
    } catch (err: any) {
      setError(err.message === "Invalid admin password" ? "Enter a valid admin password." : err.message);
      setPassword("");
    } finally {
      setLoading(false);
    }
  }

  async function deleteParticipant(workshop: Workshop, participant: Participant) {
    if (!window.confirm(`Remove ${participant.name} (ID ${participant.id}) from ${workshop.workshopName}?`)) return;

    const deleteKey = `${workshop.key}-${participant.id}-${participant.name}`;
    setDeletingUser(deleteKey);
    setError(null);
    try {
      const response = await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password, action: "delete-participant", workshop: workshop.key, id: participant.id, name: participant.name }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to delete participant");
      setWorkshops((current) => current.map((item) => item.key === workshop.key ? { ...item, participants: item.participants.filter((user) => !(user.id === participant.id && user.name === participant.name)) } : item));
    } catch (err: any) {
      setError(err.message);
    } finally {
      setDeletingUser(null);
    }
  }

  if (!password) {
    return (
      <main className="min-h-screen bg-slate-950 px-4 py-20">
        <div className="mx-auto max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <h1 className="text-xl font-semibold text-white">Workshop details</h1>
          <p className="mt-1 text-sm text-slate-400">Enter the admin password to view workshop and registration data.</p>
          <form onSubmit={(event) => { event.preventDefault(); void fetchDetails(input); }} className="mt-5 space-y-3">
            <input type="password" value={input} onChange={(event) => setInput(event.target.value)} placeholder="Admin password" className="h-11 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 text-white outline-none focus:border-indigo-500" />
            {error && <p className="text-sm text-red-300">{error}</p>}
            <button disabled={loading || !input} className="h-11 w-full rounded-xl bg-indigo-600 text-sm font-semibold text-white disabled:opacity-50">{loading ? "Opening…" : "View workshops"}</button>
          </form>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-10 text-white">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <a href="/admin" className="text-sm text-indigo-300 hover:text-indigo-200">← Back to admin dashboard</a>
            <h1 className="mt-2 text-3xl font-bold">All workshops</h1>
            <p className="mt-1 text-slate-400">Workshop information, certificate templates, and registered participants.</p>
          </div>
          <button onClick={() => void fetchDetails(password)} className="rounded-xl border border-slate-700 px-4 py-2 text-sm font-medium text-slate-200 hover:bg-slate-900">{loading ? "Refreshing…" : "Refresh"}</button>
        </div>
        {error && <p className="mb-5 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</p>}
        <div className="space-y-6">
          {workshops.map((workshop) => (
            <section key={workshop.key} className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900">
              <div className="border-b border-slate-800 p-6">
                <p className="text-xs font-semibold uppercase tracking-widest text-indigo-300">{workshop.key}</p>
                <h2 className="mt-2 text-xl font-semibold">{workshop.workshopName}</h2>
                <p className="mt-1 text-sm text-slate-400">{workshop.workshopFullTitle}</p>
              </div>
              <div className="grid gap-4 p-6 sm:grid-cols-2 lg:grid-cols-4">
                <Info label="Workshop code" value={workshop.workshopCode} />
                <Info label="Event date" value={`${workshop.eventDate} (${workshop.eventYear})`} />
                <Info label="Certificate template" value={workshop.templatePath} />
                <Info label="Registered users" value={String(workshop.participants.length)} />
              </div>
              {workshop.templatePath !== "Not set" && (
                <div className="border-t border-slate-800 p-6">
                  <p className="mb-3 text-sm font-semibold">Certificate template preview</p>
                  {brokenTemplates[workshop.key] ? (
                    <div className="w-fit max-w-full rounded-xl border border-amber-500/20 bg-amber-500/10 p-4 text-sm text-amber-200">
                      <p className="font-semibold">Template image not found</p>
                      <p className="mt-1 text-xs text-amber-200/80">
                        The app tried to load <span className="font-mono">{workshop.templatePath}</span> but the file is missing or the path is wrong.
                      </p>
                    </div>
                  ) : (
                    <a href={workshop.templatePath} target="_blank" rel="noreferrer" className="block w-fit overflow-hidden rounded-xl border border-slate-700 hover:border-indigo-400">
                      <Image
                        src={workshop.templatePath}
                        alt={`${workshop.workshopName} certificate template`}
                        width={1000}
                        height={700}
                        className="max-h-72 w-auto bg-slate-950 object-contain"
                        onError={() => setBrokenTemplates((current) => ({ ...current, [workshop.key]: true }))}
                      />
                    </a>
                  )}
                </div>
              )}
              <div className="border-t border-slate-800 p-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h3 className="font-semibold">Registered users ({workshop.participants.length})</h3>
                  <button
                    type="button"
                    onClick={() => {
                      setOpenWorkshops((current) => current.includes(workshop.key) ? current.filter((key) => key !== workshop.key) : [...current, workshop.key]);
                      setVisibleUsers((current) => ({ ...current, [workshop.key]: current[workshop.key] || 25 }));
                    }}
                    className="rounded-lg border border-indigo-500/40 px-3 py-2 text-xs font-semibold text-indigo-200 hover:bg-indigo-500/10"
                  >
                    {openWorkshops.includes(workshop.key) ? "Hide users" : "Show users"}
                  </button>
                </div>
                {openWorkshops.includes(workshop.key) && <>
                {workshop.participants.length === 0 ? <p className="mt-3 text-sm text-slate-500">No users registered for this workshop.</p> : (
                  <div className="mt-3 overflow-x-auto rounded-xl border border-slate-800">
                    <table className="w-full text-left text-sm"><thead className="bg-slate-950 text-xs uppercase text-slate-400"><tr><th className="px-4 py-3">Certificate ID</th><th className="px-4 py-3">Name</th><th className="px-4 py-3 text-right">Action</th></tr></thead><tbody className="divide-y divide-slate-800">{workshop.participants.slice(0, visibleUsers[workshop.key] || 25).map((participant) => { const deleteKey = `${workshop.key}-${participant.id}-${participant.name}`; return <tr key={`${participant.id}-${participant.name}`}><td className="px-4 py-3 font-mono text-indigo-200">{participant.id}</td><td className="px-4 py-3 text-slate-200">{participant.name}</td><td className="px-4 py-3 text-right"><button type="button" disabled={deletingUser !== null} onClick={() => void deleteParticipant(workshop, participant)} className="rounded-md border border-red-500/30 px-2.5 py-1.5 text-xs font-semibold text-red-300 hover:bg-red-500/10 disabled:opacity-50">{deletingUser === deleteKey ? "Deleting…" : "Delete"}</button></td></tr>; })}</tbody></table>
                  </div>
                )}
                {(visibleUsers[workshop.key] || 25) < workshop.participants.length && <button type="button" onClick={() => setVisibleUsers((current) => ({ ...current, [workshop.key]: (current[workshop.key] || 25) + 25 }))} className="mt-3 rounded-lg border border-slate-700 px-3 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-950">Show 25 more users</button>}
                </>}
              </div>
            </section>
          ))}
          {!loading && workshops.length === 0 && <p className="rounded-xl border border-slate-800 p-5 text-slate-400">No workshops found.</p>}
        </div>
      </div>
    </main>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl bg-slate-950 p-4"><p className="text-xs uppercase tracking-wide text-slate-500">{label}</p><p className="mt-1 break-all text-sm font-medium text-slate-100">{value}</p></div>;
}
