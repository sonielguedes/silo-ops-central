export const runtime = "nodejs";
import { createClassificationGetRoute, createClassificationUpdateRoute } from "@/lib/equipment-classification-api";

export const GET = createClassificationGetRoute("grupos");
export const PUT = createClassificationUpdateRoute("grupos");
