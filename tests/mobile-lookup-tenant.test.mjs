import assert from "node:assert";
import { buildSession, decodeSessionCookie, encodeSessionCookie } from "../src/lib/auth.ts";

console.log("Testing session building with tenant_id...");
const session = buildSession("test@siloops.com.br", "prod", "silo-ops-001");
assert.strictEqual(session.tenant_id, "silo-ops-001");
assert.strictEqual(session.empresa_id, "SILOOPS");

console.log("Testing session encoding/decoding...");
const encoded = encodeSessionCookie(session);
const decoded = decodeSessionCookie(encoded);
assert.strictEqual(decoded.tenant_id, "silo-ops-001");

console.log("Verification successful!");
