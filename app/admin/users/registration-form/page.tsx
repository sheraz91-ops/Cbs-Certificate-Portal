"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import InputField from "@/components/InputField";
import { useAdminSession, useAdminToast } from "../../AdminShell";
import { getAdminUserRegistrationForm, saveAdminUserRegistrationForm } from "@/features/users/registrationFormApi";
import { DEFAULT_USER_REGISTRATION_FORM, USER_PROFILE_FIELD_KEYS, type UserProfileFieldKey, type UserRegistrationField, type UserRegistrationFormConfig } from "@/types/registrationForm";
import { userRegistrationFormConfigSchema, validationMessage } from "@/lib/validation/schemas";

const labels: Record<UserProfileFieldKey, string> = {
  emailAddress: "Email Address",
  fullName: "Full Name",
  registrationNumber: "Registration Number",
  department: "Department",
  semester: "Semester",
  section: "Section",
  institute: "Institute",
  whatsappNumber: "WhatsApp Number",
};

const inputClass = "mt-1.5 h-10 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 text-sm text-slate-100 outline-none focus:border-indigo-500";

function newFieldKey(label: string, fields: UserRegistrationField[]) {
  const root = label.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60).replace(/-$/, "") || "field";
  let key = `custom-${root}`;
  let suffix = 2;
  while (fields.some((field) => field.key === key)) key = `custom-${root}-${suffix++}`;
  return key;
}

