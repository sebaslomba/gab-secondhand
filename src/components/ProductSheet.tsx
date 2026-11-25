"use client";
import { useEffect, useRef, useState } from "react";
import { ALIAS, ESTADO_LABEL, RESERVA_MIN, gs, waLink } from "@/lib/data";
import { Garment } from "./Garment";
import { useStore } from "./Store";

export function ProductSheet() {
  const { items, openId, close, setEstado, toast } = useStore();
  const it = items.find(i => i.id === openId) ?? null;
  const [reserved, setReserved] = useState(false);
  const [left, setLeft] = useState(RESERVA_MIN * 60);
  const [copied, setCopied] = useState("Copiar");
  const aliasRef = useRef<HTMLElement>(null);
  const [last, setLast] = useState(it);
  if (it && it !== last) setLast(it);
  const shown = it ?? last;

  useEffect(() => { setReserved(false); setLeft(RESERVA_MIN * 60); setCopied("Copiar"); }, [openId]);
  useEffect(() => {
    if (!reserved) return;
    const h = setInterval(() => setLeft(l => Math.max(0, l - 1)), 1000);
    return () => clearInterval(h);
  }, [reserved]);
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === "Escape" && close();
    document.addEventListener("keydown", k);
    return () => document.removeEventListener("keydown", k);
  }, [close]);

  const isOpen = !!it;
  const st = shown ? (reserved ? "ho" : shown.st) : "av";
  const [lab, cls] = ESTADO_LABEL[st];

  const reservar = () => { if (!shown) return; setEstado(shown.id, "ho"); setReserved(true); };
  const copiar = async () => {
    try { await navigator.clipboard.writeText(ALIAS.alias); setCopied("Copiado"); }
    catch {
      const sel = window.getSelection(); const r = document.createRange();
      if (aliasRef.current && sel) { r.selectNodeContents(aliasRef.current); sel.removeAllRanges(); sel.addRange(r); }
      setCopied("Seleccionado");
    }
  };
  const simularPago = () => {
    if (!shown) return; const p = shown; close();
    setTimeout(() => { setEstado(p.id, "so"); toast(`Pago confirmado. ${p.t} ya figura como vendida.`, "sold"); }, 350);
  };
  const mm = String(Math.floor(left / 60)).padStart(2, "0"), ss = String(left % 60).padStart(2, "0");

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
                  <Garment it={shown} />
                  <span className="status"><i className={`dot ${cls}`} />{lab}</span>
                  <span className="talle">{shown.s}</span>
                </div>
                <div className="s-info">
                  <h3 id="s-title">{shown.t}</h3>
                  <div className="facts"><span>{shown.b}</span><span>Talle {shown.s}</span><span>{shown.cond}</span><span>{shown.id}</span></div>
                  <div className="price"><small>Gs.</small>{gs(shown.p)}</div>
                  {shown.st === "ho" && !reserved && (
                    <p className="demo-note" style={{ textAlign: "left" }}>Otra persona la reservó. Si no se confirma el pago, vuelve a estar disponible.</p>
                  )}
                  {reserved && (
                    <>
                      <div className="pay">
                        <div className="timer"><span>Reservada para vos por</span><b>{mm}:{ss}</b></div>
                        <div className="alias">
                          <div><small>Alias para transferir</small><strong ref={aliasRef}>{ALIAS.alias}</strong></div>
                          <button className="copy" onClick={copiar}>{copied}</button>
                        </div>
                        <div className="alias"><div><small>Monto exacto</small><strong>Gs. {gs(shown.p)}</strong></div></div>
                      </div>
                      <button className="cta ghost" onClick={simularPago}>Simular pago confirmado</button>
                      <p className="demo-note">Solo para la demo: así se ve cuando el pago se confirma.</p>
                    </>
                  )}
                </div>
              </div>
            </div>
            <div className="s-foot">
              <button className="cta ghost" onClick={close}>Cerrar</button>
              <span style={{ flex: 1 }}>
                {reserved ? (
                  <a className="cta" target="_blank" rel="noopener"
                    href={waLink(`Hola Gab! Reservé "${shown.t}" (talle ${shown.s}, Gs. ${gs(shown.p)}). Código ${shown.id}. Te mando el comprobante.`)}>
                    Enviar comprobante
                  </a>
                ) : shown.st === "av" ? (
                  <button className="cta" onClick={reservar}>La quiero</button>
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
