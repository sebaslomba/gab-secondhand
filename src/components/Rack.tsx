"use client";
import { enOferta, gs } from "@/lib/data";
import { Garment } from "./Garment";
import { useStore } from "./Store";

// Destacadas en formato "vidriera": tarjetas con arco en carrusel. No depende del ángulo ni del encuadre de la foto.
export function Rack() {
  const { items, open } = useStore();
  const picks = items.filter(i => i.st === "av").slice(0, 6);
  return (
    <section className="rackband" aria-label="Destacadas">
      <div className="hangers">
        {picks.map((it, k) => (
          <button key={it.id} className="hanger" style={{ ["--i" as string]: k }} onClick={() => open(it.id)}
            aria-label={`${it.t}, talle ${it.s}, ${gs(it.p)} guaraníes`}>
            <div className="glass">
              <div className="ph" style={{ ["--tint" as string]: it.bg }}><Garment it={it} />
                {enOferta(it) && <span className="sale-tag">Oferta</span>}</div>
              <div className={`meta${enOferta(it) ? " is-sale" : ""}`}><b>{gs(it.p)}{enOferta(it) && <s>{gs(it.pa!)}</s>}</b><small>Talle {it.s}</small></div>
            </div>
          </button>
        ))}
      </div>
    </section>
  );
}
