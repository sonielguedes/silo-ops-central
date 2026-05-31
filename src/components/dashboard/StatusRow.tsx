export default function StatusRow({
  label,
  value,
  tone = "neutral"
}: {
  label: string;
  value: string;
  tone?: "neutral" | "good" | "warn" | "bad";
}) {
  const cls =
    tone === "good" ? "text-[#22c55e]" :
    tone === "warn" ? "text-[#f59e0b]" :
    tone === "bad" ? "text-[#ef4444]" :
    "text-[#c8d8e8]";

  return (
    <div className="flex items-center justify-between gap-4 text-xs">
      <span className="text-[#4a6a8a] uppercase tracking-widest font-black">{label}</span>
      <span className={`${cls} font-mono font-bold text-right`}>{value}</span>
    </div>
  );
}
