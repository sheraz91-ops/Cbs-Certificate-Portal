"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getWorkshopDetails } from "@/features/workshops/api";
import { useAdminSession } from "@/app/admin/AdminShell";
import type { RegistrationField } from "@/types/workshop";

function formatAnswer(field: RegistrationField, value: string | undefined): string {
  if (value === undefined || value === "") return "—";
  if (field.type === "checkbox") {
    try {
      const parsed: unknown = JSON.parse(value);
      if (Array.isArray(parsed) && parsed.every((item) => typeof item === "string")) {
        return parsed.length ? parsed.join(", ") : "No selection";
      }
    } catch {
      if (value === "true") return "Checked";
      if (value === "false") return "Not checked";
    }
  }
  if (field.type === "matrix") {
    try {
      const parsed: unknown = JSON.parse(value);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        const answers = parsed as Record<string, unknown>;
        return (field.rows ?? [])
          .map((row) => `${row}: ${Array.isArray(answers[row]) ? (answers[row] as string[]).join(", ") || "No selection" : "No selection"}`)
          .join("; ");
      }
    } catch {
      return value;
    }
  }
  if (field.type === "yes_no") return value === "yes" ? "Yes" : value === "no" ? "No" : value;
  return value;
}

function getCheckboxSelections(value: string | undefined): string[] | boolean | null {
  if (value === undefined) return null;
  try {
    const parsed: unknown = JSON.parse(value);
    if (Array.isArray(parsed) && parsed.every((item) => typeof item === "string")) return parsed;
  } catch {
    if (value === "true") return true;
    if (value === "false") return false;
  }
  return null;
}

