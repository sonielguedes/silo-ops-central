export const runtime = "nodejs";
import { createClassificationCreateRoute, createClassificationListRoute } from "@/lib/equipment-classification-api";

export const GET = createClassificationListRoute("perfis");
export const POST = createClassificationCreateRoute("perfis");
