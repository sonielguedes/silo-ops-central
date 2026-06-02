import { NextRequest, NextResponse } from "next/server";
import { IS_DEMO, SITE_URL } from "@/lib/app-env";
import { filterItemsBySessionScope, getScopeFilter, getSessionFromRequest, isAdminGlobal, normalizeScopeFields } from "@/lib/auth";

const BASE = (process.env.API_BASE_URL || process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3000").trim().replace(/\/$/, "");

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ tratorId: string }> }
) {
  try {
    const session = getSessionFromRequest(req);
    if (!session) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const { tratorId } = await params;
    const { searchParams } = new URL(req.url);
    const qs = searchParams.toString();

    if (IS_DEMO || (SITE_URL && BASE === SITE_URL)) {
      return NextResponse.json([], { status: 200 });
    }

    const scope = getScopeFilter(session);
    const url = `${BASE}/api/equipamentos/${tratorId}/rastro${qs ? "?" + qs : ""}`;

    const res = await fetch(url, {
      cache: "no-store",
      signal: AbortSignal.timeout(9000)
    });

    if (!res.ok) {
        // Se o backend ainda não tem a tabela/rota de rastro (404/500),
        // retorna um array vazio para não quebrar a tela.
        console.warn(`[Proxy Rastro] Backend VPS retornou ${res.status} para ${tratorId}`);
        return NextResponse.json([], { status: 200 });
    }

    const text = await res.text();
    let data: unknown[] = [];
    try {
      data = text ? JSON.parse(text) : [];
    } catch {
      console.warn(`[Proxy Rastro] Falha ao converter JSON do rastro para ${tratorId}. Retornando [].`);
      data = [];
    }

    const points = (Array.isArray(data) ? data : []).map((item: any) => ({
      latitude: Number(item.latitude ?? item.lat ?? item.gps?.lat ?? item.location?.lat),
      longitude: Number(item.longitude ?? item.lng ?? item.gps?.lng ?? item.location?.lng),
      velocidade: item.velocidade ?? item.speed ?? null,
      timestamp: item.timestamp ?? item.horario ?? item.created_at ?? new Date().toISOString(),
      status: item.status ?? item.estado ?? null,
      origem: item.origem ?? item.source ?? null,
      ...normalizeScopeFields({
        empresa_id: item.empresa_id,
        usina_id: item.usina_id,
        unidade_id: item.unidade_id,
      }),
    })).filter((item: any) => Number.isFinite(item.latitude) && Number.isFinite(item.longitude));

    const filtered = !scope || isAdminGlobal(session)
      ? points
      : filterItemsBySessionScope(points, session);

    return NextResponse.json(filtered, { status: 200 });
  } catch (err) {
    console.warn(`[Proxy Rastro Warning] Falha na conexão com VPS para rastro: ${err}`);
    return NextResponse.json([], { status: 200 }); // Graceful fallback
  }
}
