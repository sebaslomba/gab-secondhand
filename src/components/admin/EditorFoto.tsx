"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

// Editor de una foto con el mismo marco 3:4 de las tarjetas de la tienda.
// La vista previa es en vivo; al guardar se genera un JPEG ya recortado y ajustado,
// así la tienda muestra la foto tal cual sin cambiar nada.

export type Ajustes = { brillo: number; contraste: number; color: number; zoom: number; x: number; y: number };
export const AJUSTES_INICIALES: Ajustes = { brillo: 100, contraste: 100, color: 100, zoom: 1, x: 0, y: 0 };

const SALIDA_W = 1200, SALIDA_H = 1600; // 3:4
const FONDO = "#F5F0E6"; // marfil de la tienda, se ve si se achica la foto
const ZOOM_MIN = 0.5, ZOOM_MAX = 3;

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));

// Dibuja la foto en el marco: zoom 1 = cubre todo el marco (como la tarjeta); x/y = corrimiento en fracción del marco.
function dibujar(ctx: CanvasRenderingContext2D, img: ImageBitmap, w: number, h: number, a: Ajustes) {
  const base = Math.max(w / img.width, h / img.height);
  const s = base * a.zoom;
  const dw = img.width * s, dh = img.height * s;
  ctx.fillStyle = FONDO;
  ctx.fillRect(0, 0, w, h);
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(img, w / 2 + a.x * w - dw / 2, h / 2 + a.y * h - dh / 2, dw, dh);
}

// Hasta dónde se puede mover: con zoom ≥ 1 sin dejar bordes vacíos; achicada, hasta el borde del marco.
function limitar(a: Ajustes, img: ImageBitmap | null, w = 3, h = 4): Ajustes {
  if (!img) return a;
  const s = Math.max(w / img.width, h / img.height) * a.zoom;
  const mx = Math.abs(img.width * s - w) / 2 / w, my = Math.abs(img.height * s - h) / 2 / h;
  return { ...a, x: clamp(a.x, -mx, mx), y: clamp(a.y, -my, my) };
}

const filtroCss = (a: Ajustes) => `brightness(${a.brillo}%) contrast(${a.contraste}%) saturate(${a.color}%)`;

// Mismos cálculos que los filtros CSS, para navegadores sin ctx.filter (Safari viejo).
function filtrarPixeles(ctx: CanvasRenderingContext2D, w: number, h: number, a: Ajustes) {
  const d = ctx.getImageData(0, 0, w, h), p = d.data;
  const b = a.brillo / 100, c = a.contraste / 100, s = a.color / 100;
  const m = [
    0.213 + 0.787 * s, 0.715 - 0.715 * s, 0.072 - 0.072 * s,
    0.213 - 0.213 * s, 0.715 + 0.285 * s, 0.072 - 0.072 * s,
    0.213 - 0.213 * s, 0.715 - 0.715 * s, 0.072 + 0.928 * s,
  ];
  const k = (v: number) => (v * b - 127.5) * c + 127.5;
  for (let i = 0; i < p.length; i += 4) {
    const r = k(p[i]), g = k(p[i + 1]), bl = k(p[i + 2]);
    p[i] = r * m[0] + g * m[1] + bl * m[2];
    p[i + 1] = r * m[3] + g * m[4] + bl * m[5];
    p[i + 2] = r * m[6] + g * m[7] + bl * m[8];
  }
  ctx.putImageData(d, 0, 0);
}

async function cargar(src: string): Promise<ImageBitmap> {
  const r = await fetch(src, { cache: "no-store" });
  if (!r.ok) throw new Error("foto");
  const bmp = await createImageBitmap(await r.blob());
  // Se trabaja con una copia de hasta 2400 px para que el celular mueva la vista previa sin trabarse.
  const esc = Math.min(1, 2400 / Math.max(bmp.width, bmp.height));
  if (esc === 1) return bmp;
  const chica = await createImageBitmap(bmp, { resizeWidth: Math.round(bmp.width * esc), resizeHeight: Math.round(bmp.height * esc), resizeQuality: "high" });
  bmp.close();
  return chica;
}

