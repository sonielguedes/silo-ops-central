export default function Empty({ icon="📭", title="Nenhum registro", sub="" }: { icon?: string; title?: string; sub?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 gap-4 animate-fade-in">
      <div className="w-20 h-20 rounded-3xl bg-[#101b2d] border border-[#1f334d] flex items-center justify-center text-4xl shadow-2xl relative overflow-hidden group">
        <div className="absolute inset-0 bg-[#00d4ff]/5 opacity-0 group-hover:opacity-100 transition-opacity" />
        <span className="relative z-10">{icon}</span>
      </div>
      <div className="text-center">
        <p className="text-white font-black text-sm uppercase tracking-widest">{title}</p>
        {sub && <p className="text-[#4a6a8a] text-xs font-bold mt-2 max-w-xs leading-relaxed opacity-70">{sub}</p>}
      </div>
    </div>
  );
}
