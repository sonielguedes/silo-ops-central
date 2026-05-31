export default function SectionHeader({
  title,
  sub,
  action
}: {
  title: string;
  sub?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4 mb-5">
      <div>
        <h3 className="text-white font-black text-sm uppercase tracking-[0.15em]">{title}</h3>
        {sub && <p className="text-[#4a6a8a] text-[10px] font-black uppercase tracking-[0.18em] mt-1 opacity-75">{sub}</p>}
      </div>
      {action}
    </div>
  );
}
