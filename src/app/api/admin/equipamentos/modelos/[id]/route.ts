export const runtime = "nodejs";
import { createClassificationGetRoute, createClassificationUpdateRoute } from "@/lib/equipment-classification-api";

export const GET = createClassificationGetRoute("modelos");
export const PUT = createClassificationUpdateRoute("modelos");
