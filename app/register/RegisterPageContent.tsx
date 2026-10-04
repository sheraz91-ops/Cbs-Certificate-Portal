"use client";

import { useState } from "react";
import EventRegistrationForm from "@/components/EventRegistrationForm";

export default function RegisterPageContent() {
  const [isActiveEvent, setIsActiveEvent] = useState<boolean | null>(null);

  return (
    <section
      className={`mx-auto w-full max-w-6xl px-3 py-7 min-[380px]:px-4 sm:px-6 sm:py-10 lg:gap-10 lg:py-16 ${isActiveEvent === true ? "grid lg:grid-cols-[0.8fr_1.2fr] lg:items-start" : ""}`}
    >
      {isActiveEvent === true && (
        <div className="pt-2 text-white">
          <p className="text-xs font-bold uppercase tracking-[0.25em] text-gold-300">
            Join us
          </p>
          <h1 className="mt-4 font-display text-4xl font-semibold leading-tight sm:text-5xl">
            Take part in a CBS event.
          </h1>
          <p className="mt-5 max-w-lg text-base leading-7 text-navy-100/80">
            Choose an event and share your details to register. CBS creates your
            participant ID and event certificate ID automatically.
          </p>
          <div className="mt-8 rounded-2xl border border-white/10 bg-white/5 p-5">
            <h2 className="text-sm font-semibold text-gold-200">
              What happens next?
            </h2>
            <ol className="mt-3 space-y-2 text-sm leading-6 text-navy-100/75">
              <li>1. Choose an event from the list.</li>
              <li>2. Enter your participant details.</li>
              <li>3. Save the IDs shown after registration.</li>
            </ol>
          </div>
        </div>
      )}
      <div className="w-full flex items-center justify-center">
        <EventRegistrationForm setActiveEvent={setIsActiveEvent} />
      </div>
    </section>
  );
}
