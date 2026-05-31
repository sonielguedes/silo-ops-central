import { NextRequest, NextResponse } from "next/server";

const BASE = (process.env.API_BASE_URL || process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3000").trim().replace(/\/$/, "");

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ tratorId: string }> }
) {
  try {
    const { tratorId } = await params;
    const { searchParams } = new URL(req.url);
    const qs = searchParams.toString();

    const url = `${BASE}/api/equipamentos/${tratorId}/rastro${qs ? "?" + qs : ""}`;

    const res = await fetch(url, {
      cache: "no-store",
      signal: AbortSignal.timeout(9000)
    });

    if (!res.ok) {
        // Se o backend ainda não tem a tabela/rota de rastro (404/500),
        // retorna um array vazio para não quebrar o mapa no frontend.
        console.warn(`[Proxy Rastro] Backend VPS retornou ${res.status} para ${tratorId}`);
        return NextResponse.json([], { status: 200 });
    }

    const text = await res.text();
    let data = [];
    try {
      data = text ? JSON.parse(text) : [];
    } catch (e) {
      console.warn(`[Proxy Rastro] Falha ao converter JSON do rastro para ${tratorId}. Retornando [].`);
      data = [];
    }

    return NextResponse.json(Array.isArray(data) ? data : [], { status: 200 });
  } catch (err) {
    console.warn(`[Proxy Rastro Warning] Falha na conexão com VPS para rastro: ${err}`);
    return NextResponse.json([], { status: 200 }); // Graceful fallback
  }
}
