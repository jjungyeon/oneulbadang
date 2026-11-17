import { NextResponse } from "next/server";
import { buildAllReadings } from "@/lib/adapters";
import { unavailableReadings } from "@/lib/readings";

export const runtime = "nodejs";
// Allow the bounded upstream requests to complete on the deployment platform.
export const maxDuration = 30;
export async function GET() {
  try {
    return NextResponse.json({ readings: await buildAllReadings() }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ readings: unavailableReadings() }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
