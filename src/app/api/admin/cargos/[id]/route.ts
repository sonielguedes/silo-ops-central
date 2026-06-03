export const runtime = "nodejs";
import { createWorkforceGetRoute, createWorkforceUpdateRoute } from "@/lib/workforce-api";
export const GET = createWorkforceGetRoute("cargos");
export const PUT = createWorkforceUpdateRoute("cargos");
