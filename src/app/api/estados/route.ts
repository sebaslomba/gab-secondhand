import { NextResponse } from "next/server";
import { db, dbLista } from "@/lib/db";

export const dynamic = "force-dynamic";

// Estado actual de cada prenda (una reserva vencida ya viene como disponible).
export async function GET() {
  if (!dbLista) return NextResponse.json({ modo: "local" }, { status: 503 });
  const r = await db("catalogo?select=id,estado,reservada_hasta");
  if (!r.ok) return NextResponse.json({ error: "db" }, { status: 502 });
  return NextResponse.json({ modo: "db", estados: await r.json() }, { headers: { "Cache-Control": "no-store" } });
}
