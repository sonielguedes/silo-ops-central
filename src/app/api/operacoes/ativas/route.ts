import { NextResponse } from "next/server";
import { IS_DEMO } from "@/lib/app-env";

const B = (process.env.API_BASE_URL || process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3000").trim().replace(/\/$/, "");

export async function GET() {
  if (IS_DEMO) {
    return NextResponse.json([], { status: 200 });
  }

  try {
    const r = await fetch(`${B}/api/operacoes/ativas`, {
      cache: "no-store",
      signal: AbortSignal.timeout(8000)
    });
    if (!r.ok) {
      return NextResponse.json(
        { error: `Backend retornou HTTP ${r.status}` },
        { status: r.status }
      );
    }
    const d = await r.json();
    const mapped = (Array.isArray(d) ? d : []).map(item => ({
      operacao_id: item.id_local || item.operacao_id || "",
      trator_id: item.trator_id || "",
      operador_id: item.operador_id || null,
      nome_operador: item.nome_operador || null,
      status: item.status || "",
      inicio: item.inicio_real || item.criado_em || new Date().toISOString(),
      velocidade_atual: item.velocidade_atual !== undefined ? item.velocidade_atual : null,
      bateria: item.bateria !== undefined ? item.bateria : null,
      last_seen: item.last_seen || item.criado_em || null,
      fazenda: item.fazenda || undefined,
      talhao: item.talhao || undefined,
    }));
    return NextResponse.json(mapped, { status: 200 });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 502 });
  }
}
