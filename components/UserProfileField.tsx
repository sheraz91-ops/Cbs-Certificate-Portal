"use client";

import { useId, useState, type ChangeEvent, type InputHTMLAttributes } from "react";
import InputField from "@/components/InputField";
import { formatCnic, formatRegistrationNumber } from "@/lib/inputMasks";
import { campusRegistrationNumberSchema, userProfileSchema } from "@/lib/validation/schemas";
import type { UserProfileInput } from "@/types/user";

type ProfileFieldName = keyof UserProfileInput;
type Props = {
  name: ProfileFieldName;
  value: string;
  onValueChange: (value: string) => void;
  className: string;
  required?: boolean;
  autoComplete?: InputHTMLAttributes<HTMLInputElement>["autoComplete"];
  error?: string;
  registrationMode?: "campus" | "free";
};

const semesters = ["1", "2", "3", "4", "5", "6", "7", "8", "Graduated"];
const sections = ["A", "B", "C", "D", "E", "F"];
const labels: Record<ProfileFieldName, string> = {
  emailAddress: "Email Address",
  fullName: "Full Name",
  registrationNumber: "Registration Number",
  department: "Department",
  semester: "Semester",
  section: "Section",
  institute: "Institute",
  whatsappNumber: "WhatsApp Number",
  cnic: "CNIC",
};

export default function UserProfileField({ name, value, onValueChange, className, required, autoComplete, error, registrationMode = "campus" }: Props) {
  const id = useId();
  const [selectError, setSelectError] = useState("");
  const common = {
    id,
    required,
    value,
    "aria-invalid": Boolean(error),
    "aria-describedby": error ? `${id}-error` : undefined,
    onChange: (event: ChangeEvent<HTMLInputElement>) => onValueChange(event.target.value),
    className,
  };

  if (name === "semester" || name === "section") {
    const options = name === "semester" ? semesters : sections;
    return (
      <>
        <select
          id={id}
          required={required}
          value={value}
          aria-invalid={Boolean(error || selectError)}
          aria-describedby={error || selectError ? `${id}-error` : undefined}
          onChange={(event) => {
            onValueChange(event.target.value);
            setSelectError("");
          }}
          onBlur={() => {
            const parsed = userProfileSchema.shape[name].safeParse(value);
            setSelectError(parsed.success ? "" : parsed.error.issues[0]?.message ?? "Invalid format");
          }}
          onInvalid={() => setSelectError("Required")}
          className={`${className}${error || selectError ? " border-red-500 focus:border-red-500" : ""}`}
        >
          <option value="">Select {labels[name]}</option>
          {options.map((option) => <option key={option} value={option}>{option}</option>)}
        </select>
        {(error || selectError) && <p id={`${id}-error`} role="alert" className="mt-1 text-xs text-red-400">{error || selectError}</p>}
      </>
    );
  }

  const type = name === "emailAddress" ? "email" : name === "whatsappNumber" ? "tel" : "text";
  if (name === "registrationNumber" && registrationMode === "campus") {
    return <InputField {...common} type="text" inputMode="numeric" maxLength={13} placeholder="____-uam-____" autoComplete="off" validationSchema={campusRegistrationNumberSchema} value={formatRegistrationNumber(value)} onChange={(event) => onValueChange(formatRegistrationNumber(event.target.value))} />;
  }
  if (name === "cnic") {
    return <InputField {...common} type="text" inputMode="numeric" maxLength={15} placeholder="_____-_______-_" autoComplete="off" validationSchema={userProfileSchema.shape.cnic} value={formatCnic(value)} onChange={(event) => onValueChange(formatCnic(event.target.value))} />;
  }
  const placeholders: Record<ProfileFieldName, string> = {
    emailAddress: "Enter email address",
    fullName: "Enter full name",
    registrationNumber: "Enter registration number",
    department: "Enter department",
    semester: "",
    section: "",
    institute: "Enter institute",
    whatsappNumber: "Enter WhatsApp number",
    cnic: "",
  };
  return <InputField {...common} type={type} autoComplete={autoComplete} placeholder={placeholders[name] || undefined} validationSchema={userProfileSchema.shape[name]} />;
}
