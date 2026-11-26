"use client";
import type { Prenda } from "@/lib/data";
import { ESTADO_LABEL, gs } from "@/lib/data";
import { Garment } from "./Garment";
import { ClockIcon } from "./Icons";
import { useStore } from "./Store";

export function ProductCard({ it, index, animate }: { it: Prenda; index: number; animate: boolean }) {
  const { open, inCart } = useStore();
  const [lab, cls] = ESTADO_LABEL[it.st];
  const classes = ["card", "glass", it.st === "so" && "is-sold", it.st === "ho" && "is-hold", animate && "enter"].filter(Boolean).join(" ");
  return (
    <button className={classes} style={{ ["--i" as string]: Math.min(index, 12) }} onClick={() => open(it.id)}
      aria-label={`${it.t}, talle ${it.s}, ${gs(it.p)} guaraníes, ${lab}`}>
      <div className="ph" style={{ ["--tint" as string]: it.bg }}>
        <Garment it={it} />
        {inCart(it.id) && it.st !== "so" && <span className="incart">En tu carrito</span>}
        <div className="hold-ov"><span><ClockIcon />Reservada<small>Puede liberarse pronto</small></span></div>
        <div className="stamp"><i /><span>Vendida</span></div>
      </div>
      <div className="info">
        <div className="top"><span className="brand">{it.b}</span><span className="state"><i className={`dot ${cls}`} />{lab}</span></div>
        <div className="title-row"><h3>{it.t}</h3><span className="size-chip">Talle {it.s}</span></div>
        <div className="price"><small>Gs.</small>{gs(it.p)}</div>
      </div>
    </button>
  );
}
