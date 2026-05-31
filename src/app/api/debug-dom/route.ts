import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function POST(req: NextRequest) {
  try {
    const { html } = await req.json();
    fs.writeFileSync(path.join(process.cwd(), "debug-dom.html"), html, "utf8");
    console.log("[DEBUG DOM] DOM written to debug-dom.html successfully!");
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
