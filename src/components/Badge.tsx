type Variant = "online"|"offline"|"instavel"|"ativo"|"inativo"|"pendente"|"enviado"|"erro"|"info";

const V: Record<Variant, string> = {
  online:   "border-[#22c55e]/40 bg-[#22c55e]/10 text-[#22c55e] shadow-[0_0_10px_rgba(34,197,94,0.1)]",
  offline:  "border-[#ef4444]/40 bg-[#ef4444]/10 text-[#ef4444] shadow-[0_0_10px_rgba(239,68,68,0.1)]",
  instavel: "border-[#f59e0b]/40 bg-[#f59e0b]/10 text-[#f59e0b] shadow-[0_0_10px_rgba(245,158,11,0.1)]",
  ativo:    "border-[#22c55e]/40 bg-[#22c55e]/10 text-[#22c55e]",
  inativo:  "border-[#ef4444]/40 bg-[#ef4444]/10 text-[#ef4444]",
  pendente: "border-[#f59e0b]/40 bg-[#f59e0b]/10 text-[#f59e0b]",
  enviado:  "border-[#00d4ff]/40 bg-[#00d4ff]/10 text-[#00d4ff]",
  erro:     "border-[#ef4444]/40 bg-[#ef4444]/10 text-[#ef4444]",
  info:     "border-[#1f334d] bg-[#0d1420] text-[#4a6a8a]",
};

export default function Badge({ label, variant, dot=true }: { label: string; variant: Variant; dot?: boolean }) {
  const colorClass = V[variant].split(" ")[2]; // Pega a classe text-color
  const bgClass = colorClass.replace("text-", "bg-");

  return (
    <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border text-[10px] font-black uppercase tracking-widest transition-all ${V[variant]}`}>
      {dot && <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${variant==="online"||variant==="ativo"||variant==="enviado" ? "pulse-green" : ""} ${bgClass}`} />}
      {label}
    </span>
  );
}