export default function CollectedEventDataPage() {
  const authenticated = useAdminSession();
  const [selectedKey, setSelectedKey] = useState("");
  const workshopsQuery = useQuery({
    queryKey: ["admin", "workshop-details"],
    queryFn: getWorkshopDetails,
    enabled: authenticated,
  });
  const workshops = workshopsQuery.data ?? [];
  const selectedWorkshop = workshops.find((workshop) => workshop.key === selectedKey) ?? workshops[0];
  const fields = selectedWorkshop?.registrationFields ?? [];
  const participants = selectedWorkshop?.participants ?? [];
  const answersCount = participants.reduce((count, participant) => (
    count + fields.filter((field) => {
      const value = participant.customFields?.[field.key];
      return value !== undefined && value !== "";
    }).length
  ), 0);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-300">
            Admin · Event
          </p>
          <h1 className="mt-2 text-3xl font-bold">Collected Event Data</h1>
          <p className="mt-2 text-sm text-slate-400">
            Review registration answers and see response summaries for each event question.
          </p>
        </div>
        <label className="w-full text-xs font-medium text-slate-300 sm:w-80">
          Select event
          <select
            value={selectedWorkshop?.key ?? ""}
            onChange={(event) => setSelectedKey(event.target.value)}
            disabled={workshopsQuery.isPending || workshops.length === 0}
            className="mt-1.5 h-11 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 text-sm text-slate-100 outline-none focus:border-indigo-500"
          >
            {workshops.length === 0 && <option value="">No events available</option>}
            {workshops.map((workshop) => (
              <option key={workshop.key} value={workshop.key}>
                {workshop.workshopName} · {workshop.eventYear}
              </option>
            ))}
          </select>
        </label>
      </header>

      {workshopsQuery.isError ? (
        <p role="alert" className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {workshopsQuery.error.message}
        </p>
      ) : workshopsQuery.isPending ? (
        <p className="rounded-2xl border border-slate-800 bg-slate-950 px-6 py-10 text-center text-sm text-slate-400">
          Loading collected event data…
        </p>
      ) : !selectedWorkshop ? (
        <p className="rounded-2xl border border-slate-800 bg-slate-950 px-6 py-10 text-center text-sm text-slate-400">
          No events have been created yet.
        </p>
      ) : (
        <>
          <section className="grid gap-3 sm:grid-cols-3">
            {[
              { label: "Registered participants", value: participants.length },
              { label: "Additional questions", value: fields.length },
              { label: "Submitted answers", value: answersCount },
            ].map(({ label, value }) => (
              <article key={label} className="rounded-xl border border-slate-800 bg-slate-950 p-4">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
                <p className="mt-2 text-2xl font-bold tabular-nums text-white">{value}</p>
              </article>
            ))}
          </section>

          {fields.length === 0 ? (
            <p className="rounded-2xl border border-slate-800 bg-slate-950 p-6 text-sm text-slate-400">
              This event has no additional registration questions.
            </p>
          ) : (
            <>
              <section className="rounded-2xl border border-slate-800 bg-slate-950 p-4 sm:p-6">
                <h2 className="text-lg font-semibold text-white">Question statistics</h2>
                <p className="mt-1 text-sm text-slate-400">
                  Percentages use submitted answers; checkbox choices may allow multiple selections.
                </p>
                <div className="mt-4 grid gap-3 lg:grid-cols-2">
                  {fields.map((field) => {
                    const responses = participants.flatMap((participant) => {
                      const value = participant.customFields?.[field.key];
                      return value === undefined || value === "" ? [] : [value];
                    });
                    const yes = responses.filter((value) => value === "yes").length;
                    const no = responses.filter((value) => value === "no").length;
                    const selections = responses.map(getCheckboxSelections);
                    const isYesNo = field.type === "yes_no";
                    const isCheckbox = field.type === "checkbox";
                    const isMatrix = field.type === "matrix";
                    const counts = (field.choices ?? []).map((choice) => ({
                      choice,
                      count: selections.filter((selection) => Array.isArray(selection) && selection.includes(choice)).length,
                    }));

                    return (
                      <article key={field.key} className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <h3 className="font-semibold text-slate-100">{field.label}</h3>
                            <p className="mt-1 text-xs text-slate-500">
                              {field.type ?? "text"} · {responses.length} answered · {participants.length - responses.length} unanswered
                            </p>
                          </div>
                          {isMatrix && (
                            <span className="shrink-0 rounded-full bg-amber-500/10 px-2.5 py-1 text-[11px] font-semibold text-amber-200">
                              Individual answers only
                            </span>
                          )}
                        </div>
                        {responses.length === 0 ? (
                          <p className="mt-4 text-sm text-slate-500">No answers yet.</p>
                        ) : isYesNo ? (
                          <div className="mt-4 grid grid-cols-2 gap-3">
                            {[{ label: "Yes", count: yes }, { label: "No", count: no }].map(({ label, count }) => (
                              <div key={label} className="rounded-lg bg-slate-950 p-3 text-sm text-slate-300">
                                {label}: <strong className="text-white">{count}</strong>
                                <span className="ml-1 text-xs text-slate-500">({Math.round((count / responses.length) * 100)}%)</span>
                              </div>
                            ))}
                          </div>
                        ) : isCheckbox ? (
                          <div className="mt-4 flex flex-wrap gap-2">
                            {field.choices?.length ? counts.map(({ choice, count }) => (
                              <span key={choice} className="rounded-lg bg-slate-950 px-3 py-2 text-sm text-slate-300">
                                {choice}: <strong className="text-white">{count}</strong>
                                <span className="ml-1 text-xs text-slate-500">({Math.round((count / responses.length) * 100)}%)</span>
                              </span>
                            )) : (
                              <>
                                <span className="rounded-lg bg-slate-950 px-3 py-2 text-sm text-slate-300">
                                  Checked: <strong className="text-white">{selections.filter((value) => value === true).length}</strong>
                                </span>
                                <span className="rounded-lg bg-slate-950 px-3 py-2 text-sm text-slate-300">
                                  Not checked: <strong className="text-white">{selections.filter((value) => value === false).length}</strong>
                                </span>
                              </>
                            )}
                          </div>
                        ) : (
                          <p className="mt-4 text-sm text-slate-400">
                            {isMatrix ? "Review individual matrix answers in the table below." : `${new Set(responses).size} distinct text response(s).`}
                          </p>
                        )}
                      </article>
                    );
                  })}
                </div>
              </section>

              <section className="rounded-2xl border border-slate-800 bg-slate-950 p-4 sm:p-6">
                <div className="mb-4">
                  <h2 className="text-lg font-semibold text-white">Registration answers table</h2>
                  <p className="mt-1 text-sm text-slate-400">
                    Each row is a participant; each question is a column. Scroll horizontally to review all answers.
                  </p>
                </div>
                {participants.length === 0 ? (
                  <p className="py-8 text-center text-sm text-slate-400">No participants are registered for this event.</p>
                ) : (
                  <div className="overflow-x-auto rounded-xl border border-slate-800">
                    <table className="w-full min-w-[800px] text-left text-sm">
                      <thead className="bg-slate-900 text-xs uppercase text-slate-400">
                        <tr>
                          <th className="sticky left-0 bg-slate-900 px-4 py-3">Participant</th>
                          <th className="px-4 py-3">User ID</th>
                          {fields.map((field) => (
                            <th key={field.key} className="min-w-48 px-4 py-3">
                              <span className="block normal-case text-slate-200">{field.label}</span>
                              <span className="mt-1 block font-normal lowercase">{field.type ?? "text"}</span>
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800">
                        {participants.map((participant) => (
                          <tr key={`${participant.id}-${participant.name}`} className="align-top">
                            <td className="sticky left-0 bg-slate-950 px-4 py-3 font-medium text-slate-200">
                              {participant.name}
                            </td>
                            <td className="px-4 py-3 font-mono text-xs text-indigo-200">
                              {participant.userId ?? "Legacy record"}
                            </td>
                            {fields.map((field) => (
                              <td key={field.key} className="whitespace-pre-wrap px-4 py-3 text-slate-300">
                                {formatAnswer(field, participant.customFields?.[field.key])}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            </>
          )}
        </>
      )}
    </div>
  );
}
