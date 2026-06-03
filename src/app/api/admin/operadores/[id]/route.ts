export const runtime = "nodejs";
import { createWorkforceGetRoute, createWorkforceUpdateRoute } from "@/lib/workforce-api";
export const GET = createWorkforceGetRoute("operadores");
export const PUT = createWorkforceUpdateRoute("operadores");
