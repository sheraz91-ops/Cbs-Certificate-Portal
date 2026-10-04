"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import InputField from "@/components/InputField";
import PasswordField from "@/components/PasswordField";
import { getOrganizerSession, loginOrganizer } from "@/features/organizers/api";
import {
  organizerLoginSchema,
  validationMessage,
} from "@/lib/validation/schemas";

export default function OrganizerLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (sessionStorage.getItem("organizer_session") !== "active") return;
    getOrganizerSession()
      .then(() => router.replace("/organizer"))
      .catch(() => sessionStorage.removeItem("organizer_session"));
  }, [router]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsed = organizerLoginSchema.safeParse({ email, password });
    if (!parsed.success) {
      setError(validationMessage(parsed.error));
      return;
    }
    setBusy(true);
    setError("");
    try {
      await loginOrganizer(parsed.data);
      sessionStorage.setItem("organizer_session", "active");
      router.replace("/organizer");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to sign in");
    } finally {
      setPassword("");
      setBusy(false);
    }
  }

  return (
    <main className="hero-bg flex min-h-screen items-center justify-center px-4 py-10">
      <form
        onSubmit={submit}
        className="w-full max-w-md rounded-3xl border border-white/10 bg-navy-950/80 p-5 text-white shadow-2xl backdrop-blur min-[380px]:p-7 sm:p-9"
      >
        <Link
          href="/"
          className="text-xs font-medium text-gold-200 hover:text-gold-100"
        >
          CBS home
        </Link>
        <p className="mt-8 text-xs font-bold uppercase tracking-[0.22em] text-gold-300">
          CBS events
        </p>
        <h1 className="mt-2 font-display text-3xl font-semibold">
          Organizer sign in
        </h1>
        <p className="mt-3 text-sm leading-6 text-navy-100/65">
          Sign in to view attendees and record attendance for the events
          assigned to you.
        </p>
        <label className="mt-7 block text-sm font-medium text-navy-100">
          Email address
          <InputField
            required
            type="email"
            placeholder="Enter email address"
            autoComplete="username"
            value={email}
            validationSchema={organizerLoginSchema.shape.email}
            onChange={(event) => setEmail(event.target.value)}
            className="mt-1.5 h-11 w-full rounded-xl border border-white/15 bg-white/5 px-3 text-sm text-white outline-none focus:border-gold-300"
          />
        </label>
        <label className="mt-4 block text-sm font-medium text-navy-100">
          Password
          <PasswordField
            required
            autoComplete="current-password"
            value={password}
            validationSchema={organizerLoginSchema.shape.password}
            onChange={(event) => setPassword(event.target.value)}
            className="mt-1.5 h-11 w-full rounded-xl border border-white/15 bg-white/5 px-3 text-sm text-white outline-none focus:border-gold-300"
          />
        </label>
        {error && (
          <p
            role="alert"
            className="mt-4 rounded-xl border border-red-400/20 bg-red-400/10 px-3 py-2 text-sm text-red-200"
          >
            {error}
          </p>
        )}
        <button
          type="submit"
          disabled={busy}
          className="mt-6 h-12 w-full rounded-xl bg-gold-400 font-semibold text-navy-950 transition hover:bg-gold-300 disabled:opacity-50"
        >
          {busy ? "Signing in…" : "Sign in"}
        </button>
        <p className="mt-4 text-center text-xs text-navy-100/45">
          Organizer accounts are created by the CBS administrator.
        </p>
      </form>
    </main>
  );
}