export async function exportar(img: ImageBitmap, a: Ajustes): Promise<Blob> {
  const base = document.createElement("canvas");
  base.width = SALIDA_W; base.height = SALIDA_H;
  dibujar(base.getContext("2d")!, img, SALIDA_W, SALIDA_H, a);
  const neutro = a.brillo === 100 && a.contraste === 100 && a.color === 100;
  let final = base;
  if (!neutro) {
    final = document.createElement("canvas");
    final.width = SALIDA_W; final.height = SALIDA_H;
    const ctx = final.getContext("2d")!;
    if ("filter" in ctx && typeof ctx.filter === "string") {
      ctx.filter = filtroCss(a);
      ctx.drawImage(base, 0, 0);
      ctx.filter = "none";
    } else {
      ctx.drawImage(base, 0, 0);
      filtrarPixeles(ctx, SALIDA_W, SALIDA_H, a);
    }
  }
  return new Promise((ok, mal) => final.toBlob(b => (b ? ok(b) : mal(new Error("foto"))), "image/jpeg", 0.88));
}

type Props = {
  src: string;
  inicial?: Ajustes;
  onCancelar: () => void;
  onGuardar: (foto: Blob, ajustes: Ajustes) => Promise<void>;
};

export function EditorFoto({ src, inicial, onCancelar, onGuardar }: Props) {
  const lienzo = useRef<HTMLCanvasElement>(null);
  const [img, setImg] = useState<ImageBitmap | null>(null);
  const [a, setA] = useState<Ajustes>(inicial ?? AJUSTES_INICIALES);
  const [error, setError] = useState("");
  const [guardando, setGuardando] = useState(false);
  const dedos = useRef(new Map<number, { x: number; y: number }>());
  const gesto = useRef<{ dist: number; zoom: number } | null>(null);

  useEffect(() => {
    let vivo = true;
    let cargada: ImageBitmap | null = null;
    cargar(src).then(b => { if (vivo) { cargada = b; setImg(b); } else b.close(); })
      .catch(() => vivo && setError("No se pudo abrir la foto. Probá de nuevo."));
    return () => { vivo = false; cargada?.close(); };
  }, [src]);

  // Bloquea el scroll de atrás mientras el editor está abierto.
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") onCancelar(); };
    window.addEventListener("keydown", esc);
    return () => { document.body.style.overflow = prev; window.removeEventListener("keydown", esc); };
  }, [onCancelar]);

  // Redibuja la vista previa (la luz y el color los pone el filtro CSS, en vivo).
  useEffect(() => {
    const c = lienzo.current;
    if (!c || !img) return;
    const r = c.getBoundingClientRect();
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = Math.round(r.width * dpr), h = Math.round(r.height * dpr);
    if (c.width !== w || c.height !== h) { c.width = w; c.height = h; }
    dibujar(c.getContext("2d")!, img, w, h, a);
  }, [img, a]);

  const cambiar = useCallback((p: Partial<Ajustes>) => setA(x => limitar({ ...x, ...p }, img)), [img]);

  const abajo = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    dedos.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (dedos.current.size === 2) {
      const [p, q] = [...dedos.current.values()];
      gesto.current = { dist: Math.hypot(p.x - q.x, p.y - q.y), zoom: a.zoom };
    }
  };
  const mover = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const antes = dedos.current.get(e.pointerId);
    if (!antes) return;
    const ahora = { x: e.clientX, y: e.clientY };
    dedos.current.set(e.pointerId, ahora);
    const r = e.currentTarget.getBoundingClientRect();
    if (dedos.current.size === 2 && gesto.current) {
      // Pellizcar con dos dedos = zoom
      const [p, q] = [...dedos.current.values()];
      const d = Math.hypot(p.x - q.x, p.y - q.y);
      cambiar({ zoom: clamp(gesto.current.zoom * (d / gesto.current.dist), ZOOM_MIN, ZOOM_MAX) });
      return;
    }
    // Arrastrar con un dedo = mover la foto
    setA(x => limitar({ ...x, x: x.x + (ahora.x - antes.x) / r.width, y: x.y + (ahora.y - antes.y) / r.height }, img));
  };
  const arriba = (e: React.PointerEvent<HTMLCanvasElement>) => {
    dedos.current.delete(e.pointerId);
    if (dedos.current.size < 2) gesto.current = null;
  };
  const rueda = (e: React.WheelEvent) => {
    cambiar({ zoom: clamp(a.zoom * (e.deltaY < 0 ? 1.08 : 1 / 1.08), ZOOM_MIN, ZOOM_MAX) });
  };

  const guardar = async () => {
    if (!img) return;
    setGuardando(true); setError("");
    try {
      await onGuardar(await exportar(img, a), a);
    } catch {
      setError("No se pudo guardar la foto. Probá de nuevo.");
      setGuardando(false);
    }
  };

  const tocado = JSON.stringify(a) !== JSON.stringify(AJUSTES_INICIALES);
  const control = (k: "brillo" | "contraste" | "color", nombre: string) => (
    <label className="fe-ctrl">
      <span>{nombre}<b>{a[k] - 100 > 0 ? "+" : ""}{a[k] - 100}</b></span>
      <input type="range" min={50} max={150} step={1} value={a[k]} onChange={e => cambiar({ [k]: Number(e.target.value) })}
        onDoubleClick={() => cambiar({ [k]: 100 })} />
    </label>
  );

  if (typeof document === "undefined") return null; // solo se abre en el navegador
  return createPortal(
    <div className="fe" role="dialog" aria-modal="true" aria-label="Editar foto">
      <header className="fe-head">
        <button type="button" className="fe-txt" onClick={onCancelar}>Cancelar</button>
        <strong>Editar foto</strong>
        <button type="button" className="fe-txt fe-ok" onClick={guardar} disabled={!img || guardando}>{guardando ? "Guardando…" : "Listo"}</button>
      </header>
      <div className="fe-body">
        <div className="fe-marco">
          <canvas ref={lienzo} className="fe-lienzo" style={{ filter: filtroCss(a) }}
            onPointerDown={abajo} onPointerMove={mover} onPointerUp={arriba} onPointerCancel={arriba} onWheel={rueda}
            aria-label="Vista previa. Arrastrá para mover la foto y pellizcá para agrandar o achicar" />
          {!img && !error && <div className="fe-cargando" aria-label="Cargando foto" />}
          <div className="fe-guia" aria-hidden="true" />
        </div>
        <p className="fe-tip">Así se ve en la tarjeta de la tienda. Arrastrá para mover{" "}· pellizcá para agrandar</p>
        <div className="fe-ctrls">
          <label className="fe-ctrl">
            <span>Tamaño<b>{Math.round(a.zoom * 100)}%</b></span>
            <div className="fe-zoom">
              <button type="button" aria-label="Achicar" onClick={() => cambiar({ zoom: clamp(+(a.zoom - 0.1).toFixed(2), ZOOM_MIN, ZOOM_MAX) })}>−</button>
              <input type="range" min={ZOOM_MIN} max={ZOOM_MAX} step={0.01} value={a.zoom} onChange={e => cambiar({ zoom: Number(e.target.value) })} />
              <button type="button" aria-label="Agrandar" onClick={() => cambiar({ zoom: clamp(+(a.zoom + 0.1).toFixed(2), ZOOM_MIN, ZOOM_MAX) })}>+</button>
            </div>
          </label>
          <div className="fe-mover" role="group" aria-label="Mover la foto">
            <span>Mover</span>
            <div>
              <button type="button" aria-label="Mover a la izquierda" onClick={() => cambiar({ x: a.x - 0.02 })}>←</button>
              <button type="button" aria-label="Mover arriba" onClick={() => cambiar({ y: a.y - 0.02 })}>↑</button>
              <button type="button" aria-label="Mover abajo" onClick={() => cambiar({ y: a.y + 0.02 })}>↓</button>
              <button type="button" aria-label="Mover a la derecha" onClick={() => cambiar({ x: a.x + 0.02 })}>→</button>
              <button type="button" className="fe-centrar" onClick={() => cambiar({ x: 0, y: 0 })}>Centrar</button>
            </div>
          </div>
          {control("brillo", "Brillo")}
          {control("contraste", "Contraste")}
          {control("color", "Color")}
          <button type="button" className="fe-reset" disabled={!tocado} onClick={() => setA(AJUSTES_INICIALES)}>Volver a la original</button>
          {error && <p className="err">{error}</p>}
        </div>
      </div>
    </div>,
    document.body,
  );
}