export default function RegistrationFormSettingsPage() {
  const authenticated = useAdminSession();
  const toast = useAdminToast();
  const queryClient = useQueryClient();
  const formQuery = useQuery({ queryKey: ["admin", "user-registration-form"], queryFn: getAdminUserRegistrationForm, enabled: authenticated });
  const [draft, setDraft] = useState<UserRegistrationFormConfig>(DEFAULT_USER_REGISTRATION_FORM);
  const [label, setLabel] = useState("");
  const [fieldType, setFieldType] = useState<UserRegistrationField["type"]>("text");
  const [choices, setChoices] = useState("");
  const [rows, setRows] = useState("");
  const [selectionMode, setSelectionMode] = useState<"multiple" | "single">("multiple");
  const [formError, setFormError] = useState("");

  useEffect(() => {
    if (formQuery.data) setDraft(formQuery.data);
  }, [formQuery.data]);

  const saveMutation = useMutation({
    mutationFn: saveAdminUserRegistrationForm,
    onSuccess: async (saved) => {
      setDraft(saved);
      setFormError("");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["admin", "user-registration-form"] }),
        queryClient.invalidateQueries({ queryKey: ["user-registration-form"] }),
      ]);
      toast({ title: "Registration form saved", description: "New settings will apply to registrations immediately.", tone: "success" });
    },
    onError: (error) => toast({ title: "Could not save registration form", description: error.message, tone: "error" }),
  });

  function updateField(key: string, changes: Partial<UserRegistrationField>) {
    setDraft((current) => ({ fields: current.fields.map((field) => field.key === key ? { ...field, ...changes } : field) }));
  }

  function toggleBuiltin(key: UserProfileFieldKey, visible: boolean) {
    if (visible) {
      if (draft.fields.some((field) => field.key === key)) return;
      const defaultField = DEFAULT_USER_REGISTRATION_FORM.fields.find((field) => field.key === key)!;
      const firstCustom = draft.fields.findIndex((field) => field.key.startsWith("custom-"));
      const fields = [...draft.fields];
      fields.splice(firstCustom < 0 ? fields.length : firstCustom, 0, defaultField);
      setDraft({ fields });
    } else if (key !== "fullName") {
      setDraft((current) => ({ fields: current.fields.filter((field) => field.key !== key) }));
    }
  }

  function addField() {
    const trimmed = label.trim();
    if (!trimmed) {
      setFormError("Enter a label for the new field.");
      return;
    }
    const fieldChoices = fieldType === "checkbox" || fieldType === "matrix" ? choices.split(",").map((choice) => choice.trim()).filter(Boolean) : [];
    const field: UserRegistrationField = {
      key: newFieldKey(trimmed, draft.fields),
      label: trimmed,
      type: fieldType ?? "text",
      required: false,
      choices: fieldChoices,
      rows: fieldType === "matrix" ? rows.split(",").map((row) => row.trim()).filter(Boolean) : [],
      selectionMode,
    };
    const next = { fields: [...draft.fields, field] };
    const parsed = userRegistrationFormConfigSchema.safeParse(next);
    if (!parsed.success) {
      setFormError(validationMessage(parsed.error));
      return;
    }
    setDraft(parsed.data);
    setLabel("");
    setChoices("");
    setRows("");
    setFormError("");
  }

  function save() {
    const parsed = userRegistrationFormConfigSchema.safeParse(draft);
    if (!parsed.success) {
      setFormError(validationMessage(parsed.error));
      return;
    }
    setFormError("");
    saveMutation.mutate(parsed.data);
  }

  const builtins = draft.fields.filter((field) => USER_PROFILE_FIELD_KEYS.includes(field.key as UserProfileFieldKey));
  const customFields = draft.fields.filter((field) => field.key.startsWith("custom-"));

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-300">Admin · Users</p>
        <h2 className="mt-2 text-3xl font-bold">Registration Form</h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">Choose which details appear on the public event registration form, set required fields, and add custom questions. Changes apply to all events.</p>
      </header>

      <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 text-sm leading-6 text-amber-100/80">
        Full Name must stay visible because it is printed on certificates. Registration Number is required automatically for campus only events, even when hidden here or marked optional.
      </div>

      <section className="space-y-5 rounded-2xl border border-slate-800 bg-slate-950 p-4 shadow-xl sm:p-6">
        <div>
          <h3 className="text-lg font-semibold text-white">Profile fields</h3>
          <p className="mt-1 text-sm text-slate-400">Toggle fields on or off and choose whether users must fill each visible field.</p>
        </div>
        {formQuery.isError && <p role="alert" className="text-sm text-red-300">{formQuery.error.message}</p>}
        {formQuery.isPending ? <p className="py-6 text-center text-sm text-slate-400">Loading registration settings…</p> : (
          <div className="space-y-3">
            {USER_PROFILE_FIELD_KEYS.map((key) => {
              const field = builtins.find((item) => item.key === key);
              const visible = Boolean(field);
              return (
                <div key={key} className="grid gap-3 rounded-xl border border-slate-800 bg-slate-900/50 p-3 sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:items-center sm:p-4">
                  <label className="flex min-w-0 items-center gap-3 text-sm font-medium text-slate-100">
                    <InputField type="checkbox" checked={visible} disabled={key === "fullName"} onChange={(event) => toggleBuiltin(key, event.target.checked)} className="accent-indigo-500" />
                    <span>{labels[key]}{key === "fullName" && <span className="ml-2 text-xs text-amber-300">Always required</span>}</span>
                  </label>
                  {field && <label className="min-w-0 text-xs text-slate-400">Display label<InputField value={field.label} onChange={(event) => updateField(key, { label: event.target.value })} maxLength={100} className={inputClass} /></label>}
                  {field && <label className="flex items-center gap-2 text-sm text-slate-300"><InputField type="checkbox" checked={key === "fullName" || field.required} disabled={key === "fullName"} onChange={(event) => updateField(key, { required: event.target.checked })} className="accent-indigo-500" />Required</label>}
                  {!field && <span className="text-xs text-slate-500">Not shown</span>}
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section className="space-y-4 rounded-2xl border border-slate-800 bg-slate-950 p-4 shadow-xl sm:p-6">
        <div>
          <h3 className="text-lg font-semibold text-white">Custom questions</h3>
          <p className="mt-1 text-sm text-slate-400">Add text, Yes/No, checkbox, or matrix questions. Matrix questions support multiple rows and columns.</p>
        </div>
        {customFields.length > 0 && <div className="space-y-3">
          {customFields.map((field) => (
            <div key={field.key} className="grid gap-3 rounded-xl border border-slate-800 bg-slate-900/50 p-3 sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:items-center sm:p-4">
              <label className="min-w-0 text-xs text-slate-400">Question label<InputField value={field.label} onChange={(event) => updateField(field.key, { label: event.target.value })} maxLength={100} className={inputClass} /></label>
              <label className="flex items-center gap-2 text-sm text-slate-300"><InputField type="checkbox" checked={field.required} onChange={(event) => updateField(field.key, { required: event.target.checked })} className="accent-indigo-500" />Required</label>
              <button type="button" onClick={() => setDraft((current) => ({ fields: current.fields.filter((item) => item.key !== field.key) }))} className="min-h-10 rounded-lg border border-rose-500/30 px-3 text-sm font-semibold text-rose-200 hover:bg-rose-500/10">Remove</button>
              {field.type === "checkbox" && field.choices?.length ? <p className="text-xs text-slate-500 sm:col-span-3">Choices: {field.choices.join(", ")} · {field.selectionMode === "single" ? "choose one" : "choose any"}</p> : null}
              {field.type === "matrix" && <div className="grid gap-3 sm:col-span-3 sm:grid-cols-2">
                <label className="text-xs text-slate-400">Column labels, separated by commas<InputField value={(field.choices ?? []).join(", ")} onChange={(event) => updateField(field.key, { choices: event.target.value.split(",").map((item) => item.trim()).filter(Boolean) })} className={inputClass} /></label>
                <label className="text-xs text-slate-400">Row labels, separated by commas<InputField value={(field.rows ?? []).join(", ")} onChange={(event) => updateField(field.key, { rows: event.target.value.split(",").map((item) => item.trim()).filter(Boolean) })} className={inputClass} /></label>
                <label className="text-xs text-slate-400 sm:col-span-2">Selection mode<select value={field.selectionMode ?? "single"} onChange={(event) => updateField(field.key, { selectionMode: event.target.value as "multiple" | "single" })} className={inputClass}><option value="single">One answer in each row (radio buttons)</option><option value="multiple">Multiple answers in each row (checkboxes)</option></select></label>
              </div>}
            </div>
          ))}
        </div>}
        <div className="grid gap-3 rounded-xl border border-indigo-500/20 bg-indigo-500/5 p-3 sm:grid-cols-2 sm:p-4">
          <label className="text-xs text-slate-300">New question label<InputField value={label} onChange={(event) => setLabel(event.target.value)} maxLength={100} className={inputClass} placeholder="For example: Dietary requirements" /></label>
          <label className="text-xs text-slate-300">Answer type<select value={fieldType} onChange={(event) => { const nextType = event.target.value as UserRegistrationField["type"]; setFieldType(nextType); if (nextType === "matrix") setSelectionMode("single"); }} className={inputClass}><option value="text">Text</option><option value="yes_no">Yes / No</option><option value="checkbox">Checkbox</option><option value="matrix">Matrix (rows and columns)</option></select></label>
          {(fieldType === "checkbox" || fieldType === "matrix") && <>
            <label className="text-xs text-slate-300">{fieldType === "matrix" ? "Column labels" : "Choices"}, separated by commas<InputField value={choices} onChange={(event) => setChoices(event.target.value)} maxLength={1000} className={inputClass} placeholder={fieldType === "matrix" ? "Very poor, Poor, Average, Good, Excellent" : "Vegetarian, Vegan, No preference"} /></label>
            {fieldType === "matrix" ? <label className="text-xs text-slate-300">Row labels, separated by commas<InputField value={rows} onChange={(event) => setRows(event.target.value)} maxLength={1000} className={inputClass} placeholder="Preparation, Execution, Support" /></label> : null}
            <label className="text-xs text-slate-300">Selection mode<select value={selectionMode} onChange={(event) => setSelectionMode(event.target.value as "multiple" | "single")} className={inputClass}>{fieldType === "matrix" ? <><option value="single">One answer in each row (radio buttons)</option><option value="multiple">Multiple answers in each row (checkboxes)</option></> : <><option value="multiple">Choose any</option><option value="single">Choose one</option></>}</select></label>
          </>}
          <button type="button" onClick={addField} className="min-h-10 self-end rounded-lg border border-indigo-400/30 bg-indigo-500/10 px-4 text-sm font-semibold text-indigo-100 hover:bg-indigo-500/20">Add question</button>
        </div>
      </section>

      {formError && <p role="alert" className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">{formError}</p>}
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" onClick={save} disabled={formQuery.isPending || formQuery.isError || saveMutation.isPending} className="min-h-11 rounded-xl bg-indigo-600 px-5 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50">{saveMutation.isPending ? "Saving…" : "Save registration form"}</button>
        <button type="button" onClick={() => setDraft(DEFAULT_USER_REGISTRATION_FORM)} disabled={saveMutation.isPending} className="min-h-11 rounded-xl border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-300 hover:bg-slate-900">Restore default fields</button>
        <p className="text-xs text-slate-500">Restore defaults only changes this draft. Save to apply.</p>
      </div>
    </div>
  );
}
