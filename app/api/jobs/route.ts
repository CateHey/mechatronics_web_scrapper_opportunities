import { NextResponse } from "next/server";
import { collect } from "@/lib/collector";

export const dynamic = "force-dynamic";
export const maxDuration = 60; // permite consultar todas las fuentes
export const runtime = "nodejs";

export async function GET() {
  try {
    const result = await collect();
    return NextResponse.json(result, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Error al recolectar vacantes", jobs: [], perSource: {}, errors: [] },
      { status: 500 }
    );
  }
}
