"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { ENVIO_INTERIOR, RESERVA_MIN, ZONAS_ENVIO, gs, waLink, type Prenda } from "@/lib/data";
import { Garment } from "./Garment";
import { ChevronIcon, TrashIcon, WhatsAppIcon } from "./Icons";
import { useStore } from "./Store";

const ZKEY = "gab-zona";
const precioZona = (z: string) => ZONAS_ENVIO.find(x => x.z === z)?.m ?? null;

// Formato de WhatsApp: "> " al inicio de la línea se ve como cita y *texto* sale en negrita.
export const pedidoTexto = (ps: Prenda[], zona: string) => {
  const sub = ps.reduce((a, p) => a + p.p, 0);
  const envio = precioZona(zona);
  return [
    "Hola Gab! Quiero estos productos:",
    ...ps.map(p => `> ${p.t} *[${p.id}]* · Gs. ${gs(p.p)}`),
    "",
    `Prendas: Gs. ${gs(sub)}`,
    envio !== null ? `Envío a ${zona}: Gs. ${gs(envio)}` : "Envío al interior por Multienvíos: a cotizar",
    envio !== null ? `*Total a pagar: Gs. ${gs(sub + envio)}*` : `*Total prendas: Gs. ${gs(sub)}* (falta sumar el envío)`,
  ].join("\n");
};

