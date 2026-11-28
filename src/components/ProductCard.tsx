"use client";
import type { Prenda } from "@/lib/data";
import { ESTADO_LABEL, enOferta, gs } from "@/lib/data";
import { Garment } from "./Garment";
import { useStore } from "./Store";

export function ProductCard({ it, index, animate }: { it: Prenda; index: number; animate: boolean }) {
  const { open, inCart } = useStore();
  const [lab, cls] = ESTADO_LABEL[it.st];
  const sold = it.st === "so";
  const oferta = enOferta(it);
  // Un solo listón por tarjeta: vendida pesa más que reservada, y reservada más que oferta.
  const liston = sold ? ["Vendida", "sold"] : it.st === "ho" ? ["Reservada", "hold"] : oferta ? ["Oferta", "sale"] : null;
  const classes = ["card", "glass", sold && "is-sold", it.st === "ho" && "is-hold", oferta && !sold && "is-sale", animate && "enter"].filter(Boolean).join(" ");
  return (
    <button className={classes} style={{ ["--i" as string]: Math.min(index, 12) }} onClick={() => !sold && open(it.id)}
      aria-disabled={sold || undefined}
      aria-label={`${it.t}, talle ${it.s}, ${gs(it.p)} guaraníes, ${oferta && !sold ? "en oferta, " : ""}${lab}`}>
      <div className="ph" style={{ ["--tint" as string]: it.bg }}>
        <Garment it={it} />
        {inCart(it.id) && !sold && <span className="incart">En tu carrito</span>}
        {liston && <div className={`ribbon ${liston[1]}`} aria-hidden><span>{liston[0]}</span></div>}
      </div>
      <div className="info">
        <div className="top"><span className="brand">{it.b}</span><span className="state"><i className={`dot ${cls}`} />{lab}</span></div>
        <div className="title-row"><h3>{it.t}</h3><span className="size-chip">Talle {it.s}</span></div>
        <div className="price"><small>Gs.</small>{gs(it.p)}{oferta && <s className="was">{gs(it.pa!)}</s>}</div>
      </div>
    </button>
  );
}
