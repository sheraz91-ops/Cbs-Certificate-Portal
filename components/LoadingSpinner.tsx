export default function LoadingSpinner({
  label = "Generating your certificate...",
  variant = "dark",
}: {
  label?: string;
  variant?: "dark" | "light";
}) {
  const textColor = variant === "light" ? "text-white" : "text-navy-800";

  return (
    <div className={`flex items-center justify-center gap-3 ${textColor}`}>
      <span className="relative flex h-5 w-5">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-gold-400 opacity-60" />
        <span className="relative inline-flex h-5 w-5 rounded-full border-2 border-gold-500 border-t-transparent animate-spin" />
      </span>
      <span className="text-sm font-medium">{label}</span>
    </div>
  );
}
