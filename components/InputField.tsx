"use client";

import { forwardRef, useId, useState, type ChangeEvent, type InputHTMLAttributes } from "react";
import type { ZodType } from "zod";

export type InputFieldProps = InputHTMLAttributes<HTMLInputElement> & {
  /** A Zod schema for the field value. Number inputs are parsed as numbers. */
  validationSchema?: ZodType;
  /** Optional external error, for validation performed by the owning form. */
  error?: string;
};

const InputField = forwardRef<HTMLInputElement, InputFieldProps>(function InputField(
  { validationSchema, error, className = "", onChange, onBlur, type = "text", ...props },
  ref,
) {
  const generatedId = useId();
  const [touched, setTouched] = useState(false);
  const [validationError, setValidationError] = useState("");
  const activeError = error || validationError;

  function validate(input: HTMLInputElement) {
    if (!validationSchema) return;
    const value = type === "number"
      ? input.value === "" ? undefined : input.valueAsNumber
      : type === "checkbox"
        ? input.checked
      : type === "file"
        ? input.files?.[0]
          ? { type: input.files[0].type, size: input.files[0].size }
          : undefined
        : input.value;
    const result = validationSchema.safeParse(value);
    setValidationError(result.success ? "" : result.error.issues[0]?.message ?? "Invalid value");
  }

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    onChange?.(event);
    if (touched || type === "file") validate(event.currentTarget);
  }

  return (
    <>
      <input
        {...props}
        id={props.id ?? generatedId}
        ref={ref}
        type={type}
        className={`${className}${activeError ? " border-red-500 focus:border-red-500 focus:ring-red-500/10" : ""}`}
        aria-invalid={activeError ? true : props["aria-invalid"]}
        aria-describedby={activeError ? `${props["aria-describedby"] ?? ""} ${generatedId}-error`.trim() : props["aria-describedby"]}
        onChange={handleChange}
        onBlur={(event) => {
          onBlur?.(event);
          if (type !== "file") {
            setTouched(true);
            validate(event.currentTarget);
          }
        }}
      />
      {activeError && (
        <p id={`${generatedId}-error`} role="alert" className="mt-1 text-xs text-red-400">
          {activeError}
        </p>
      )}
    </>
  );
});

InputField.displayName = "InputField";

export default InputField;
