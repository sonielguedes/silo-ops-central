import { NextRequest, NextResponse } from "next/server";
import { APP_ENV, CAN_LOCAL_OPERADORES_CRUD, IS_DEMO } from "@/lib/app-env";
import { gerarCSV, gerarTXT, normalizeFichaList, type FichaExportFormat, type FichaOperacional } from "@/lib/fichas-operacionais";

const API_BASE_RAW = (process.env.API_BASE_URL || process.env.NEXT_PUBLIC_API_BASE_URL || "").trim();
const HAS_EXPLICIT_BACKEND = Boolean(API_BASE_RAW);
const API_BASE = API_BASE_RAW.replace(/\/$/, "");

async function readJsonSafe(res: Response) {
  const contentType = res.headers.get("content-type") || "";
  if (!contentType.includes("application/json") && !contentType.includes("+json")) return null;
  return res.json().catch(() => null);
}

function getFormat(value: unknown): FichaExportFormat {
  return String(value || "csv").toLowerCase() === "txt" ? "txt" : "csv";
}

function makeFilename(format: FichaExportFormat) {
  const day = new Date().toISOString().slice(0, 10);
  return `sil_fichas_${day}.${format}`;
}

function payloadToText(fichas: FichaOperacional[], format: FichaExportFormat) {
  return format === "txt" ? gerarTXT(fichas) : gerarCSV(fichas);
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({} as Record<string, unknown>));
  const format = getFormat(body.formato ?? body.format);
  const filename = makeFilename(format);
  const provided = normalizeFichaList(body.fichas ?? body.records ?? body.data);

  if (IS_DEMO || CAN_LOCAL_OPERADORES_CRUD) {
    const text = payloadToText(provided, format);
    return new NextResponse(text, {
      status: 200,
      headers: {
        "Content-Type": format === "txt" ? "text/plain; charset=utf-8" : "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  }

  try {
    const fichas =
      provided.length > 0
        ? provided
        : normalizeFichaList(
            HAS_EXPLICIT_BACKEND
              ? await readJsonSafe(await fetch(`${API_BASE}/api/fichas-operacionais`, { cache: "no-store", signal: AbortSignal.timeout(9000) })) ?? []
              : [],
          );
    const text = payloadToText(fichas, format);
    return new NextResponse(text, {
      status: 200,
      headers: {
        "Content-Type": format === "txt" ? "text/plain; charset=utf-8" : "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (err) {
    console.error("[SIL] endpoint failed", { endpoint: "/api/fichas-operacionais/exportar", status: null, error: String(err), env: APP_ENV });
    return NextResponse.json({ ok: false, status_tecnico: "Serviço de exportação indisponível." }, { status: 502 });
  }
}
