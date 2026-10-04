"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import EventRegistrationForm from "@/components/EventRegistrationForm";
import { getEventByCode } from "@/features/events/api";

export default function RegisterPageContent({ eventCode }: { eventCode?: string }) {
  const [isActiveEvent, setIsActiveEvent] = useState<boolean | null>(null);
  const eventQuery = useQuery({
    queryKey: ["events", "registration", eventCode],
    queryFn: () => getEventByCode(eventCode!),
    enabled: Boolean(eventCode),
    retry: false,
  });
  const pinnedEventStatus = !eventCode
    ? "idle"
    : eventQuery.isPending
      ? "loading"
      : eventQuery.isError || !eventQuery.data
        ? "error"
        : "ready";
  const showEventPanel = Boolean(eventCode) || isActiveEvent === true;

  return (
    <section
      className={`mx-auto grid w-full min-w-0 max-w-6xl grid-cols-1 gap-6 px-3 py-6 min-[380px]:px-4 sm:gap-8 sm:px-6 sm:py-10 lg:gap-10 lg:py-16 ${showEventPanel ? "lg:grid-cols-[0.8fr_1.2fr] lg:items-start" : ""}`}
    >
      {showEventPanel && (
        eventCode ? (
          <aside className="min-w-0 pt-1 text-white lg:sticky lg:top-8">
            {eventQuery.isPending ? (
              <div role="status" className="rounded-2xl border border-white/10 bg-white/5 p-5 text-sm text-navy-100/70">Loading event details…</div>
            ) : eventQuery.isError || !eventQuery.data ? (
              <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-gold-300">Event details</p>
                <h1 className="mt-3 font-display text-2xl font-semibold">Event not found</h1>
                <p className="mt-2 text-sm leading-6 text-navy-100/70">We couldn&apos;t find an event matching code <span className="break-all font-mono">{eventCode}</span>.</p>
              </div>
            ) : (
              <div className="rounded-2xl border border-white/10 bg-white/5 p-5 sm:p-6">
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-gold-300">Event details</p>
                <h1 className="mt-3 break-words font-display text-2xl font-semibold leading-tight min-[380px]:text-3xl sm:text-4xl">{eventQuery.data.workshopFullTitle || eventQuery.data.workshopName}</h1>
                <p className="mt-3 break-words text-sm leading-6 text-navy-100/75">{eventQuery.data.workshopName} · {eventQuery.data.workshopCode} · {eventQuery.data.eventYear}</p>
                <dl className="mt-6 grid grid-cols-2 gap-4 border-t border-white/10 pt-5 text-sm">
                  <div className="min-w-0"><dt className="text-xs text-navy-100/55">Event date</dt><dd className="mt-1 break-words font-medium text-white">{eventQuery.data.eventDate}</dd></div>
                  <div className="min-w-0"><dt className="text-xs text-navy-100/55">Registration</dt><dd className={`mt-1 font-semibold ${eventQuery.data.isActive ? "text-emerald-300" : "text-amber-300"}`}>{eventQuery.data.isActive ? "Open" : "Closed"}</dd></div>
                  <div className="col-span-2 min-w-0"><dt className="text-xs text-navy-100/55">Who can register</dt><dd className="mt-1 break-words font-medium text-white">{eventQuery.data.allowOutsiders ? "Campus and outside participants" : "Campus participants only"}</dd></div>
                </dl>
                <p className="mt-5 rounded-xl border border-white/10 bg-black/10 p-4 text-sm leading-6 text-navy-100/70">{eventQuery.data.isActive ? "Complete the form to reserve your place. CBS will assign your participant and certificate IDs." : "Registration for this event has ended. You can browse the registration page for other open events."}</p>
              </div>
            )}
          </aside>
        ) : (
          <div className="min-w-0 pt-2 text-white">
            <p className="text-xs font-bold uppercase tracking-[0.25em] text-gold-300">Join us</p>
            <h1 className="mt-4 font-display text-3xl font-semibold leading-tight min-[380px]:text-4xl sm:text-5xl">Take part in a CBS event.</h1>
            <p className="mt-5 max-w-lg text-base leading-7 text-navy-100/80">Choose an event and share your details to register. CBS creates your participant ID and event certificate ID automatically.</p>
            <div className="mt-8 rounded-2xl border border-white/10 bg-white/5 p-5">
              <h2 className="text-sm font-semibold text-gold-200">What happens next?</h2>
              <ol className="mt-3 space-y-2 text-sm leading-6 text-navy-100/75"><li>1. Choose an event from the list.</li><li>2. Enter your participant details.</li><li>3. Save the IDs shown after registration.</li></ol>
            </div>
          </div>
        )
      )}
      <div className="flex w-full min-w-0 items-center justify-center">
        <EventRegistrationForm
          setActiveEvent={setIsActiveEvent}
          eventCode={eventCode}
          pinnedEvent={eventQuery.data}
          pinnedEventStatus={pinnedEventStatus}
        />
      </div>
    </section>
  );
}
