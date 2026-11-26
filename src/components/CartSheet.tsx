"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ALIAS, ENVIO_INTERIOR, RESERVA_MIN, ZONAS_ENVIO, gs, waLink, type Prenda } from "@/lib/data";
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
  const [now, setNow] = useState(() => Date.now());
  const [copied, setCopied] = useState("Copiar");
  const aliasRef = useRef<HTMLElement>(null);
  const [zona, setZonaState] = useState("");
  const setZona = (z: string) => { setZonaState(z); try { localStorage.setItem(ZKEY, z); } catch { /* ignorar */ } };
  useEffect(() => {
    queueMicrotask(() => { try { setZonaState(localStorage.getItem(ZKEY) ?? ""); } catch { /* ignorar */ } });
  }, []);
  const [wasOpen, setWasOpen] = useState(cartOpen);
  if (cartOpen !== wasOpen) { setWasOpen(cartOpen); if (cartOpen) setCopied("Copiar"); }

  useEffect(() => {
    if (!reserved) return;
    const tick = () => setNow(Date.now());
    const first = setTimeout(tick, 0);
    const h = setInterval(tick, 1000);
    return () => { clearTimeout(first); clearInterval(h); };
  }, [reserved]);
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
  const totalReservado = reservadas.reduce((a, p) => a + p.p, 0) + (envio ?? 0);

  const left = reserved ? Math.max(0, Math.ceil((reserved.at + RESERVA_MIN * 60000 - now) / 1000)) : 0;
  const mm = String(Math.floor(left / 60)).padStart(2, "0"), ss = String(left % 60).padStart(2, "0");

  const copiar = async () => {
    try { await navigator.clipboard.writeText(ALIAS.alias); setCopied("Copiado"); }
    catch {
      const sel = window.getSelection(); const r = document.createRange();
      if (aliasRef.current && sel) { r.selectNodeContents(aliasRef.current); sel.removeAllRanges(); sel.addRange(r); }
      setCopied("Seleccionado");
    }
  };
  const simularPago = () => {
    const ids = reserved?.ids ?? [];
    closeCart();
    setTimeout(() => {
      ids.forEach(id => setEstado(id, "so"));
      finishOrder();
      toast(`Pago confirmado. ${ids.length === 1 ? "Tu prenda ya figura como vendida" : "Tus prendas ya figuran como vendidas"}.`, "sold");
    }, 350);
  };
  const comprobante = waLink(`Hola Gab! Ya transferí Gs. ${gs(totalReservado)} por mi pedido (${reservadas.map(p => p.id).join(", ")}). Te mando el comprobante.`);

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

              {reserved && reservadas.length > 0 ? (
                <div className="pay">
                  <div className="timer"><span>Reservadas para vos por</span><b>{mm}:{ss}</b></div>
                  <div className="alias">
                    <div><small>Alias para transferir</small><strong ref={aliasRef}>{ALIAS.alias}</strong></div>
                    <button className="copy" onClick={copiar}>{copied}</button>
                  </div>
                  <div className="alias"><div><small>Monto exacto{envio === null ? " (sin envío)" : " con envío"}</small><strong>Gs. {gs(totalReservado)}</strong></div></div>
                  {pendientes.length > 0 && (
                    <p className="demo-note" style={{ margin: 0 }}>Sumaste prendas nuevas: enviá el pedido otra vez para reservarlas también.</p>
                  )}
                  <button className="cta ghost" onClick={simularPago} style={{ marginTop: 0 }}>Simular pago confirmado</button>
                  <p className="demo-note" style={{ margin: 0 }}>Solo para la demo: así se ve cuando el pago se confirma.</p>
                </div>
              ) : (
                <p className="cart-note">Al enviar, te abrimos WhatsApp con la lista y las prendas quedan reservadas para vos {RESERVA_MIN} minutos mientras transferís.</p>
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
                <a className="cta wa-cta" target="_blank" rel="noopener" href={comprobante}><WhatsAppIcon />Enviar comprobante</a>
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
