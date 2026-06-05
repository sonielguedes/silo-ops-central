import { NextRequest, NextResponse } from "next/server";
import { type SessionPayload } from "@/lib/auth";
import { getSessionFromRequest } from "@/lib/auth-server";
import { canViewTenantAdmin, canWriteTenantAdmin } from "@/lib/admin-tenant-store";

export function unauthorized() {
  return NextResponse.json({ error: "unauthorized" }, { status: 401 });
}

export function forbidden() {
  return NextResponse.json({ error: "forbidden" }, { status: 403 });
}

export async function requireSession(req: NextRequest): Promise<SessionPayload | null> {
  return getSessionFromRequest(req);
}

export function canReadAdminTenant(profile: SessionPayload | null) {
  return canViewTenantAdmin(profile);
}

export function canWriteAdminTenant(profile: SessionPayload | null) {
  return canWriteTenantAdmin(profile);
}

export async function readJsonBody(request: NextRequest) {
  const body = await request.json().catch(() => null);
  return body && typeof body === "object" ? body as Record<string, unknown> : null;
}
