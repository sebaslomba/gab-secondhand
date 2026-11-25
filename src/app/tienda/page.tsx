"use client";
import { useEffect, useRef, useState } from "react";
import { CATEGORIAS, TALLES } from "@/lib/data";
import { useStore } from "@/components/Store";
import { ProductCard } from "@/components/ProductCard";
import { Segmented } from "@/components/Segmented";

export default function Tienda() {
  const { items } = useStore();
  const [cat, setCat] = useState("Todo");
  const [size, setSize] = useState<string | null>(null);
  const [anim, setAnim] = useState(0);
  const head = useRef<HTMLElement>(null);

  const list = items
    .filter(i => (cat === "Todo" || i.c === cat) && (!size || i.s === size))
    .sort((a, b) => Number(a.st === "so") - Number(b.st === "so"));
  const filtered = cat !== "Todo" || !!size;
  const n = list.filter(i => i.st !== "so").length;
  const what = cat === "Todo" ? "prendas" : cat.toLowerCase();

  const change = (fn: () => void) => {
    fn(); setAnim(a => a + 1);
    const top = head.current?.getBoundingClientRect().top ?? 0;
    if (top < 0) head.current?.scrollIntoView({ behavior: "smooth" });
  };
  useEffect(() => { window.scrollTo(0, 0); }, []);

  return (
    <main className="view view-in">
      <section className="wrap shop" id="catalogo" ref={head}>
        <div className="shop-head">
          <div>
            <h2>{!filtered ? "Recién llegadas" : `${cat === "Todo" ? "Todo" : cat}${size ? `, talle ${size}` : ""}`}</h2>
            <p className="result">{!filtered ? "Tocá una prenda para verla de cerca y reservarla." : `${n} ${n === 1 ? "prenda disponible" : "prendas disponibles"}`}</p>
          </div>
          <Segmented label="Categoría" options={CATEGORIAS} value={cat} onChange={v => change(() => setCat(v))} />
        </div>
        <div className="sizes" role="group" aria-label="Talle">
          <button type="button" className="size all" aria-pressed={!size} onClick={() => change(() => setSize(null))}>Todos los talles</button>
          {TALLES.map(t => (
            <button key={t} type="button" className="size" aria-pressed={size === t} onClick={() => change(() => setSize(size === t ? null : t))}>{t}</button>
          ))}
        </div>
        <div className="grid" key={anim}>
          {list.length ? list.map((it, k) => <ProductCard key={it.id} it={it} index={k} animate={anim > 0} />) : (
            <div className="empty">
              <b>No hay {what} en talle {size}</b>
              <span>Sacá el talle para ver {cat === "Todo" ? "todo" : `todas las ${what}`}, o escribinos y te avisamos cuando entre una.</span>
              <button type="button" onClick={() => change(() => setSize(null))}>Ver todos los talles</button>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
