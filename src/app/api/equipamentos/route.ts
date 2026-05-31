import { GET as getStatus } from "./status/route";

export async function GET() {
  return getStatus();
}
