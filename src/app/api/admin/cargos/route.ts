export const runtime = "nodejs";
import { createWorkforceCreateRoute, createWorkforceListRoute } from "@/lib/workforce-api";
export const GET = createWorkforceListRoute("cargos");
export const POST = createWorkforceCreateRoute("cargos");
