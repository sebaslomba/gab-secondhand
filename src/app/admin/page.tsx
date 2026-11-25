"use client";
import { useState } from "react";
import { ESTADO_LABEL, GASTOS, gs, type Estado } from "@/lib/data";
import { useStore } from "@/components/Store";
import { Garment } from "@/components/Garment";
import { Segmented } from "@/components/Segmented";

const OPCIONES = ["Disponible", "Reservada", "Vendida"];
const A_ESTADO: Record<string, Estado> = { Disponible: "av", Reservada: "ho", Vendida: "so" };
// Ventas anteriores del mes, de ejemplo, hasta tener la base de datos.
const VENTAS_PREVIAS = { monto: 640000, cantidad: 8 };

export default function Admin() {
  const { items, setEstado, toast } = useStore();
  const [logged, setLogged] = useState(false);

  if (!logged) {
    return (
      <main className="wrap admin view view-in">
        <form className="login" onSubmit={e => { e.preventDefault(); setLogged(true); }}>
          <h1>Panel de Gab</h1>
          <p>Solo para la administración de la tienda.</p>
          <label htmlFor="lg-mail">Email<input id="lg-mail" type="email" autoComplete="username" defaultValue="gab@ejemplo.com" /></label>
          <label htmlFor="lg-pass">Contraseña<input id="lg-pass" type="password" autoComplete="current-password" defaultValue="demo1234" /></label>
          <button className="cta" type="submit">Ingresar</button>
          <p className="demo-note">Por ahora cualquier dato entra. Con la base de datos, solo la cuenta de la dueña.</p>
        </form>
      </main>
    );
  }

  const vendidas = items.filter(i => i.st === "so");
  const ingresos = vendidas.reduce((a, i) => a + i.p, 0) + VENTAS_PREVIAS.monto;
  const gastos = GASTOS.reduce((a, g) => a + g.m, 0);

  return (
    <main className="wrap admin view view-in">
      <div className="admin-head">
        <div>
          <h1>Panel de la tienda</h1>
          <p>Noviembre 2026. Los cambios de estado se ven al instante en la tienda.</p>
        </div>
        <span className="sample">Datos de ejemplo</span>
      </div>
      <div className="kpis">
        <div className="kpi main"><small>Ganancia del mes</small><b>Gs. {gs(ingresos - gastos)}</b></div>
        <div className="kpi"><small>Ingresos</small><b>Gs. {gs(ingresos)}</b></div>
        <div className="kpi"><small>Gastos</small><b>Gs. {gs(gastos)}</b></div>
        <div className="kpi"><small>Prendas vendidas</small><b>{vendidas.length + VENTAS_PREVIAS.cantidad}</b></div>
      </div>
      <div className="cols">
        <section className="panel">
          <h2>Prendas</h2>
          {items.map(it => (
            <div className="row" key={it.id}>
              <div className="thumbph ph" style={{ ["--tint" as string]: it.bg }}><Garment it={it} /></div>
              <div className="t"><b>{it.t}</b><small>Talle {it.s}, Gs. {gs(it.p)}</small></div>
              <Segmented label={`Estado de ${it.t}`} options={OPCIONES} value={ESTADO_LABEL[it.st][0]}
                onChange={o => { setEstado(it.id, A_ESTADO[o]); toast(`${it.t}: ${o.toLowerCase()}`, ESTADO_LABEL[A_ESTADO[o]][1]); }} />
            </div>
          ))}
        </section>
        <section className="panel">
          <h2>Gastos recientes</h2>
          {GASTOS.map(g => (
            <div className="exp" key={g.t}><span>{g.t}<small>{g.d}, {g.cat}</small></span><span>Gs. {gs(g.m)}</span></div>
          ))}
        </section>
      </div>
    </main>
  );
}
