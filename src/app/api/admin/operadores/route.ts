export const runtime = "nodejs";
import { createWorkforceCreateRoute, createWorkforceListRoute } from "@/lib/workforce-api";
export const GET = createWorkforceListRoute("operadores");
export const POST = createWorkforceCreateRoute("operadores");
