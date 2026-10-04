"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import UserProfileField from "@/components/UserProfileField";
import PasswordField from "@/components/PasswordField";
import { useAdminSession, useAdminToast } from "../../AdminShell";
import {
  enrollUserInEvent,
  getUserById,
  updateUser,
  updateUserAttendance,
  setUserActive,
  deleteUser,
} from "@/features/users/api";
import { getAdminWorkshops } from "@/features/workshops/api";
import {
  adminCampusUserProfileSchema,
  campusRegistrationNumberSchema,
  validationMessage,
} from "@/lib/validation/schemas";
import type { AdminUserProfileInput, UserProfileInput } from "@/types/user";

const fields = [
  ["emailAddress", "Email Address"],
  ["fullName", "Full Name"],
  ["registrationNumber", "Registration Number"],
  ["department", "Department"],
  ["semester", "Semester"],
  ["section", "Section"],
  ["institute", "Institute"],
  ["whatsappNumber", "WhatsApp Number"],
] as const;

const requiredFields = new Set(["fullName", "registrationNumber", "semester", "whatsappNumber"]);

function toProfile(user: UserProfileInput): UserProfileInput {
  return {
    emailAddress: user.emailAddress,
    fullName: user.fullName,
    registrationNumber: user.registrationNumber,
    department: user.department,
    semester: user.semester,
    section: user.section,
    institute: user.institute,
    whatsappNumber: user.whatsappNumber,
  };
}

