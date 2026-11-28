"use client";
import { useEffect, useState } from "react";
import { ESTADO_LABEL, enOferta, gs } from "@/lib/data";
import { Garment } from "./Garment";
import { useStore } from "./Store";

export function ProductSheet() {
  const { items, openId, close, toast, inCart, addToCart, openCart, reserved } = useStore();
  const it = items.find(i => i.id === openId) ?? null;
  const [last, setLast] = useState(it);
  if (it && it !== last) setLast(it);
  const shown = it ?? last;

  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === "Escape" && close();
    document.addEventListener("keydown", k);
    return () => document.removeEventListener("keydown", k);
  }, [close]);

  const isOpen = !!it;
  const mine = !!shown && !!reserved?.ids.includes(shown.id);
  const added = !!shown && inCart(shown.id);
  const [lab, cls] = mine ? ["Reservada para vos", "hold"] : ESTADO_LABEL[shown?.st ?? "av"];

  const agregar = () => {
    if (!shown) return;
    addToCart(shown.id);
    close();
    toast(`${shown.t} se sumó a tu carrito.`);
  };

  return (
    <>
      <div className={`scrim${isOpen ? " open" : ""}`} onClick={close} />
      <div className={`sheet${isOpen ? " open" : ""}`} role="dialog" aria-modal="true" aria-labelledby="s-title" aria-hidden={!isOpen}>
        {shown && (
          <>
            <div className="s-body">
              <div className="grabber" />
              <div className="s-grid">
                <div className="ph s-photo" style={{ ["--tint" as string]: shown.bg }}>
                  <Garment it={shown} todas />
                  <span className="status"><i className={`dot ${cls}`} />{lab}</span>
                  <span className="talle">{shown.s}</span>
                </div>
                <div className="s-info">
                  <h3 id="s-title">{shown.t}</h3>
                  <div className="facts"><span>{shown.b}</span><span>Talle {shown.s}</span><span>{shown.cond}</span><span>{shown.id}</span></div>
                  <div className="price"><small>Gs.</small>{gs(shown.p)}{enOferta(shown) && <s className="was">{gs(shown.pa!)}</s>}</div>
                  {shown.st === "ho" && !mine && (
                    <p className="demo-note" style={{ textAlign: "left" }}>Otra persona la reservó. Si no se confirma el pago, vuelve a estar disponible.</p>
                  )}
                  {added && shown.st !== "so" && (
                    <p className="in-cart-note">{mine ? "Está en tu pedido reservado." : "Ya está en tu carrito."}</p>
                  )}
                </div>
              </div>
            </div>
            <div className="s-foot">
              <button className="cta ghost" onClick={close}>Cerrar</button>
              <span style={{ flex: 1 }}>
                {added && (mine || shown.st === "av") ? (
                  <button className="cta" onClick={openCart}>Ver carrito</button>
                ) : shown.st === "av" ? (
                  <button className="cta" onClick={agregar}>Agregar al carrito</button>
                ) : (
                  <button className="cta" disabled>{shown.st === "ho" ? "Reservada" : "Ya se vendió"}</button>
                )}
              </span>
            </div>
          </>
        )}
      </div>
    </>
  );
}
