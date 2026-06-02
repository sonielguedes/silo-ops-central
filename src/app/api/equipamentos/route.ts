import type { NextRequest } from "next/server";
import { GET as getStatus } from "./status/route";

export async function GET(req: NextRequest) {
  return getStatus(req);
}
