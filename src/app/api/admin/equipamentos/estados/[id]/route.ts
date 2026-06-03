export const runtime = "nodejs";
import { createClassificationGetRoute, createClassificationUpdateRoute } from "@/lib/equipment-classification-api";

export const GET = createClassificationGetRoute("estados");
export const PUT = createClassificationUpdateRoute("estados");
