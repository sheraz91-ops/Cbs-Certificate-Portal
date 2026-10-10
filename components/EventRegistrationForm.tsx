"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useMutation, useQuery } from "@tanstack/react-query";
import LoadingSpinner from "@/components/LoadingSpinner";
import UserProfileField from "@/components/UserProfileField";
import {
  getEvents,
  registerForEvent,
  type EventOption,
  type EventRegistrationResult,
} from "@/features/events/api";
import {
  campusRegistrationNumberSchema,
  eventRegistrationSchema,
  validationMessage,
  workshopKeySchema,
} from "@/lib/validation/schemas";
import type { UserProfileInput } from "@/types/user";
import { getPublicUserRegistrationForm } from "@/features/users/registrationFormApi";
import {
  DEFAULT_USER_REGISTRATION_FORM,
  USER_PROFILE_FIELD_KEYS,
} from "@/types/registrationForm";
import type { UserProfileFieldKey } from "@/types/registrationForm";
import { validateUserRegistrationValues } from "@/lib/userRegistrationValidation";
import { validateMatrixSelection } from "@/lib/matrixRegistration";
import { RegistrationMatrixField } from "@/components/RegistrationMatrixField";
import { ConfirmationMessage } from "@/components/ConfirmationMessageEditor";
import { z } from "zod";

function emptyProfile(): UserProfileInput {
  return {
    emailAddress: "",
    fullName: "",
    registrationNumber: "",
    department: "",
    semester: "",
    section: "",
    institute: "",
    whatsappNumber: "",
  };
}

function selectedChoices(value: string): string[] {
  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed) &&
      parsed.every((item) => typeof item === "string")
      ? parsed
      : [];
  } catch {
    return [];
  }
}

