export const runtime = "nodejs";
import { createClassificationCreateRoute, createClassificationListRoute } from "@/lib/equipment-classification-api";

export const GET = createClassificationListRoute("tipos");
export const POST = createClassificationCreateRoute("tipos");
