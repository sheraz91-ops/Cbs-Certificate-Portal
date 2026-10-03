"use client";

import { useState } from "react";
import InputField, { type InputFieldProps } from "@/components/InputField";

export type PasswordFieldProps = Omit<InputFieldProps, "type">;

export default function PasswordField({
  className = "",
  ...props
}: PasswordFieldProps) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative">
      <InputField
        {...props}
        placeholder={props.placeholder ?? "Enter password"}
        type={visible ? "text" : "password"}
        className={`${className} pr-12`}
      />
      <button
        type="button"
        aria-label={visible ? "Hide password" : "Show password"}
        aria-pressed={visible}
        title={visible ? "Hide password" : "Show password"}
        onClick={() => setVisible((current) => !current)}
        className="absolute right-2 top-1 inline-flex h-11 w-9 items-center justify-center rounded-lg text-slate-400 transition hover:bg-white/5 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
      >
        {visible ? (
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            fill="none"
            className="h-5 w-5"
          >
            <path
              d="M3 3l18 18M10.6 10.7a2 2 0 002.7 2.7M9.9 5.2A10.9 10.9 0 0112 5c5.2 0 8.8 4.2 9.8 6.2a1.8 1.8 0 010 1.6 12 12 0 01-3.1 3.8M6.2 6.3a13.3 13.3 0 00-4 4.9 1.8 1.8 0 000 1.6A10.9 10.9 0 0012 19c1 0 2-.2 2.9-.5"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        ) : (
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            fill="none"
            className="h-5 w-5"
          >
            <path
              d="M2.2 12s3.5-7 9.8-7 9.8 7 9.8 7-3.5 7-9.8 7-9.8-7-9.8-7z"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinejoin="round"
            />
            <circle
              cx="12"
              cy="12"
              r="3"
              stroke="currentColor"
              strokeWidth="1.7"
            />
          </svg>
        )}
      </button>
    </div>
  );
}
