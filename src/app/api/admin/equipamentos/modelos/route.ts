export const runtime = "nodejs";
import { createClassificationCreateRoute, createClassificationListRoute } from "@/lib/equipment-classification-api";

export const GET = createClassificationListRoute("modelos");
export const POST = createClassificationCreateRoute("modelos");
