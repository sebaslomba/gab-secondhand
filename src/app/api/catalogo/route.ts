import { NextResponse } from "next/server";
import { db, dbLista } from "@/lib/db";

export const dynamic = "force-dynamic";

// Catálogo con el estado actual de cada prenda (una reserva vencida ya viene como disponible).
export async function GET() {
  if (!dbLista) return NextResponse.json({ modo: "local" }, { status: 503 });
  const r = await db("catalogo?select=*&order=creada.desc");
  if (!r.ok) return NextResponse.json({ error: "db" }, { status: 502 });
  return NextResponse.json({ modo: "db", prendas: await r.json() }, { headers: { "Cache-Control": "no-store" } });
}
