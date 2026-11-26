import type { Metadata } from "next";
import Link from "next/link";
import { POLITICAS } from "@/lib/politicas";
import { waLink } from "@/lib/data";

export const metadata: Metadata = {
  title: "Cómo trabajamos · Gab Secondhand",
  description: "Pedidos, pagos, envíos y devoluciones en Gab Secondhand.",
};

export default function Politicas() {
  return (
    <main className="view view-in">
      <section className="wrap policies-page">
        <h1>Cómo trabajamos</h1>
        <p className="lead">Las reglas de la tienda, claras y en un solo lugar.</p>
        <div className="policy-list">
          {POLITICAS.map(p => (
            <article key={p.id} id={p.id} className="glass">
              <h2>{p.t}</h2>
              <ul>{p.detalle.map(d => <li key={d}>{d}</li>)}</ul>
            </article>
          ))}
        </div>
        <p className="policy-foot">
          ¿Algo no quedó claro? <a href={waLink("Hola Gab! Tengo una duda sobre cómo funcionan los pedidos.")} target="_blank" rel="noopener">Escribinos por WhatsApp</a> o <Link href="/tienda">volvé a la tienda</Link>.
        </p>
      </section>
    </main>
  );
}
