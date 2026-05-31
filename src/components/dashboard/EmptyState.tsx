export default function EmptyState({ title, sub }: { title: string; sub: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-[#1f334d] bg-[#0d1420] p-6 text-center">
      <p className="text-[#c8d8e8] font-semibold">{title}</p>
      <p className="text-[#4a6a8a] text-sm mt-1">{sub}</p>
    </div>
  );
}
