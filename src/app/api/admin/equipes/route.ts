export const runtime = "nodejs";
import { createWorkforceCreateRoute, createWorkforceListRoute } from "@/lib/workforce-api";
export const GET = createWorkforceListRoute("equipes");
export const POST = createWorkforceCreateRoute("equipes");
