import { NextRequest, NextResponse } from "next/server";
import {
  buildSession,
  buildVisualProfile,
  canUseDemoLogin,
  canUseProdLogin,
  encodeSessionCookie,
  sanitizeReturnTo,
  SESSION_COOKIE_NAME,
  SESSION_MAX_AGE_SECONDS,
  DEMO_AUTH,
} from "@/lib/auth";

function jsonError(message: string, status = 401) {
  return NextResponse.json({ ok: false, message }, { status });
}

function setSessionCookie(response: NextResponse, sessionValue: string) {
  response.cookies.set(SESSION_COOKIE_NAME, sessionValue, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return jsonError("Corpo inválido.", 400);
  }

  const email = typeof body.email === "string" ? body.email : "";
  const password = typeof body.password === "string" ? body.password : "";
  const returnTo = sanitizeReturnTo(typeof body.returnTo === "string" ? body.returnTo : "/");
  const adminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL || "";
  const adminPassword = process.env.NEXT_PUBLIC_ADMIN_PASSWORD || "";

  let session = null as ReturnType<typeof buildSession> | null;

  if (canUseDemoLogin(email, password)) {
    session = buildSession(DEMO_AUTH.email, DEMO_AUTH.mode);
  } else if (canUseProdLogin(email, password, adminEmail, adminPassword)) {
    session = buildSession(email, "prod");
  }

  if (!session) {
    return jsonError("Credenciais inválidas. Verifique seu e-mail e senha.", 401);
  }

  const response = NextResponse.json({
    ok: true,
    session,
    profile: buildVisualProfile(session.email, session.mode),
    returnTo,
  });
  setSessionCookie(response, encodeSessionCookie(session));
  return response;
}

export function GET() {
  return jsonError("Método não permitido.", 405);
}
