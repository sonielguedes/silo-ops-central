export const runtime = "nodejs";
import { createClassificationCreateRoute, createClassificationListRoute } from "@/lib/equipment-classification-api";

export const GET = createClassificationListRoute("estados");
export const POST = createClassificationCreateRoute("estados");
