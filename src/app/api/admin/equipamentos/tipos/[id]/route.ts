export const runtime = "nodejs";
import { createClassificationGetRoute, createClassificationUpdateRoute } from "@/lib/equipment-classification-api";

export const GET = createClassificationGetRoute("tipos");
export const PUT = createClassificationUpdateRoute("tipos");
