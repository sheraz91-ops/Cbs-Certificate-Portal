import type { AlertState } from "@/types";

export default function AlertMessage({ alert }: { alert: AlertState }) {
  const isSuccess = alert.type === "success";

  return (
    <div
      role="status"
      className={[
        "w-full rounded-2xl border px-4 py-3 flex items-start gap-3 animate-scale-in",
        isSuccess
          ? "bg-emerald-50 border-emerald-200 text-emerald-800"
          : "bg-rose-50 border-rose-200 text-rose-800",
      ].join(" ")}
    >
      <span
        className={[
          "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white",
          isSuccess ? "bg-emerald-500" : "bg-rose-500",
        ].join(" ")}
      >
        {isSuccess ? "✓" : "!"}
      </span>
      <p className="text-sm font-medium leading-snug">{alert.message}</p>
    </div>
  );
}
