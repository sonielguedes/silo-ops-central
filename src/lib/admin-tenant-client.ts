export type AdminRole = "ADMIN_GLOBAL" | "ADMIN_EMPRESA";

export interface ApiEnvelope<T> {
  ok?: boolean;
  error?: string;
  [key: string]: unknown;
}

export async function fetchJson<T>(url: string, init?: RequestInit): Promise<{ ok: true; data: T } | { ok: false; error: string; status: number }> {
  const response = await fetch(url, {
    cache: "no-store",
    ...init,
  });

  const text = await response.text();
  let parsed: unknown = null;
  if (text.trim()) {
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = null;
    }
  }

  if (!response.ok) {
    const error = typeof parsed === "object" && parsed && "error" in parsed && typeof (parsed as ApiEnvelope<T>).error === "string"
      ? (parsed as ApiEnvelope<T>).error as string
      : `HTTP ${response.status}`;
    return { ok: false, error, status: response.status };
  }

  return { ok: true, data: (parsed as T) };
}

export function isTenantAdmin(role?: string | null): role is AdminRole {
  return role === "ADMIN_GLOBAL" || role === "ADMIN_EMPRESA";
}

