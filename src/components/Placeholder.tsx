export default function Placeholder({ module, endpoints }: { module: string; endpoints?: string[] }) {
  return (
    <div className="space-y-6">
      <div className="card-p border border-[#ffab00]/20 bg-[#ffab00]/5">
        <div className="flex items-start gap-3">
          <span className="text-[#ffab00] text-xl mt-0.5">!</span>
          <div>
            <p className="text-[#ffab00] font-semibold">Aguardando integração do backend</p>
            <p className="text-[#4a6a8a] text-sm mt-1">O módulo <strong className="text-[#c8d8e8]">{module}</strong> está pronto para exibir dados assim que os endpoints forem implementados.</p>
            {endpoints && endpoints.length > 0 && (
              <div className="mt-3 space-y-1">
                {endpoints.map(e => <p key={e} className="text-[#4a6a8a] text-xs font-mono">{e}</p>)}
              </div>
            )}
          </div>
        </div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Array.from({length:4}).map((_,i) => (
          <div key={i} className="card-p animate-pulse">
            <div className="h-3 bg-[#1e2d3d] rounded w-2/3 mb-3" />
            <div className="h-8 bg-[#1e2d3d] rounded w-1/2" />
          </div>
        ))}
      </div>
      <div className="card overflow-hidden">
        <div className="p-4 border-b border-[#1e2d3d]"><div className="h-4 bg-[#1e2d3d] rounded w-1/4 animate-pulse" /></div>
        {Array.from({length:5}).map((_,i) => (
          <div key={i} className="flex gap-4 px-4 py-3 border-b border-[#1e2d3d]/50 animate-pulse">
            <div className="h-3 bg-[#1e2d3d] rounded flex-1" />
            <div className="h-3 bg-[#1e2d3d] rounded w-24" />
            <div className="h-3 bg-[#1e2d3d] rounded w-16" />
          </div>
        ))}
      </div>
    </div>
  );
}
