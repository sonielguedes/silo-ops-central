import type { NextRequest } from "next/server";
import { readAdminTenantStore, getCompanyByToken } from "./admin-tenant-store";
import {
  buildSession,
  decodeSessionCookie,
  SESSION_COOKIE_NAME,
  type SessionPayload,
} from "./auth";

export async function getSessionFromRequest(request: NextRequest): Promise<SessionPayload | null> {
  const cookieRaw = request.cookies.get(SESSION_COOKIE_NAME)?.value || null;
  const cookieSession = decodeSessionCookie(cookieRaw);
  if (cookieSession) return cookieSession;

  const companyToken = request.headers.get("x-company-token");
  if (companyToken) {
    const store = await readAdminTenantStore();
    const company = getCompanyByToken(store, companyToken);
    if (company) {
      return buildSession(company.empresa_id + "@mobile.internal", "prod", company.tenant_id);
    }
  }

  return null;
}
