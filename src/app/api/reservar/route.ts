import { NextResponse } from "next/server";
import { db, dbLista, type EstadoDb } from "@/lib/db";
import { RESERVA_MIN, ZONAS_ENVIO } from "@/lib/data";

export const dynamic = "force-dynamic";

type Body = { ids?: unknown; zona?: unknown; anterior?: unknown };
type Rpc =
  | { ok: true; pedido: string; codigo: string; vence: string }
  | { ok: false; no_disponibles: { id: string; estado: EstadoDb | "no_existe" }[] };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Reserva todo el carrito de una vez, o nada si alguna prenda ya no está libre.
export async function POST(req: Request) {
  if (!dbLista) return NextResponse.json({ modo: "local" }, { status: 503 });
  let b: Body;
  try { b = await req.json(); } catch { return NextResponse.json({ error: "json" }, { status: 400 }); }

  const ids = Array.isArray(b.ids) ? b.ids.filter((x): x is string => typeof x === "string" && x.length <= 40) : [];
  if (ids.length === 0 || ids.length > 30) return NextResponse.json({ error: "ids" }, { status: 400 });
  const zona = typeof b.zona === "string" ? b.zona.slice(0, 80) : "";
  // El envío se toma de la tabla del servidor, no de lo que mande el navegador.
  const envio = ZONAS_ENVIO.find(z => z.z === zona)?.m ?? 0;
  const anterior = typeof b.anterior === "string" && UUID.test(b.anterior) ? b.anterior : null;

  const r = await db("rpc/reservar_prendas", {
    method: "POST",
    body: JSON.stringify({ p_ids: ids, p_zona: zona, p_envio: envio, p_minutos: RESERVA_MIN, p_anterior: anterior }),
  });
  if (!r.ok) return NextResponse.json({ error: "db" }, { status: 502 });
  const out = (await r.json()) as Rpc;
  return NextResponse.json(out, { status: out.ok ? 200 : 409 });
}
