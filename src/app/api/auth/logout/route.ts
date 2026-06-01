import { NextResponse } from "next/server";
import { SESSION_COOKIE_NAME } from "@/lib/auth";

function clearSessionCookie(response: NextResponse) {
  response.cookies.set(SESSION_COOKIE_NAME, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
}

export async function POST() {
  const response = NextResponse.json({ ok: true });
  clearSessionCookie(response);
  return response;
}

export function GET() {
  return NextResponse.json({ ok: false, message: "Método não permitido." }, { status: 405 });
}
