"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getEventParticipants,
  getOrganizerEvents,
  getOrganizerSession,
  logoutOrganizer,
  syncAttendance,
  updateAttendance,
} from "@/features/organizers/api";

function isAttendanceDraft(value: unknown): value is Record<string, boolean> {
  return Boolean(
    value &&
      typeof value === "object" &&
      !Array.isArray(value) &&
      Object.values(value).every((attendance) => typeof attendance === "boolean"),
  );
}

export default function OrganizerDashboardPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [authenticated, setAuthenticated] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);
  const [fullName, setFullName] = useState("");
  const [workshop, setWorkshop] = useState("");
  const [participantSearch, setParticipantSearch] = useState("");
  const [attendanceError, setAttendanceError] = useState("");
  const [localMode, setLocalMode] = useState(false);
  const [localDraftWorkshop, setLocalDraftWorkshop] = useState("");
  const [localAttendanceDraft, setLocalAttendanceDraft] = useState<Record<string, boolean>>({});
  const eventsQuery = useQuery({
    queryKey: ["organizer", "events"],
    queryFn: getOrganizerEvents,
    enabled: authenticated,
  });
  const participantsQuery = useQuery({
    queryKey: ["organizer", "participants", workshop],
    queryFn: () => getEventParticipants(workshop),
    enabled: authenticated && Boolean(workshop),
  });
  const attendanceMutation = useMutation({
    mutationFn: (input: { participantId: string; present: boolean }) =>
      updateAttendance(workshop, input.participantId, input.present),
    onSuccess: async () => {
      setAttendanceError("");
      await queryClient.invalidateQueries({
        queryKey: ["organizer", "participants", workshop],
      });
    },
    onError: (error) => setAttendanceError(error.message),
  });
  const syncAttendanceMutation = useMutation({
    mutationFn: (input: { workshop: string; attendance: { participantId: string; present: boolean }[] }) =>
      syncAttendance(input.workshop, input.attendance),
    onSuccess: async (_result, input) => {
      let clearError = "";
      try {
        localStorage.removeItem(`organizer-attendance:${input.workshop}`);
      } catch (error) {
        clearError =
          error instanceof Error
            ? `Attendance synced, but the local queue could not be cleared: ${error.message}`
            : "Attendance synced, but the local queue could not be cleared.";
      }
      if (localDraftWorkshop === input.workshop) setLocalAttendanceDraft({});
      setLocalMode(false);
      setAttendanceError(clearError);
      await queryClient.invalidateQueries({
        queryKey: ["organizer", "participants", input.workshop],
      });
    },
    onError: (error) => setAttendanceError(error.message),
  });

  useEffect(() => {
    if (sessionStorage.getItem("organizer_session") !== "active") {
      router.replace("/organizer/login");
      return;
    }
    getOrganizerSession()
      .then((session) => {
        setFullName(session.fullName);
        setAuthenticated(true);
      })
      .catch(() => {
        sessionStorage.removeItem("organizer_session");
        router.replace("/organizer/login");
      })
      .finally(() => setSessionReady(true));
  }, [router]);

  useEffect(() => {
    const availableEvents = eventsQuery.data ?? [];
    if (!availableEvents.some((event) => event.key === workshop))
      setWorkshop(availableEvents[0]?.key ?? "");
  }, [eventsQuery.data, workshop]);

  useEffect(() => {
    if (!workshop) return;
    setLocalMode(false);
    setLocalDraftWorkshop(workshop);
    try {
      const saved = localStorage.getItem(`organizer-attendance:${workshop}`);
      const parsed: unknown = saved ? JSON.parse(saved) : {};
      if (!isAttendanceDraft(parsed)) {
        throw new Error("The saved local attendance data is invalid.");
      }
      setLocalAttendanceDraft(parsed);
      setAttendanceError("");
    } catch (error) {
      setLocalAttendanceDraft({});
      setAttendanceError(
        error instanceof Error
          ? `Could not load local attendance: ${error.message}`
          : "Could not load local attendance.",
      );
    }
  }, [workshop]);

  async function signOut() {
    try {
      await logoutOrganizer();
    } catch {
      /* Clear the local marker if the server cannot be reached. */
    }
    sessionStorage.removeItem("organizer_session");
    queryClient.removeQueries({ queryKey: ["organizer"] });
    router.replace("/organizer/login");
  }

  if (!sessionReady || !authenticated)
    return (
      <main className="hero-bg flex min-h-screen items-center justify-center text-sm text-white/70">
        Loading organizer workspace…
      </main>
    );
  const events = eventsQuery.data ?? [];
  const selectedEvent = events.find((event) => event.key === workshop);
  const activeLocalDraft =
    localDraftWorkshop === workshop ? localAttendanceDraft : {};
  const participants = (participantsQuery.data ?? []).map((participant) => ({
    ...participant,
    serverAttendance: participant.attendance,
    attendance: Object.prototype.hasOwnProperty.call(activeLocalDraft, participant.participantId)
      ? activeLocalDraft[participant.participantId]
      : participant.attendance,
  }));
  const pendingAttendance = Object.entries(activeLocalDraft).map(([participantId, present]) => ({
    participantId,
    present,
  }));
  const normalizedSearch = participantSearch.trim().toLocaleLowerCase();
  const filteredParticipants = normalizedSearch
    ? participants.filter((participant) => {
        const searchableValues = [
          participant.name,
          participant.userId,
          participant.participantId,
          participant.user?.registrationNumber,
          participant.user?.department,
          participant.user?.semester,
          participant.user?.section,
          participant.user?.institute,
          participant.user?.emailAddress,
          participant.user?.whatsappNumber,
          participant.attendance ? "present" : "absent",
        ];
        return searchableValues.some((value) =>
          value?.toLocaleLowerCase().includes(normalizedSearch),
        );
      })
    : participants;
  const hasSingleSearchResult =
    Boolean(normalizedSearch) && filteredParticipants.length === 1;
  const presentCount = participants.filter(
    (participant) => participant.attendance,
  ).length;

  function changeAttendance(participantId: string, serverAttendance: boolean, present: boolean) {
    if (!localMode) {
      attendanceMutation.mutate({ participantId, present });
      return;
    }
    const nextDraft = { ...activeLocalDraft };
    if (present === serverAttendance) delete nextDraft[participantId];
    else nextDraft[participantId] = present;
    try {
      localStorage.setItem(`organizer-attendance:${workshop}`, JSON.stringify(nextDraft));
    } catch (error) {
      setAttendanceError(
        error instanceof Error
          ? `Could not save attendance locally: ${error.message}`
          : "Could not save attendance locally.",
      );
      return;
    }
    setLocalAttendanceDraft(nextDraft);
    setAttendanceError("");
  }

  function pushLocalAttendance() {
    if (!workshop || pendingAttendance.length === 0) return;
    syncAttendanceMutation.mutate({ workshop, attendance: pendingAttendance });
  }

  return (
    <main className="min-h-screen bg-slate-100 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6 sm:py-4 lg:px-8">
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-indigo-600">
              CBS organizer workspace
            </p>
            <h1 className="mt-1 break-words text-lg font-semibold sm:text-xl">
              Welcome, {fullName}
            </h1>
          </div>
          <button
            type="button"
            onClick={() => void signOut()}
            className="min-h-10 shrink-0 rounded-xl border border-gold-500 hover:bg-gold-100 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50s sm:px-4 w-full sm:w-auto self-end"
          >
            Sign out
          </button>
        </div>
      </header>
      <div className="mx-auto max-w-7xl space-y-4 px-3 py-5 sm:space-y-6 sm:px-6 sm:py-8 lg:px-8">
        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold">Event attendees</h2>
              <p className="mt-1 text-sm text-slate-500">
                Attendance starts as absent. Mark each participant present or
                absent below.
              </p>
            </div>
            <label className="w-full min-w-0 text-xs font-semibold uppercase tracking-wide text-slate-500 sm:w-72">
              Assigned event
              <select
                value={workshop}
                onChange={(event) => {
                  setWorkshop(event.target.value);
                  setParticipantSearch("");
                }}
                disabled={eventsQuery.isPending || events.length === 0 || attendanceMutation.isPending || syncAttendanceMutation.isPending}
                className="mt-1.5 h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-medium normal-case tracking-normal text-slate-900 outline-none focus:border-indigo-500"
              >
                {events.length === 0 && (
                  <option value="">No events assigned</option>
                )}
                {events.map((item) => (
                  <option key={item.key} value={item.key}>
                    {item.workshopName} · {item.eventYear}
                  </option>
                ))}
              </select>
            </label>
          </div>
          {selectedEvent?.allowLocalAttendance && (
            <div className="mt-5 rounded-xl border border-indigo-100 bg-indigo-50/70 p-4">
              <label className="flex cursor-pointer items-start gap-3 text-sm text-slate-800">
                <input
                  type="checkbox"
                  checked={localMode}
                  onChange={(event) => setLocalMode(event.target.checked)}
                  disabled={syncAttendanceMutation.isPending}
                  className="mt-0.5 accent-indigo-600"
                />
                <span>
                  <span className="block font-semibold">
                    Save attendance locally on this device
                  </span>
                  <span className="mt-1 block text-xs text-slate-600">
                    Changes are saved in this browser and will not reach the
                    database until you push them.
                  </span>
                </span>
              </label>
              <div className="mt-3 flex flex-wrap items-center gap-3 w-full justify-between">
                <span className="text-sm text-slate-700">
                  {pendingAttendance.length} unsynced attendance change(s)
                </span>
                {pendingAttendance.length > 0 && (
                  <button
                    type="button"
                    onClick={pushLocalAttendance}
                    disabled={syncAttendanceMutation.isPending || !selectedEvent.allowLocalAttendance}
                    className="min-h-10 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {syncAttendanceMutation.isPending
                      ? "Pushing attendance…"
                      : "Push attendance to database"}
                  </button>
                )}
              </div>
              {pendingAttendance.length > 0 && !localMode && (
                <p className="mt-2 text-xs text-amber-800">
                  Turn local saving back on or push these changes before making
                  direct database updates.
                </p>
              )}
            </div>
          )}
          {!selectedEvent?.allowLocalAttendance && pendingAttendance.length > 0 && (
            <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              {pendingAttendance.length} local attendance change(s) are waiting.
              An administrator must allow local attendance for this event before
              you can push them.
            </p>
          )}
          {eventsQuery.isError && (
            <p role="alert" className="mt-5 text-sm text-red-600">
              {eventsQuery.error.message}
            </p>
          )}
          {events.length > 0 && (
            <div className="mt-6 flex flex-wrap gap-3 text-sm">
              <span className="rounded-full bg-slate-100 px-3 py-1.5 text-slate-600">
                {participants.length} participants
              </span>
              <span className="rounded-full bg-emerald-50 px-3 py-1.5 text-emerald-700">
                {presentCount} present
              </span>
              <span className="rounded-full bg-rose-50 px-3 py-1.5 text-rose-700">
                {participants.length - presentCount} absent
              </span>
            </div>
          )}
          {attendanceError && (
            <p
              role="alert"
              className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700"
            >
              {attendanceError}
            </p>
          )}
          {participants.length > 0 && (
            <label className="mt-5 block max-w-xl text-xs font-semibold text-slate-600">
              Search participants
              <input
                type="search"
                value={participantSearch}
                onChange={(event) => setParticipantSearch(event.target.value)}
                placeholder="Name, CBS ID, registration, department, contact, attendance…"
                className="mt-1.5 h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-normal text-slate-900 outline-none placeholder:text-slate-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
              />
            </label>
          )}
          {participantsQuery.isPending && workshop ? (
            <p className="py-12 text-center text-sm text-slate-500">
              Loading participants…
            </p>
          ) : participantsQuery.isError ? (
            <p role="alert" className="py-10 text-center text-sm text-red-600">
              {participantsQuery.error.message}
            </p>
          ) : events.length === 0 ? (
            <p className="py-12 text-center text-sm text-slate-500">
              No open events are assigned. Events are removed from organizer access after completion.
            </p>
          ) : participants.length === 0 ? (
            <p className="py-12 text-center text-sm text-slate-500">
              No participants are registered for this event yet.
            </p>
          ) : filteredParticipants.length === 0 ? (
            <p className="py-12 text-center text-sm text-slate-500">
              No participants match “{participantSearch.trim()}”.
            </p>
          ) : (
            <>
              <div className="mt-5 space-y-3 lg:hidden">
                {filteredParticipants.map((participant) => (
                  <article
                    key={participant.participantId}
                    className={`rounded-xl border bg-white ${
                      hasSingleSearchResult
                        ? "border-indigo-200 p-5 shadow-md ring-1 ring-indigo-100 min-[420px]:p-6"
                        : "border-slate-200 p-4"
                    }`}
                  >
                    <div className="flex min-w-0 items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p
                          className={`break-words font-semibold text-slate-900 ${
                            hasSingleSearchResult ? "text-xl" : ""
                          }`}
                        >
                          {participant.name}
                        </p>
                        <p
                          className={`mt-1 break-all font-mono text-slate-600 ${
                            hasSingleSearchResult ? "text-sm" : "text-xs"
                          }`}
                        >
                          {participant.userId}
                        </p>
                      </div>
                      <span
                        className={`shrink-0 rounded-full px-2.5 py-1 font-semibold ${
                          hasSingleSearchResult
                            ? "text-sm"
                            : "text-xs"
                        } ${participant.attendance ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"}`}
                      >
                        {participant.attendance ? "Present" : "Absent"}
                      </span>
                    </div>
                    <dl
                      className={`mt-4 grid grid-cols-1 gap-3 border-t border-slate-100 pt-3 min-[420px]:grid-cols-2 ${
                        hasSingleSearchResult ? "text-sm" : "text-xs"
                      }`}
                    >
                      <div className="min-w-0">
                        <dt className={`font-semibold text-slate-500 ${hasSingleSearchResult ? "text-xs" : ""}`}>
                          Registration
                        </dt>
                        <dd className="mt-1 break-words text-slate-800">
                          {participant.user?.registrationNumber ?? "—"}
                        </dd>
                      </div>
                      <div className="min-w-0">
                        <dt className={`font-semibold text-slate-500 ${hasSingleSearchResult ? "text-xs" : ""}`}>
                          Department / semester
                        </dt>
                        <dd className="mt-1 break-words text-slate-800">
                          {participant.user
                            ? `${participant.user.department} · ${participant.user.semester}`
                            : "—"}
                        </dd>
                      </div>
                      <div className="min-w-0">
                        <dt className={`font-semibold text-slate-500 ${hasSingleSearchResult ? "text-xs" : ""}`}>
                          Contact
                        </dt>
                        <dd className="mt-1 break-all text-slate-700">
                          {participant.user?.emailAddress ?? "—"}
                        </dd>
                        <dd className="mt-1 break-all text-slate-600">
                          {participant.user?.whatsappNumber ?? ""}
                        </dd>
                      </div>
                      <div className="min-w-0">
                        <dt className={`font-semibold text-slate-500 ${hasSingleSearchResult ? "text-xs" : ""}`}>
                          Event ID
                        </dt>
                        <dd className="mt-1 break-all font-mono text-slate-700">
                          {participant.participantId}
                        </dd>
                      </div>
                    </dl>
                    <div className="mt-4 grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        aria-label={`Mark ${participant.name} present`}
                        disabled={
                          attendanceMutation.isPending ||
                          syncAttendanceMutation.isPending ||
                          (pendingAttendance.length > 0 && !localMode) ||
                          participant.attendance
                        }
                        onClick={() => changeAttendance(participant.participantId, participant.serverAttendance, true)}
                        className={`rounded-lg border border-emerald-200 px-3 py-2 text-sm font-semibold text-emerald-700 hover:bg-emerald-50 disabled:opacity-40 ${hasSingleSearchResult ? "min-h-12" : "min-h-11"}`}
                      >
                        Present
                      </button>
                      <button
                        type="button"
                        aria-label={`Mark ${participant.name} absent`}
                        disabled={
                          attendanceMutation.isPending ||
                          syncAttendanceMutation.isPending ||
                          (pendingAttendance.length > 0 && !localMode) ||
                          !participant.attendance
                        }
                        onClick={() => changeAttendance(participant.participantId, participant.serverAttendance, false)}
                        className={`rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-40 ${hasSingleSearchResult ? "min-h-12" : "min-h-11"}`}
                      >
                        Absent
                      </button>
                    </div>
                  </article>
                ))}
              </div>
              <div className="mt-5 hidden overflow-x-auto rounded-xl border border-slate-200 lg:block">
                <table className="w-full min-w-[1050px] text-left text-sm">
                  <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-4 py-3">Participant</th>
                      <th className="px-4 py-3">CBS ID</th>
                      <th className="px-4 py-3">Registration</th>
                      <th className="px-4 py-3">Department / semester</th>
                      <th className="px-4 py-3">Contact</th>
                      <th className="px-4 py-3">Attendance</th>
                      <th className="px-4 py-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {filteredParticipants.map((participant) => (
                      <tr key={participant.participantId}>
                        <td className="px-4 py-4">
                          <p className="font-semibold text-slate-900">
                            {participant.name}
                          </p>
                          <p className="mt-1 text-xs text-slate-500">
                            {participant.user?.section || ""}
                            {participant.user?.institute
                              ? ` · ${participant.user.institute}`
                              : ""}
                          </p>
                        </td>
                        <td className="px-4 py-4">
                          <p className="font-mono text-xs text-slate-700">
                            {participant.userId}
                          </p>
                          <p className="mt-1 text-xs text-slate-500">
                            Event ID {participant.participantId}
                          </p>
                        </td>
                        <td className="px-4 py-4 text-slate-700">
                          {participant.user?.registrationNumber ?? "—"}
                        </td>
                        <td className="px-4 py-4 text-slate-700">
                          {participant.user
                            ? `${participant.user.department} · ${participant.user.semester}`
                            : "—"}
                        </td>
                        <td className="px-4 py-4 text-xs text-slate-600">
                          <p>{participant.user?.emailAddress ?? "—"}</p>
                          <p className="mt-1">
                            {participant.user?.whatsappNumber ?? ""}
                          </p>
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-2">
                            <span
                              className={`min-w-16 rounded-full px-2.5 py-1 text-center text-xs font-semibold ${participant.attendance ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"}`}
                            >
                              {participant.attendance ? "Present" : "Absent"}
                            </span>
                           
                          </div>
                        </td>
                                             <td className="px-4 py-4 text-xs text-slate-600">

                          <div className="flex flex-wrap gap-2">
                             <button
                              type="button"
                              aria-label={`Mark ${participant.name} present`}
                              disabled={
                                attendanceMutation.isPending ||
                                syncAttendanceMutation.isPending ||
                                (pendingAttendance.length > 0 && !localMode) ||
                                participant.attendance
                              }
                              onClick={() => changeAttendance(participant.participantId, participant.serverAttendance, true)}
                              className="rounded-lg border border-emerald-200 px-2.5 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-50 disabled:opacity-40"
                            >
                              Present
                            </button>
                            <button
                              type="button"
                              aria-label={`Mark ${participant.name} absent`}
                              disabled={
                                attendanceMutation.isPending ||
                                syncAttendanceMutation.isPending ||
                                (pendingAttendance.length > 0 && !localMode) ||
                                !participant.attendance
                              }
                              onClick={() => changeAttendance(participant.participantId, participant.serverAttendance, false)}
                              className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-40"
                            >
                              Absent
                            </button>
                            </div>
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
    </main>
  );
}
