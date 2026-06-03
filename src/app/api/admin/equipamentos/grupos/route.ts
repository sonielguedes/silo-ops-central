export const runtime = "nodejs";
import { createClassificationCreateRoute, createClassificationListRoute } from "@/lib/equipment-classification-api";

export const GET = createClassificationListRoute("grupos");
export const POST = createClassificationCreateRoute("grupos");