export default function EventRegistrationForm({
  setActiveEvent,
  eventCode,
  pinnedEvent,
  pinnedEventStatus = "idle",
}: {
  setActiveEvent: (isActive: boolean | null) => void;
  eventCode?: string;
  pinnedEvent?: EventOption;
  pinnedEventStatus?: "idle" | "loading" | "ready" | "error";
}) {
  const [profile, setProfile] = useState<UserProfileInput>(emptyProfile());
  const [profileCustomFields, setProfileCustomFields] = useState<
    Record<string, string>
  >({});
  const [workshop, setWorkshop] = useState("");
  const [customFields, setCustomFields] = useState<Record<string, string>>({});
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState("");
  const [result, setResult] = useState<
    (EventRegistrationResult & { confirmationMessage?: string }) | null
  >(null);
  const [closedByServer, setClosedByServer] = useState(false);
  const eventsQuery = useQuery({
    queryKey: ["events"],
    queryFn: getEvents,
    enabled: !eventCode,
  });
  const registrationFormQuery = useQuery({
    queryKey: ["user-registration-form"],
    queryFn: getPublicUserRegistrationForm,
  });
  const registerMutation = useMutation({ mutationFn: registerForEvent });
  const events = eventsQuery.data ?? [];
  const selectedEvent =
    pinnedEvent ?? events.find((item) => item.key === workshop);
  const registrationForm =
    registrationFormQuery.data ?? DEFAULT_USER_REGISTRATION_FORM;
  const visibleRegistrationFields = registrationForm.fields.filter((field) =>
    USER_PROFILE_FIELD_KEYS.includes(field.key as UserProfileFieldKey),
  );
  const campusRegistrationField =
    selectedEvent &&
    selectedEvent.allowOutsiders !== true &&
    !visibleRegistrationFields.some(
      (field) => field.key === "registrationNumber",
    )
      ? DEFAULT_USER_REGISTRATION_FORM.fields.find(
          (field) => field.key === "registrationNumber",
        )
      : undefined;
  const displayedProfileFields = campusRegistrationField
    ? [...visibleRegistrationFields, campusRegistrationField]
    : visibleRegistrationFields;
  const effectiveRegistrationForm = campusRegistrationField
    ? { fields: [...registrationForm.fields, campusRegistrationField] }
    : registrationForm;

  useEffect(() => {
    if (eventCode && pinnedEvent) setWorkshop(pinnedEvent.key);
  }, [eventCode, pinnedEvent]);

  useEffect(() => {
    if (eventCode) {
      setActiveEvent(
        pinnedEventStatus === "loading" ? null : Boolean(pinnedEvent?.isActive),
      );
      return;
    }
    if (eventsQuery.isPending) setActiveEvent(null);
    else if (eventsQuery.isSuccess) setActiveEvent(events.length > 0);
    else if (eventsQuery.isError) setActiveEvent(true);
  }, [
    events.length,
    eventsQuery.isError,
    eventsQuery.isPending,
    eventsQuery.isSuccess,
    eventCode,
    pinnedEvent,
    pinnedEventStatus,
    setActiveEvent,
  ]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError("");
    setResult(null);
    setClosedByServer(false);
    const submittedCustomFields = { ...customFields };
    for (const field of selectedEvent?.registrationFields ?? []) {
      if (
        field.type === "matrix" &&
        submittedCustomFields[field.key] === undefined
      )
        submittedCustomFields[field.key] = "{}";
      if (
        field.type === "checkbox" &&
        submittedCustomFields[field.key] === undefined
      ) {
        submittedCustomFields[field.key] = field.choices?.length
          ? "[]"
          : "false";
      }
    }
    const requiredCustomField = selectedEvent?.registrationFields?.find(
      (field) => {
        const value = submittedCustomFields[field.key] ?? "";
        if (field.type === "matrix")
          return Boolean(validateMatrixSelection(field, value));
        return (
          field.required &&
          (field.type === "checkbox"
            ? field.choices?.length
              ? selectedChoices(value || "[]").length === 0
              : value !== "true"
            : !value.trim())
        );
      },
    );
    if (requiredCustomField) {
      const message =
        requiredCustomField.type === "matrix"
          ? (validateMatrixSelection(
              requiredCustomField,
              submittedCustomFields[requiredCustomField.key] ?? "{}",
            ) ?? `${requiredCustomField.label} is invalid`)
          : `${requiredCustomField.label} is required`;
      setFieldErrors((current) => ({
        ...current,
        [requiredCustomField.key]: message,
      }));
      setFormError(message);
      return;
    }
    const validatedForm = validateUserRegistrationValues(
      effectiveRegistrationForm,
      { profile, customFields: profileCustomFields },
      selectedEvent ? selectedEvent.allowOutsiders === true : true,
    );
    if (Object.keys(validatedForm.errors).length) {
      setFieldErrors(validatedForm.errors);
      setFormError(Object.values(validatedForm.errors)[0]);
      return;
    }
    const parsed = eventRegistrationSchema.safeParse({
      ...validatedForm.profile,
      workshop,
      profileCustomFields: validatedForm.customFields,
      customFields: submittedCustomFields,
    });
    if (!parsed.success) {
      const errors: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const key = String(issue.path[0] ?? "form");
        errors[key] ??= issue.message;
      }
      setFieldErrors(errors);
      setFormError(validationMessage(parsed.error));
      return;
    }

    if (selectedEvent && !selectedEvent.allowOutsiders) {
      const registrationNumber = campusRegistrationNumberSchema.safeParse(
        parsed.data.registrationNumber,
      );
      if (!registrationNumber.success) {
        const message =
          registrationNumber.error.issues[0]?.message ??
          "Use the required campus registration number format.";
        setFieldErrors((current) => ({
          ...current,
          registrationNumber: message,
        }));
        setFormError(`Registration Number: ${message}`);
        return;
      }
      parsed.data.registrationNumber = registrationNumber.data;
    }

    setFieldErrors({});
    try {
      const registration = await registerMutation.mutateAsync(parsed.data);
      setResult({
        ...registration,
        confirmationMessage: selectedEvent?.confirmationMessage ?? "",
      });
      setProfile(emptyProfile());
      setProfileCustomFields({});
      setWorkshop("");
      setCustomFields({});
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Unable to complete registration";
      if (eventCode && /registration.*closed|event.*closed/i.test(message)) {
        setClosedByServer(true);
        return;
      }
      setFormError(message);
    }
  }

  if (result) {
    return (
      <div
        role="status"
        className="rounded-3xl border border-emerald-200 bg-white p-5 shadow-card min-[380px]:p-7 sm:p-9"
      >
        <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-2xl font-bold text-emerald-700">
          ✓
        </div>
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-700">
          Registration complete
        </p>
        <h2 className="mt-2 font-display text-2xl font-semibold text-navy-900">
          You’re registered for {result.eventName}
        </h2>
        <p className="mt-3 text-sm leading-6 text-navy-600">
          CBS assigned your IDs. Keep them safe to access your certificate after
          the event.
        </p>
        {result.confirmationMessage && (
          <ConfirmationMessage value={result.confirmationMessage} />
        )}
        <dl className="mt-6 grid gap-3 rounded-2xl bg-navy-50 p-4 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-navy-500">
              CBS Participant ID
            </dt>
            <dd className="mt-1 break-all font-mono font-bold text-navy-900">
              {result.userId}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-navy-500">
              Event Certificate ID
            </dt>
            <dd className="mt-1 break-all font-mono font-bold text-navy-900">
              {result.certificateId}
            </dd>
          </div>
        </dl>
        {eventCode && (
          <Link
            href={`/verify?id=${encodeURIComponent(result.certificateId)}&workshop=${encodeURIComponent(pinnedEvent?.key ?? workshop)}`}
            className="mt-5 inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-navy-800 px-5 py-3 text-center text-sm font-semibold text-white transition hover:bg-navy-700"
          >
            View certificate status
          </Link>
        )}
        {!eventCode && (
          <button
            type="button"
            onClick={() => setResult(null)}
            className="mt-6 text-sm font-semibold text-navy-700 underline underline-offset-4 hover:text-gold-700"
          >
            Register for another event
          </button>
        )}
      </div>
    );
  }

  if (eventCode && pinnedEventStatus === "loading") {
    return (
      <section
        role="status"
        aria-live="polite"
        className="flex min-h-32 w-full items-center justify-center rounded-3xl border border-white/60 bg-white p-5 shadow-card sm:p-8"
      >
        <LoadingSpinner label="Loading event details..." />
      </section>
    );
  }

  if (eventCode && (pinnedEventStatus === "error" || !pinnedEvent)) {
    return (
      <section
        role="status"
        className="rounded-3xl border border-white/60 bg-white p-5 shadow-card sm:p-8"
      >
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-rose-700">
          Registration unavailable
        </p>
        <h2 className="mt-3 font-display text-2xl font-semibold text-navy-900">
          Event not found
        </h2>
        <p className="mt-2 text-sm leading-6 text-navy-600">
          We couldn&apos;t find an event matching this link. Check the event
          code or return to the registration page.
        </p>
        <Link
          href="/register"
          className="mt-5 inline-flex min-h-11 items-center justify-center rounded-xl bg-navy-800 px-5 py-2 text-sm font-semibold text-white hover:bg-navy-700"
        >
          Browse open events
        </Link>
      </section>
    );
  }

  if (eventCode && (pinnedEvent?.isActive === false || closedByServer)) {
    return (
      <section
        role="status"
        className="rounded-3xl border border-amber-200 bg-white p-5 shadow-card sm:p-8"
      >
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-amber-700">
          Registration closed
        </p>
        <h2 className="mt-3 font-display text-2xl font-semibold text-navy-900">
          {pinnedEvent?.isCompleted
            ? "This event is completed"
            : "This event is closed"}
        </h2>
        <p className="mt-2 text-sm leading-6 text-navy-600">
          Registration for {pinnedEvent?.workshopName ?? "this event"} has ended
          {pinnedEvent?.isCompleted
            ? " because the event has been marked completed"
            : ""}
          . You can still review the event details or browse other open events.
        </p>
        <Link
          href="/register"
          className="mt-5 inline-flex min-h-11 items-center justify-center rounded-xl bg-navy-800 px-5 py-2 text-sm font-semibold text-white hover:bg-navy-700"
        >
          Browse open events
        </Link>
      </section>
    );
  }

  if (!eventCode && eventsQuery.isPending) {
    return (
      <section
        role="status"
        aria-live="polite"
        className="flex min-h-20 items-center justify-center rounded-3xl border border-white/60 bg-white w-full p-5 shadow-card min-[380px]:p-7 sm:p-9"
      >
        <LoadingSpinner label="Checking for active events..." />
      </section>
    );
  }

  if (!eventCode && eventsQuery.isSuccess && events.length === 0) {
    return (
      <section
        role="status"
        className="rounded-3xl border border-white/60 bg-white p-5 shadow-card min-[380px]:p-7 sm:p-9"
      >
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-gold-700">
          Registration status
        </p>
        <h2 className="mt-3 font-display text-2xl font-semibold text-navy-900">
          No active event found
        </h2>
        <p className="mt-3 text-sm leading-6 text-navy-600">
          There are no events open for registration right now. Please check back
          soon. New events will appear here when registration opens.
        </p>
        <div className="mt-6 rounded-2xl bg-navy-50 p-4">
          <p className="text-sm font-semibold text-navy-800">What you can do</p>
          <p className="mt-1 text-sm leading-6 text-navy-600">
            Return later to enroll in upcoming events.
          </p>
        </div>
        <Link
          href="/"
          className="mt-6 inline-flex h-11 items-center justify-center rounded-xl bg-navy-800 px-5 text-sm font-semibold text-white transition hover:bg-navy-700"
        >
          Go to home page
        </Link>
      </section>
    );
  }

  return (
    <form
      onSubmit={submit}
      className="rounded-3xl border border-white/60 bg-white p-5 shadow-card min-[380px]:p-6 sm:p-9"
      noValidate
    >
      <div className="mb-6">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-gold-700">
          Event registration
        </p>
        <h2 className="mt-2 font-display text-2xl font-semibold text-navy-900">
          Your details
        </h2>
        <p className="mt-2 text-sm leading-6 text-navy-600">
          Your participant ID is assigned automatically by CBS and cannot be
          changed here.
        </p>
      </div>

      <label
        className="mb-5 block text-sm font-semibold text-navy-800"
        htmlFor="registration-event"
      >
        Select an event <span className="text-red-600">*</span>
        <select
          id="registration-event"
          required
          value={workshop}
          disabled={
            Boolean(eventCode) || eventsQuery.isPending || events.length === 0
          }
          aria-invalid={Boolean(fieldErrors.workshop)}
          aria-describedby={
            fieldErrors.workshop ? "registration-event-error" : undefined
          }
          onChange={(event) => {
            setWorkshop(
              workshopKeySchema.safeParse(event.target.value).success
                ? event.target.value
                : "",
            );
            setCustomFields({});
            setFieldErrors((current) =>
              Object.fromEntries(
                Object.entries(current).filter(
                  ([key]) => !key.startsWith("custom-"),
                ),
              ),
            );
            setFieldErrors((current) => ({ ...current, workshop: "" }));
          }}
          className="mt-2 h-12 w-full rounded-xl border border-navy-200 bg-navy-50 px-4 text-sm font-normal text-navy-900 outline-none transition focus:border-gold-500 focus:ring-4 focus:ring-gold-100 disabled:opacity-60"
        >
          <option value="">
            {eventsQuery.isPending ? "Loading events…" : "Choose an event"}
          </option>
          {(eventCode && pinnedEvent ? [pinnedEvent] : events).map((item) => (
            <option key={item.key} value={item.key}>
              {item.workshopName} · {item.eventYear} · {item.eventDate} ·{" "}
              {item.allowOutsiders ? "Outsiders allowed" : "Campus only"}
            </option>
          ))}
        </select>
        {fieldErrors.workshop && (
          <span
            id="registration-event-error"
            role="alert"
            className="mt-1 block text-xs text-red-600"
          >
            {fieldErrors.workshop}
          </span>
        )}
        {selectedEvent && (
          <span
            className={`mt-2 block text-xs ${selectedEvent.allowOutsiders ? "text-emerald-700" : "text-amber-700"}`}
          >
            {selectedEvent.allowOutsiders
              ? "Outside participants are allowed for this event."
              : "Outside participants are not allowed for this event. Use your campus registration number in YYYY-uam-RRRR format."}
          </span>
        )}
        {eventsQuery.isError && (
          <span role="alert" className="mt-1 block text-xs text-red-600">
            Events could not be loaded. Refresh and try again.
          </span>
        )}
        {!eventsQuery.isPending &&
          !eventsQuery.isError &&
          events.length === 0 && (
            <span className="mt-1 block text-xs text-navy-500">
              There are no events available for registration right now.
            </span>
          )}
      </label>

      <div className="grid gap-4 sm:grid-cols-2">
        {displayedProfileFields.map((field) => {
          const key = field.key as UserProfileFieldKey;
          const required =
            field.required ||
            (key === "registrationNumber" &&
              Boolean(selectedEvent && selectedEvent.allowOutsiders !== true));
          const validationSchema = required
            ? key === "registrationNumber" &&
              Boolean(selectedEvent && selectedEvent.allowOutsiders !== true)
              ? campusRegistrationNumberSchema
              : undefined
            : key === "emailAddress"
              ? z.preprocess(
                  (value) =>
                    typeof value === "string" && !value.trim()
                      ? undefined
                      : value,
                  z.string().email("Invalid format").optional(),
                )
              : z.string().optional();
          return (
            <label
              key={key}
              className="block text-sm font-semibold text-navy-800"
            >
              {field.label}{" "}
              {required ? (
                <span className="text-red-600">*</span>
              ) : (
                <span className="text-xs font-normal text-navy-500">
                  (optional)
                </span>
              )}
              <UserProfileField
                name={key}
                required={required}
                validationSchema={validationSchema}
                registrationMode={
                  selectedEvent?.allowOutsiders ? "free" : "campus"
                }
                autoComplete={
                  key === "emailAddress"
                    ? "email"
                    : key === "whatsappNumber"
                      ? "tel"
                      : "off"
                }
                value={profile[key]}
                onValueChange={(value) => {
                  setProfile((current) => ({ ...current, [key]: value }));
                  setFieldErrors((current) => ({ ...current, [key]: "" }));
                }}
                error={fieldErrors[key]}
                className="mt-2 h-11 w-full rounded-xl border border-navy-200 bg-navy-50/60 px-3 text-sm font-normal text-navy-900 outline-none transition focus:border-gold-500 focus:ring-4 focus:ring-gold-100"
              />
            </label>
          );
        })}
      </div>

      {registrationForm.fields.some((field) =>
        field.key.startsWith("custom-"),
      ) && (
        <div className="mt-5 grid gap-4 border-t border-navy-100 pt-5 sm:grid-cols-2">
          {registrationForm.fields
            .filter((field) => field.key.startsWith("custom-"))
            .map((field) => {
              const value =
                profileCustomFields[field.key] ??
                (field.type === "matrix"
                  ? "{}"
                  : field.type === "checkbox" && field.choices?.length
                    ? "[]"
                    : "");
              const chosen =
                field.type === "checkbox" && field.choices?.length
                  ? selectedChoices(value)
                  : [];
              const updateValue = (nextValue: string) => {
                setProfileCustomFields((current) => ({
                  ...current,
                  [field.key]: nextValue,
                }));
                setFieldErrors((current) => ({ ...current, [field.key]: "" }));
              };
              return (
                <div
                  key={field.key}
                  className={`min-w-0 text-sm font-semibold text-navy-800 ${field.type === "matrix" ? "col-span-full" : ""}`}
                >
                  {field.type !== "matrix" && (
                    <p>
                      {field.label}{" "}
                      {field.required ? (
                        <span className="text-red-600">*</span>
                      ) : (
                        <span className="text-xs font-normal text-navy-500">
                          (optional)
                        </span>
                      )}
                    </p>
                  )}
                  {field.type === "matrix" ? (
                    <RegistrationMatrixField
                      fieldKey={field.key}
                      label={field.label}
                      rows={field.rows ?? []}
                      columns={field.choices ?? []}
                      selectionMode={field.selectionMode ?? "single"}
                      value={value}
                      required={field.required}
                      onChange={updateValue}
                    />
                  ) : field.type === "yes_no" ? (
                    <select
                      value={value}
                      onChange={(event) => updateValue(event.target.value)}
                      className="mt-2 h-11 w-full rounded-xl border border-navy-200 bg-navy-50/60 px-3 text-sm font-normal text-navy-900 outline-none focus:border-gold-500"
                    >
                      <option value="">Choose an answer</option>
                      <option value="yes">Yes</option>
                      <option value="no">No</option>
                    </select>
                  ) : field.type === "checkbox" && field.choices?.length ? (
                    <div className="mt-2 space-y-2 rounded-xl border border-navy-200 bg-navy-50/60 p-3">
                      {field.choices.map((choice) => {
                        const checked = chosen.includes(choice);
                        return (
                          <label
                            key={choice}
                            className="flex items-center gap-2 text-sm font-normal"
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() =>
                                updateValue(
                                  JSON.stringify(
                                    checked
                                      ? chosen.filter((item) => item !== choice)
                                      : field.selectionMode === "single"
                                        ? [choice]
                                        : [...chosen, choice],
                                  ),
                                )
                              }
                            />
                            {choice}
                          </label>
                        );
                      })}
                    </div>
                  ) : field.type === "checkbox" ? (
                    <label className="mt-2 flex min-h-11 items-center gap-2 rounded-xl border border-navy-200 bg-navy-50/60 px-3 text-sm font-normal">
                      <input
                        type="checkbox"
                        checked={value === "true"}
                        onChange={(event) =>
                          updateValue(String(event.target.checked))
                        }
                      />
                      Yes
                    </label>
                  ) : (
                    <input
                      type="text"
                      value={value}
                      maxLength={4000}
                      onChange={(event) => updateValue(event.target.value)}
                      className="mt-2 h-11 w-full rounded-xl border border-navy-200 bg-navy-50/60 px-3 text-sm font-normal text-navy-900 outline-none focus:border-gold-500"
                    />
                  )}
                  {fieldErrors[field.key] && (
                    <p role="alert" className="mt-1 text-xs text-red-600">
                      {fieldErrors[field.key]}
                    </p>
                  )}
                </div>
              );
            })}
        </div>
      )}

      {selectedEvent?.registrationFields?.length ? (
        <div className="mt-5 space-y-4 border-t border-navy-100 pt-5">
          <h3 className="text-sm font-semibold text-navy-800">
            Additional event details
          </h3>
          {selectedEvent.registrationFields.map((field) => {
            const value =
              customFields[field.key] ??
              (field.type === "matrix"
                ? "{}"
                : field.type === "checkbox" && field.choices?.length
                  ? "[]"
                  : "");
            const chosen =
              field.type === "checkbox" && field.choices?.length
                ? selectedChoices(value)
                : [];
            const fieldId = `custom-${field.key}`;
            const controlClass =
              "mt-2 h-11 w-full rounded-xl border border-navy-200 bg-navy-50/60 px-3 text-sm font-normal text-navy-900 outline-none transition focus:border-gold-500 focus:ring-4 focus:ring-gold-100";
            const updateValue = (nextValue: string) => {
              setCustomFields((current) => ({
                ...current,
                [field.key]: nextValue,
              }));
              setFieldErrors((current) => ({ ...current, [field.key]: "" }));
            };
            return (
              <div
                key={field.key}
                className="text-sm font-semibold text-navy-800"
              >
                {field.type === "matrix" ? (
                  <>
                    <RegistrationMatrixField
                      fieldKey={field.key}
                      label={field.label}
                      rows={field.rows ?? []}
                      columns={field.choices ?? []}
                      selectionMode={field.selectionMode ?? "single"}
                      value={value}
                      required={field.required}
                      onChange={updateValue}
                    />
                    {fieldErrors[field.key] && (
                      <p role="alert" className="mt-1 text-xs text-red-600">
                        {fieldErrors[field.key]}
                      </p>
                    )}
                  </>
                ) : field.type === "checkbox" && field.choices?.length ? (
                  <fieldset className="space-y-2">
                    <legend className="text-sm font-semibold text-navy-800">
                      {field.label}
                      {field.required ? (
                        <span className="text-red-600"> *</span>
                      ) : (
                        <span className="ml-1 text-xs font-normal text-navy-500">
                          (optional)
                        </span>
                      )}
                    </legend>
                    {field.choices.map((choice, choiceIndex) => {
                      const choiceId = `${fieldId}-${choiceIndex}`;
                      const checked = chosen.includes(choice);
                      return (
                        <label
                          key={choiceId}
                          htmlFor={choiceId}
                          className="flex min-h-10 items-center gap-3 text-sm font-normal text-navy-800"
                        >
                          <input
                            id={choiceId}
                            type={
                              field.selectionMode === "single"
                                ? "radio"
                                : "checkbox"
                            }
                            name={fieldId}
                            required={
                              field.required && field.selectionMode === "single"
                            }
                            checked={checked}
                            onChange={(event) => {
                              const next =
                                field.selectionMode === "single"
                                  ? [choice]
                                  : event.target.checked
                                    ? [...chosen, choice]
                                    : chosen.filter((item) => item !== choice);
                              updateValue(JSON.stringify(next));
                            }}
                            className="h-4 w-4 rounded border-navy-300 accent-navy-800 focus:ring-gold-500"
                          />
                          {choice}
                        </label>
                      );
                    })}
                  </fieldset>
                ) : field.type === "checkbox" ? (
                  <label
                    htmlFor={fieldId}
                    className="flex min-h-11 items-center gap-3"
                  >
                    <input
                      id={fieldId}
                      type="checkbox"
                      required={field.required}
                      checked={value === "true"}
                      onChange={(event) =>
                        updateValue(event.target.checked ? "true" : "false")
                      }
                      aria-invalid={Boolean(fieldErrors[field.key])}
                      className="h-4 w-4 rounded border-navy-300 accent-navy-800 focus:ring-gold-500"
                    />
                    <span>
                      {field.label}
                      {field.required ? (
                        <span className="text-red-600"> *</span>
                      ) : (
                        <span className="ml-1 text-xs font-normal text-navy-500">
                          (optional)
                        </span>
                      )}
                    </span>
                  </label>
                ) : (
                  <label htmlFor={fieldId} className="block">
                    {field.label}
                    {field.required ? (
                      <span className="text-red-600"> *</span>
                    ) : (
                      <span className="ml-1 text-xs font-normal text-navy-500">
                        (optional)
                      </span>
                    )}
                    {field.type === "yes_no" ? (
                      <select
                        id={fieldId}
                        required={field.required}
                        value={value}
                        onChange={(event) => updateValue(event.target.value)}
                        aria-invalid={Boolean(fieldErrors[field.key])}
                        className={controlClass}
                      >
                        <option value="">Choose an answer</option>
                        <option value="yes">Yes</option>
                        <option value="no">No</option>
                      </select>
                    ) : (
                      <input
                        id={fieldId}
                        type="text"
                        required={field.required}
                        maxLength={1000}
                        value={value}
                        onChange={(event) => updateValue(event.target.value)}
                        aria-invalid={Boolean(fieldErrors[field.key])}
                        className={controlClass}
                      />
                    )}
                  </label>
                )}
                {fieldErrors[field.key] && (
                  <span
                    role="alert"
                    className="mt-1 block text-xs text-red-600"
                  >
                    {fieldErrors[field.key]}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      ) : null}

      {formError && (
        <p
          role="alert"
          className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {formError}
        </p>
      )}
      {registrationFormQuery.isError && (
        <p role="alert" className="mt-4 text-sm text-red-600">
          Registration form settings could not be loaded. Refresh the page and
          try again.
        </p>
      )}

      <button
        type="submit"
        disabled={
          registerMutation.isPending ||
          registrationFormQuery.isPending ||
          registrationFormQuery.isError ||
          (eventCode
            ? !pinnedEvent || pinnedEventStatus !== "ready" || !workshop
            : eventsQuery.isPending || events.length === 0)
        }
        className="mt-6 h-12 w-full rounded-xl bg-navy-800 px-5 text-sm font-semibold text-white shadow-gold transition hover:bg-navy-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {registerMutation.isPending ? "Registering…" : "Register for event"}
      </button>
      <p className="mt-4 text-center text-xs leading-5 text-navy-500">
        Your CBS Participant ID and Certificate ID are assigned by the system
        after successful registration.
      </p>
    </form>
  );
}
