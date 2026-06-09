import { NextResponse } from "next/server";
import { collect, type Country } from "@/lib/collector";

export const dynamic = "force-dynamic";
export const maxDuration = 60; // permite consultar todas las fuentes
export const runtime = "nodejs";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const country = (searchParams.get("country") === "AU" ? "AU" : "PE") as Country;
  try {
    const result = await collect(country);
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
