export const runtime = "nodejs";
import { createClassificationGetRoute, createClassificationUpdateRoute } from "@/lib/equipment-classification-api";

export const GET = createClassificationGetRoute("perfis");
export const PUT = createClassificationUpdateRoute("perfis");