export function CartSheet() {
  const { items, cart, cartOpen, closeCart, removeFromCart, reserved, reserveCart, finishOrder, setEstado, toast } = useStore();
  const [zona, setZonaState] = useState("");
  const setZona = (z: string) => { setZonaState(z); try { localStorage.setItem(ZKEY, z); } catch { /* ignorar */ } };
  useEffect(() => {
    queueMicrotask(() => { try { setZonaState(localStorage.getItem(ZKEY) ?? ""); } catch { /* ignorar */ } });
  }, []);

  useEffect(() => {
    if (!cartOpen) return;
    const k = (e: KeyboardEvent) => e.key === "Escape" && closeCart();
    document.addEventListener("keydown", k);
    return () => document.removeEventListener("keydown", k);
  }, [cartOpen, closeCart]);

  const lines = cart.map(id => items.find(i => i.id === id)).filter((x): x is Prenda => !!x);
  const mine = (p: Prenda) => !!reserved?.ids.includes(p.id);
  const ok = (p: Prenda) => mine(p) || p.st === "av";
  const vigentes = lines.filter(ok);
  const pendientes = vigentes.filter(p => !mine(p));
  const reservadas = vigentes.filter(mine);
  const total = vigentes.reduce((a, p) => a + p.p, 0);
  const envio = precioZona(zona);
  const enviado = !!reserved && reservadas.length > 0;

  // Empezar de cero: libera lo apartado y vacía el carrito.
  const nuevoPedido = () => {
    reserved?.ids.forEach(id => setEstado(id, "av"));
    finishOrder();
    toast("Listo, empezaste un pedido nuevo.");
  };

  return (
    <>
      <div className={`scrim${cartOpen ? " open" : ""}`} onClick={closeCart} />
      <div className={`sheet cart${cartOpen ? " open" : ""}`} role="dialog" aria-modal="true" aria-labelledby="c-title" aria-hidden={!cartOpen}>
        <div className="s-body">
          <div className="grabber" />
          <div className="cart-head">
            <h3 id="c-title">Tu carrito</h3>
            {lines.length > 0 && <span>{lines.length} {lines.length === 1 ? "prenda" : "prendas"}</span>}
          </div>

          {lines.length === 0 ? (
            <div className="cart-empty">
              <b>Todavía no elegiste nada</b>
              <span>Tocá una prenda y elegí “Agregar al carrito”. Podés sumar todas las que quieras.</span>
              <Link href="/tienda" className="cta" onClick={closeCart}>Ver la tienda</Link>
            </div>
          ) : (
            <>
              <ul className="cart-list">
                {lines.map(p => (
                  <li key={p.id} className={ok(p) ? undefined : "gone"}>
                    <div className="thumbph ph" style={{ ["--tint" as string]: p.bg }}><Garment it={p} /></div>
                    <div className="t">
                      <b>{p.t}</b>
                      <small>
                        {ok(p) ? <>Talle {p.s} · {p.id}{mine(p) && <em> · Reservada</em>}</> : p.st === "so" ? "Ya se vendió" : "Otra persona la reservó"}
                      </small>
                      <span className="p">Gs. {gs(p.p)}</span>
                    </div>
                    <button className="rm" onClick={() => removeFromCart(p.id)} aria-label={`Quitar ${p.t}`}><TrashIcon /></button>
                  </li>
                ))}
              </ul>
              <label className="zona">
                <span>Envío</span>
                <span className="zona-pick">
                  <select value={zona} onChange={e => setZona(e.target.value)} aria-label="Zona de envío">
                    <option value="" disabled>Elegí tu zona</option>
                    <optgroup label="Gran Asunción, delivery en moto">
                      {ZONAS_ENVIO.map(x => <option key={x.z} value={x.z}>{x.z} · Gs. {gs(x.m)}</option>)}
                    </optgroup>
                    <optgroup label="Resto del país">
                      <option value={ENVIO_INTERIOR}>{ENVIO_INTERIOR} · a cotizar</option>
                    </optgroup>
                  </select>
                  <ChevronIcon />
                </span>
              </label>
              {zona === ENVIO_INTERIOR && <p className="cart-note" style={{ marginTop: 6 }}>Al interior enviamos por Multienvíos. Gab te pasa el costo por WhatsApp.</p>}
              <div className="cart-sum">
                <div><span>Prendas</span><span>Gs. {gs(total)}</span></div>
                <div><span>Envío</span><span>{!zona ? "Elegí tu zona" : envio !== null ? `Gs. ${gs(envio)}` : "A cotizar"}</span></div>
              </div>
              <div className="cart-total"><span>Total a pagar</span><b><small>Gs.</small>{gs(total + (envio ?? 0))}</b></div>

              {enviado ? (
                <div className="sent">
                  <b>Pedido enviado</b>
                  <p>Gab te responde por WhatsApp para confirmar las prendas y pasarte los datos de pago. Mientras tanto las apartamos para vos {RESERVA_MIN} minutos.</p>
                  {pendientes.length > 0 && <p>Sumaste prendas nuevas: tocá “Enviar” otra vez para mandar el pedido completo.</p>}
                  <button type="button" className="linkish" onClick={nuevoPedido}>Empezar un pedido nuevo</button>
                </div>
              ) : (
                <p className="cart-note">Al enviar, te abrimos WhatsApp con tu pedido. Gab te confirma las prendas y te pasa los datos de pago.</p>
              )}
            </>
          )}
        </div>
        {lines.length > 0 && (
          <div className="s-foot">
            <button className="cta ghost" onClick={closeCart}>Volver</button>
            <span style={{ flex: 1, minWidth: 0 }}>
              {pendientes.length > 0 && !zona ? (
                <button className="cta" disabled>Elegí tu zona de envío</button>
              ) : pendientes.length > 0 ? (
                <a className="cta wa-cta" target="_blank" rel="noopener" href={waLink(pedidoTexto(vigentes, zona))} onClick={reserveCart}>
                  <WhatsAppIcon />Enviar
                </a>
              ) : reservadas.length > 0 ? (
                <a className="cta wa-cta" target="_blank" rel="noopener" href={waLink(pedidoTexto(reservadas, zona))}><WhatsAppIcon />Abrir WhatsApp</a>
              ) : (
                <button className="cta" disabled>Nada disponible</button>
              )}
            </span>
          </div>
        )}
      </div>
    </>
  );
}
