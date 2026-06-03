"use client";

import { useEffect, useState } from "react";
import type { FichaIntegracaoResumo } from "@/lib/fichas-operacionais";

export type TipoIntegracao = "BANCO_DE_DADOS" | "ARQUIVO_DE_TEXTO";

interface TipoIntegracaoModalProps {
  open: boolean;
  loading?: boolean;
  selectedCount: number;
  validCount: number;
  blockedCount: number;
  blockedLines: string[];
  summary: FichaIntegracaoResumo | null;
  onClose: () => void;
  onConfirm: (tipo: TipoIntegracao) => void;
}

export default function TipoIntegracaoModal({
  open,
  loading = false,
  selectedCount,
  validCount,
  blockedCount,
  blockedLines,
  summary,
  onClose,
  onConfirm,
}: TipoIntegracaoModalProps) {
  const [tipo, setTipo] = useState<TipoIntegracao>("BANCO_DE_DADOS");

  useEffect(() => {
    if (open) setTipo("BANCO_DE_DADOS");
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[140] bg-black/70 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl rounded-3xl border border-[#1f334d] bg-[#07111f] shadow-2xl">
        <div className="p-6 border-b border-[#1f334d]">
          <h3 className="text-white font-black text-xl">Tipo de Integração</h3>
          <p className="text-[#4a6a8a] text-xs mt-1">Escolha como processar as fichas selecionadas.</p>
        </div>

        <div className="p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setTipo("BANCO_DE_DADOS")}
              className={`rounded-2xl border p-4 text-left transition-all ${tipo === "BANCO_DE_DADOS" ? "border-[#00d4ff] bg-[#00d4ff]/10" : "border-[#1f334d] bg-[#0d1420]"}`}
            >
              <p className="text-white font-black">Banco de Dados</p>
              <p className="text-[#4a6a8a] text-xs mt-1">Envia a seleção via POST /api/fichas-operacionais/integrar.</p>
            </button>
            <button
              type="button"
              onClick={() => setTipo("ARQUIVO_DE_TEXTO")}
              className={`rounded-2xl border p-4 text-left transition-all ${tipo === "ARQUIVO_DE_TEXTO" ? "border-[#22c55e] bg-[#22c55e]/10" : "border-[#1f334d] bg-[#0d1420]"}`}
            >
              <p className="text-white font-black">Arquivo de Texto</p>
              <p className="text-[#4a6a8a] text-xs mt-1">Gera TXT via POST /api/fichas-operacionais/exportar.</p>
            </button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="card-p">
              <p className="text-[#4a6a8a] text-[10px] uppercase font-bold">Selecionadas</p>
              <p className="text-white font-black text-xl mt-1">{selectedCount}</p>
            </div>
            <div className="card-p">
              <p className="text-[#4a6a8a] text-[10px] uppercase font-bold">Incluídas</p>
              <p className="text-[#22c55e] font-black text-xl mt-1">{validCount}</p>
            </div>
            <div className="card-p">
              <p className="text-[#4a6a8a] text-[10px] uppercase font-bold">Erros</p>
              <p className="text-[#ef4444] font-black text-xl mt-1">{blockedCount}</p>
            </div>
            <div className="card-p">
              <p className="text-[#4a6a8a] text-[10px] uppercase font-bold">Tipo</p>
              <p className="text-[#00d4ff] font-black text-sm mt-2">{tipo === "BANCO_DE_DADOS" ? "Banco de Dados" : "Arquivo de Texto"}</p>
            </div>
          </div>

          {blockedLines.length > 0 && (
            <div className="rounded-2xl border border-[#ef4444]/20 bg-[#ef4444]/5 p-4">
              <p className="text-[#ef4444] font-bold text-sm">Linhas com erro</p>
              <ul className="mt-2 space-y-1 text-[#c8d8e8] text-xs">
                {blockedLines.map(line => <li key={line}>• {line}</li>)}
              </ul>
            </div>
          )}

          {summary && (
            <div className="rounded-2xl border border-[#1f334d] bg-[#0d1420] p-4">
              <p className="text-white font-black text-sm">Resumo da integração</p>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mt-3 text-xs">
                <div><span className="text-[#4a6a8a]">Total</span><p className="text-white font-bold">{summary.total}</p></div>
                <div><span className="text-[#4a6a8a]">Incluídos</span><p className="text-[#22c55e] font-bold">{summary.incluidos}</p></div>
                <div><span className="text-[#4a6a8a]">Alterados</span><p className="text-[#00d4ff] font-bold">{summary.alterados}</p></div>
                <div><span className="text-[#4a6a8a]">Erros</span><p className="text-[#ef4444] font-bold">{summary.erros}</p></div>
                <div><span className="text-[#4a6a8a]">Linhas erro</span><p className="text-white font-bold">{summary.linhasComErro.length}</p></div>
              </div>
            </div>
          )}
        </div>

        <div className="p-6 border-t border-[#1f334d] flex items-center justify-end gap-3">
          <button type="button" onClick={onClose} className="btn-ghost border border-[#1f334d]">Cancelar</button>
          <button
            type="button"
            onClick={() => onConfirm(tipo)}
            className="btn-primary"
            disabled={loading || selectedCount === 0}
          >
            {loading ? "Integrando..." : "Integrar"}
          </button>
        </div>
      </div>
    </div>
  );
}
