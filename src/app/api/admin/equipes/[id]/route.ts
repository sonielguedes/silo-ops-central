export const runtime = "nodejs";
import { createWorkforceGetRoute, createWorkforceUpdateRoute } from "@/lib/workforce-api";
export const GET = createWorkforceGetRoute("equipes");
export const PUT = createWorkforceUpdateRoute("equipes");
