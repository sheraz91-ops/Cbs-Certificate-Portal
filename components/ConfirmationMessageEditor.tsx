"use client";

import { useId, useRef, useState, type ReactNode } from "react";

function safeLink(value: string): string | null {
  try {
    const url = new URL(value);
    if (
      (url.protocol === "http:" || url.protocol === "https:") &&
      url.hostname
    ) {
      return url.href;
    }
    if (url.protocol === "mailto:") return url.href;
  } catch {
    return null;
  }
  return null;
}

export function ConfirmationMessage({ value }: { value: string }) {
  if (!value.trim()) return null;

  const parts = value.split(/(\*\*[^*]+\*\*|\*[^*]+\*|\[[^\]]+\]\([^)]+\))/g);
  const content: ReactNode[] = parts.map((part, index) => {
    const linkMatch = /^\[([^\]]+)\]\(([^)]+)\)$/.exec(part);
    if (linkMatch) {
      const href = safeLink(linkMatch[2]);
      return href ? (
        <a
          key={index}
          href={href}
          target="_blank"
          rel="noreferrer"
          className="font-semibold text-indigo-700 underline underline-offset-2"
        >
          {linkMatch[1]}
        </a>
      ) : (
        part
      );
    }
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={index}>{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith("*") && part.endsWith("*")) {
      return <em key={index}>{part.slice(1, -1)}</em>;
    }
    return part;
  });

  return (
    <div className="mt-4 rounded-2xl border border-indigo-100 bg-indigo-50/70 p-4 text-sm leading-6 text-navy-700">
      <p className="whitespace-pre-wrap">{content}</p>
    </div>
  );
}

export function ConfirmationMessageEditor({
  value,
  onChange,
  theme = "dark",
}: {
  value: string;
  onChange: (value: string) => void;
  theme?: "dark" | "light";
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const editorId = useId();
  const [addingLink, setAddingLink] = useState(false);
  const [linkText, setLinkText] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [linkError, setLinkError] = useState("");
  const dark = theme === "dark";
  const fieldClass = dark
    ? "rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white placeholder:text-slate-500"
    : "rounded-lg border border-navy-200 bg-white px-3 py-2 text-sm text-navy-900 placeholder:text-navy-400";
  const buttonClass = dark
    ? "rounded-md border border-slate-700 px-2.5 py-1.5 text-xs font-semibold text-slate-200 hover:bg-slate-800"
    : "rounded-md border border-navy-200 px-2.5 py-1.5 text-xs font-semibold text-navy-700 hover:bg-navy-50";

  function wrapSelection(before: string, after = before, placeholder: string) {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = value.slice(start, end) || placeholder;
    const next = `${value.slice(0, start)}${before}${selected}${after}${value.slice(end)}`;
    onChange(next);
    requestAnimationFrame(() => {
      textarea.focus();
      const selectionStart = start + before.length;
      textarea.setSelectionRange(
        selectionStart,
        selectionStart + selected.length,
      );
    });
  }

  function showLinkForm() {
    const textarea = textareaRef.current;
    const selected = textarea
      ? value.slice(textarea.selectionStart, textarea.selectionEnd)
      : "";
    setLinkText(selected);
    setLinkUrl("");
    setLinkError("");
    setAddingLink(true);
  }

  function insertLink() {
    const href = safeLink(linkUrl.trim());
    if (!linkText.trim()) {
      setLinkError("Enter link text.");
      return;
    }
    if (!href) {
      setLinkError("Use a valid http, https, or mailto link.");
      return;
    }
    const textarea = textareaRef.current;
    const start = textarea?.selectionStart ?? value.length;
    const end = textarea?.selectionEnd ?? value.length;
    const markdown = `[${linkText.trim()}](${href})`;
    onChange(`${value.slice(0, start)}${markdown}${value.slice(end)}`);
    setAddingLink(false);
    requestAnimationFrame(() => textarea?.focus());
  }

  return (
    <section
      className={`rounded-xl border p-4 ${dark ? "border-slate-800 bg-slate-900/40" : "border-navy-200 bg-navy-50/60"}`}
    >
      <label
        htmlFor={`${editorId}-message`}
        className={`block text-sm font-medium ${dark ? "text-slate-200" : "text-navy-800"}`}
      >
        Message shown after registration
      </label>
      <p
        className={`mt-1 text-xs ${dark ? "text-slate-400" : "text-navy-500"}`}
      >
        This message appears to users after they register for this event. Leave
        it blank to show the standard confirmation only.
      </p>
      <div className="mt-3 flex flex-wrap gap-2" role="toolbar" aria-label="Message formatting">
        <button
          type="button"
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => wrapSelection("**", "**", "bold text")}
          className={buttonClass}
          aria-label="Bold"
        >
          <strong>B</strong>
        </button>
        <button
          type="button"
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => wrapSelection("*", "*", "italic text")}
          className={buttonClass}
          aria-label="Italic"
        >
          <em>I</em>
        </button>
        <button
          type="button"
          onMouseDown={(event) => event.preventDefault()}
          onClick={showLinkForm}
          className={buttonClass}
        >
          Add link
        </button>
      </div>
      {addingLink && (
        <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_2fr_auto]">
          <label className="sr-only" htmlFor={`${editorId}-link-text`}>
            Link text
          </label>
          <input
            id={`${editorId}-link-text`}
            value={linkText}
            onChange={(event) => setLinkText(event.target.value)}
            placeholder="Link text"
            maxLength={200}
            className={fieldClass}
          />
          <label className="sr-only" htmlFor={`${editorId}-link-url`}>
            Link URL
          </label>
          <input
            id={`${editorId}-link-url`}
            type="text"
            value={linkUrl}
            onChange={(event) => setLinkUrl(event.target.value)}
            placeholder="https://example.com"
            maxLength={1000}
            className={fieldClass}
          />
          <button
            type="button"
            onClick={insertLink}
            className="rounded-lg bg-indigo-600 px-3 py-2 text-xs font-semibold text-white hover:bg-indigo-500"
          >
            Insert link
          </button>
          {linkError && (
            <p role="alert" className="text-xs text-red-400 sm:col-span-3">
              {linkError}
            </p>
          )}
        </div>
      )}
      <textarea
        ref={textareaRef}
        id={`${editorId}-message`}
        value={value}
        maxLength={5000}
        onChange={(event) => onChange(event.target.value)}
        rows={5}
        placeholder="Add event-specific instructions, next steps, or a thank-you message."
        className={`mt-3 block w-full resize-y ${fieldClass}`}
      />
      <p className={`mt-1 text-right text-xs ${dark ? "text-slate-500" : "text-navy-500"}`}>
        {value.length}/5000
      </p>
    </section>
  );
}