export default function UserDetails({ userId }: { userId: string }) {
  const authenticated = useAdminSession();
  const toast = useAdminToast();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [profile, setProfile] = useState<UserProfileInput | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState("");
  const [selectedWorkshop, setSelectedWorkshop] = useState("");
  const [deletePassword, setDeletePassword] = useState("");
  const userQuery = useQuery({
    queryKey: ["admin", "users", userId],
    queryFn: () => getUserById(userId),
    enabled: Boolean(authenticated && userId),
  });
  const workshopsQuery = useQuery({
    queryKey: ["admin", "workshops"],
    queryFn: getAdminWorkshops,
    enabled: authenticated,
  });
  const user = userQuery.data;
  const enrolledKeys = useMemo(
    () => new Set(user?.enrollments.map((entry) => entry.workshopKey) ?? []),
    [user?.enrollments],
  );
  const availableWorkshops = (workshopsQuery.data ?? []).filter(
    (workshop) => !enrolledKeys.has(workshop.key),
  );

  useEffect(() => {
    if (user) setProfile(toProfile(user));
  }, [user]);

  const updateMutation = useMutation({
    mutationFn: (next: AdminUserProfileInput) => updateUser(userId, next),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["admin", "users", userId] }),
        queryClient.invalidateQueries({ queryKey: ["admin", "users"] }),
      ]);
      setEditing(false);
      toast({
        title: "User details saved",
        description: "The assigned User ID was left unchanged.",
        tone: "success",
      });
    },
  });
  const enrollMutation = useMutation({
    mutationFn: (workshop: string) => enrollUserInEvent(userId, workshop),
    onSuccess: async (result) => {
      await queryClient.invalidateQueries({
        queryKey: ["admin", "users", userId],
      });
      setSelectedWorkshop("");
      toast({
        title: "User added to event",
        description: `${result.workshopName}: ${result.certificateId}`,
        tone: "success",
      });
    },
  });
  const attendanceMutation = useMutation({
    mutationFn: updateUserAttendance,
    onSuccess: async (_result, input) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["admin", "users", userId] }),
        queryClient.invalidateQueries({ queryKey: ["admin", "overview"] }),
      ]);
      toast({
        title: "Attendance updated",
        description: `${input.present ? "Marked Present" : "Marked Absent"} for ${input.workshop}.`,
        tone: "success",
      });
    },
    onError: (error) =>
      toast({
        title: "Could not update attendance",
        description: error.message,
        tone: "error",
      }),
  });
  const statusMutation = useMutation({
    mutationFn: (isActive: boolean) => setUserActive(userId, isActive),
    onSuccess: async (result) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["admin", "users", userId] }),
        queryClient.invalidateQueries({ queryKey: ["admin", "users"] }),
        queryClient.invalidateQueries({ queryKey: ["admin", "overview"] }),
      ]);
      toast({ title: result.isActive ? "User activated" : "User deactivated", description: result.isActive ? "This account can register for events again." : "This account cannot register for events while inactive.", tone: "success" });
    },
    onError: (error) => toast({ title: "Could not update user status", description: error.message, tone: "error" }),
  });
  const deleteMutation = useMutation({
    mutationFn: (password: string) => deleteUser(userId, password),
    onSuccess: async (result) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["admin", "users"] }),
        queryClient.invalidateQueries({ queryKey: ["admin", "overview"] }),
        queryClient.invalidateQueries({ queryKey: ["admin", "workshop-details"] }),
      ]);
      toast({ title: "User deleted", description: `${result.deletedEnrollments} event enrollment(s) were removed.`, tone: "success" });
      router.replace("/admin/users/all");
    },
  });

  function submitProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!profile) return;
    const parsed = adminCampusUserProfileSchema.safeParse(profile);
    if (!parsed.success) {
      const errors: Record<string, string> = {};
      for (const issue of parsed.error.issues)
        errors[String(issue.path[0])] ??= issue.message;
      setFieldErrors(errors);
      setFormError(validationMessage(parsed.error));
      return;
    }
    setFieldErrors({});
    setFormError("");
    updateMutation.mutate(parsed.data);
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <Link
        href="/admin/users/all"
        className="inline-flex items-center gap-2 text-sm font-medium text-indigo-300 hover:text-indigo-200"
      >
        All Users
      </Link>
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-300">
          Admin · Users
        </p>
        <h2 className="mt-2 text-3xl font-bold">User Details</h2>
        <p className="mt-2 font-mono text-sm text-slate-400">{userId}</p>
      </header>

      {userQuery.isPending ? (
        <p className="rounded-2xl border border-slate-800 bg-slate-950 px-6 py-10 text-center text-sm text-slate-400">
          Loading user details...
        </p>
      ) : userQuery.isError ? (
        <p
          role="alert"
          className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300"
        >
          {userQuery.error.message}
        </p>
      ) : user && profile ? (
        <>
          <section className="rounded-2xl border border-slate-800 bg-slate-950 p-4 shadow-xl shadow-slate-950/10 sm:p-6">
            <div className="mb-6 flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-5">
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
                  Assigned User ID
                </p>
                <p className="mt-2 font-mono text-xl font-semibold text-indigo-200">
                  {user.userId}
                </p>
                <p className="mt-2 text-sm text-slate-400">
                  Enrolled in{" "}
                  <strong className="text-white">
                    {user.enrollments.length}
                  </strong>{" "}
                  event{user.enrollments.length === 1 ? "" : "s"}
                </p>
              </div>
              {!editing && <div className="flex flex-wrap items-center gap-2">
                <span className={`rounded-full px-3 py-1.5 text-xs font-semibold ${user.isActive ? "bg-emerald-500/10 text-emerald-300" : "bg-slate-800 text-slate-400"}`}>{user.isActive ? "Active" : "Inactive"}</span>
                <button type="button" disabled={statusMutation.isPending} onClick={() => statusMutation.mutate(!user.isActive)} className="rounded-xl border border-amber-400/30 px-4 py-2 text-sm font-semibold text-amber-200 hover:bg-amber-500/10 disabled:opacity-50">{user.isActive ? "Deactivate" : "Activate"}</button>
                <button type="button" onClick={() => setEditing(true)} className="rounded-xl border border-indigo-400/30 px-4 py-2 text-sm font-semibold text-indigo-200 hover:bg-indigo-500/10">Edit details</button>
              </div>}
            </div>

            {editing ? (
              <form onSubmit={submitProfile}>
                <div className="grid gap-4 sm:grid-cols-2">
                  {fields.map(([key, label]) => (
                    <label
                      key={key}
                      className="block text-xs font-medium text-slate-300"
                    >
                      {label} {requiredFields.has(key) ? <span className="text-red-300">*</span> : <span className="text-slate-500">(optional)</span>}
                      <UserProfileField
                        name={key}
                        required={requiredFields.has(key)}
                        validationSchema={adminCampusUserProfileSchema.shape[key]}
                        registrationMode={
                          campusRegistrationNumberSchema.safeParse(
                            user.registrationNumber,
                          ).success
                            ? "campus"
                            : "free"
                        }
                        value={profile[key]}
                        error={fieldErrors[key]}
                        onValueChange={(value) => {
                          setProfile((current) =>
                            current ? { ...current, [key]: value } : current,
                          );
                          setFieldErrors((current) => ({
                            ...current,
                            [key]: "",
                          }));
                        }}
                        className="mt-1.5 h-11 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 text-sm text-slate-100 outline-none focus:border-indigo-500"
                      />
                    </label>
                  ))}
                </div>
                {formError && (
                  <p role="alert" className="mt-4 text-sm text-red-300">
                    {formError}
                  </p>
                )}
                {updateMutation.isError && (
                  <p role="alert" className="mt-4 text-sm text-red-300">
                    {updateMutation.error.message}
                  </p>
                )}
                <div className="mt-5 flex flex-col gap-2 min-[420px]:flex-row min-[420px]:gap-3">
                  <button
                    type="submit"
                    disabled={updateMutation.isPending}
                    className="min-h-11 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50"
                  >
                    {updateMutation.isPending ? "Saving…" : "Save details"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setProfile(toProfile(user));
                      setFieldErrors({});
                      setFormError("");
                      setEditing(false);
                    }}
                    className="min-h-11 rounded-xl border border-slate-700 px-4 py-2.5 text-sm font-semibold text-slate-300 hover:bg-slate-900"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <dl className="grid gap-x-8 gap-y-5 sm:grid-cols-2">
                {fields.map(([key, label]) => (
                  <div key={key}>
                    <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">
                      {label}
                    </dt>
                    <dd className="mt-1 break-words text-sm font-medium text-slate-100">
                      {user[key]}
                    </dd>
                  </div>
                ))}
                <div>
                  <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">
                    Created
                  </dt>
                  <dd className="mt-1 text-sm font-medium text-slate-100">
                    {new Date(user.createdAt).toLocaleString()}
                  </dd>
                </div>
              </dl>
            )}
          </section>

          <section className="rounded-2xl border border-red-500/20 bg-slate-950 p-4 sm:p-6">
            <h3 className="font-semibold text-red-200">Delete user</h3>
            <p className="mt-1 text-sm text-slate-400">This permanently removes the user and all event enrollment records. Enter the admin password to confirm.</p>
            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
              <label className="block min-w-0 flex-1 text-xs font-medium text-slate-300">Admin password
                <PasswordField autoComplete="current-password" value={deletePassword} onChange={(event) => setDeletePassword(event.target.value)} className="mt-1.5 h-11 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 text-sm text-slate-100 outline-none focus:border-red-400" />
              </label>
              <button type="button" disabled={!deletePassword || deleteMutation.isPending} onClick={() => deleteMutation.mutate(deletePassword)} className="min-h-11 rounded-xl bg-red-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-600 disabled:opacity-50">{deleteMutation.isPending ? "Deleting…" : "Delete user"}</button>
            </div>
            {deleteMutation.isError && <p role="alert" className="mt-3 text-sm text-red-300">{deleteMutation.error.message}</p>}
          </section>

          <section className="rounded-2xl border border-slate-800 bg-slate-950 p-4 shadow-xl shadow-slate-950/10 sm:p-6">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <h3 className="text-lg font-semibold text-white">
                  Event enrollments
                </h3>
                <p className="mt-1 text-sm text-slate-400">
                  View certificates and attendance, or add this user to another
                  event.
                </p>
              </div>
              {availableWorkshops.length > 0 && (
                <div className="flex flex-col gap-2 sm:flex-row w-full sm:w-auto">
                  <label className="text-xs font-medium text-slate-400">
                    Add to event
                    <select
                      value={selectedWorkshop}
                      onChange={(event) =>
                        setSelectedWorkshop(event.target.value)
                      }
                      disabled={!user.isActive}
                      className="mt-1 block h-10 w-full min-w-0 rounded-lg border border-slate-700 bg-slate-900 px-3 text-sm text-white sm:min-w-56"
                    >
                      <option value="">Select event</option>
                      {availableWorkshops.map((workshop) => (
                        <option key={workshop.key} value={workshop.key}>
                          {workshop.workshopName}
                        </option>
                      ))}
                    </select>
                  </label>
                  <button
                    type="button"
                    disabled={!user.isActive || !selectedWorkshop || enrollMutation.isPending}
                    onClick={() => enrollMutation.mutate(selectedWorkshop)}
                    className="h-10 w-full rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-40 sm:w-auto self-end"
                  >
                    {enrollMutation.isPending ? "Adding…" : "Add to event"}
                  </button>
                </div>
              )}
            </div>
            {!user.isActive && <p className="mt-3 text-xs text-amber-300">This user is inactive and cannot be added to events until activated.</p>}
            {enrollMutation.isError && (
              <p role="alert" className="mt-4 text-sm text-red-300">
                {enrollMutation.error.message}
              </p>
            )}
            {user.enrollments.length === 0 ? (
              <p className="mt-6 rounded-xl border border-dashed border-slate-700 p-6 text-center text-sm text-slate-400">
                This user is not enrolled in any events yet.
              </p>
            ) : (
              <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:hidden">
                {user.enrollments.map((entry) => (
                  <article
                    key={entry.workshopKey}
                    className="min-w-0 rounded-xl border border-slate-800 bg-slate-900/70 p-4"
                  >
                    <p className="break-words font-semibold text-slate-100">
                      {entry.workshopName}{" "}
                      <span className="text-xs font-normal text-slate-500">
                        {entry.eventYear}
                      </span>
                    </p>
                    <dl className="mt-3 space-y-2 border-t border-slate-800 pt-3 text-xs">
                      <div>
                        <dt className="text-slate-500">Date</dt>
                        <dd className="mt-0.5 text-slate-300">
                          {entry.eventDate}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-slate-500">Certificate ID</dt>
                        <dd className="mt-0.5 break-all font-mono text-indigo-200">
                          {entry.certificateId}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-slate-500">Attendance</dt>
                        <dd className="mt-1">
                          <span
                            className={`rounded-full px-2.5 py-1 font-semibold ${entry.attendance ? "bg-emerald-500/10 text-emerald-300" : "bg-slate-800 text-slate-400"}`}
                          >
                            {entry.attendance ? "Present" : "Absent"}
                          </span>
                        </dd>
                      </div>
                    </dl>
                    <button
                      type="button"
                      disabled={attendanceMutation.isPending}
                      onClick={() =>
                        attendanceMutation.mutate({
                          userId,
                          workshop: entry.workshopKey,
                          participantId: entry.participantId,
                          present: !entry.attendance,
                        })
                      }
                      className={`mt-4 min-h-10 w-full rounded-lg px-3 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50 ${entry.attendance ? "border border-slate-700 text-slate-300 hover:bg-slate-800" : "bg-emerald-600 text-white hover:bg-emerald-500"}`}
                    >
                      {attendanceMutation.isPending
                        ? "Saving…"
                        : entry.attendance
                          ? "Mark Absent"
                          : "Mark Present"}
                    </button>
                  </article>
                ))}
              </div>
            )}
            {user.enrollments.length > 0 && (
              <div className="mt-6 hidden overflow-x-auto rounded-xl border border-slate-800 lg:block">
                <table className="w-full min-w-[700px] text-left text-sm">
                  <thead className="bg-slate-900 text-xs uppercase text-slate-400">
                    <tr>
                      <th className="px-4 py-3">Event</th>
                      <th className="px-4 py-3">Date</th>
                      <th className="px-4 py-3">Certificate ID</th>
                      <th className="px-4 py-3">Attendance</th>
                      <th className="px-4 py-3">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {user.enrollments.map((entry) => (
                      <tr key={entry.workshopKey} className="text-slate-200">
                        <td className="px-4 py-3 font-medium">
                          {entry.workshopName}
                          <span className="ml-2 text-xs text-slate-500">
                            {entry.eventYear}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-400">
                          {entry.eventDate}
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-indigo-200">
                          {entry.certificateId}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`rounded-full px-2.5 py-1 text-xs font-semibold ${entry.attendance ? "bg-emerald-500/10 text-emerald-300" : "bg-slate-800 text-slate-400"}`}
                          >
                            {entry.attendance ? "Present" : "Absent"}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <button
                            type="button"
                            disabled={attendanceMutation.isPending}
                            onClick={() =>
                              attendanceMutation.mutate({
                                userId,
                                workshop: entry.workshopKey,
                                participantId: entry.participantId,
                                present: !entry.attendance,
                              })
                            }
                            className={`rounded-lg px-3 py-2 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-50 ${entry.attendance ? "border border-slate-700 text-slate-300 hover:bg-slate-800" : "bg-emerald-600 text-white hover:bg-emerald-500"}`}
                          >
                            {attendanceMutation.isPending
                              ? "Saving…"
                              : entry.attendance
                                ? "Mark Absent"
                                : "Mark Present"}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      ) : null}
    </div>
  );
}
