"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { gs } from "@/lib/data";
import { useStore } from "@/components/Store";
import { Segmented } from "@/components/Segmented";

export type PedidoEnvio = {
  id: string; codigo: string; prendas: string[]; zona: string; total: number; estado: string; creado: string;
  pago?: "pendiente" | "pagado"; envio_fecha?: string | null; envio_metodo?: "delivery" | "courier" | null;
  enviado?: boolean; etiquetas?: string[]; cliente?: string; nota?: string;
  envio_estado?: EstadoEnvio | null;
};
export type EstadoEnvio = "retirar" | "delivery" | "camino" | "entregado";
// Los cuatro pasos de un envío, cada uno con su color pastel.
export const ESTADOS: { k: EstadoEnvio; corto: string; largo: string; color: string }[] = [
  { k: "retirar", corto: "Por retirar", largo: "Falta que lo busque el delivery", color: "#FBD9C4" },
  { k: "delivery", corto: "Con delivery", largo: "Ya lo tiene el delivery", color: "#DDD3F0" },
  { k: "camino", corto: "En camino", largo: "En camino a la clienta", color: "#CFE3F3" },
  { k: "entregado", corto: "Entregado", largo: "Entregado", color: "#CDEBD8" },
];
// Si todavía no se corrió estado-envio.sql, se usa el viejo "enviado".
export const estadoDe = (p: PedidoEnvio): EstadoEnvio => p.envio_estado ?? (p.enviado ? "entregado" : "retirar");
type Etiqueta = { id: string; nombre: string; color: string };

export const PASTELES = [
  ["Rosa", "#F4C9D6"], ["Durazno", "#FBD9C4"], ["Amarillo", "#F8EDB8"], ["Menta", "#CDEBD8"],
  ["Celeste", "#CFE3F3"], ["Lila", "#DDD3F0"], ["Arena", "#E8DCC4"], ["Gris", "#E2DEDA"],
];
const DIAS = ["lun", "mar", "mié", "jue", "vie", "sáb", "dom"];
const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
const iso = (d: Date) => d.toLocaleDateString("en-CA");
const hoyIso = () => iso(new Date());
const deIso = (s: string) => new Date(`${s}T12:00`);
// Cómo se nombra un pedido en el panel: el nombre de la clienta si Gab lo guardó, si no el código.
export const quien = (p: { cliente?: string; codigo: string }) => p.cliente?.trim() || `Pedido #${p.codigo}`;
const METODO: Record<string, string> = { delivery: "Delivery propio", courier: "Courier" };

function nombreDia(s: string) {
  const hoy = hoyIso();
  const man = iso(new Date(Date.now() + 864e5));
  if (s === hoy) return "Hoy";
  if (s === man) return "Mañana";
  const d = deIso(s);
  return d.toLocaleDateString("es-PY", { weekday: "long", day: "numeric", month: "long" });
}

export function Envios({ pedidos, nombres, onCambio }: {
  pedidos: PedidoEnvio[]; nombres: Map<string, string>; onCambio: () => Promise<void>;
}) {
  const sb = supabase()!;
  const { toast } = useStore();
  const [vista, setVista] = useState("Por enviar");
  const [etiquetas, setEtiquetas] = useState<Etiqueta[] | null>([]);
  const [sinEnvio, setSinEnvio] = useState<Set<string>>(new Set());
  const [editando, setEditando] = useState<PedidoEnvio | null>(null);
  // Cambio de estado al instante en pantalla, mientras se guarda en la base.
  const [cambios, setCambios] = useState<Record<string, EstadoEnvio>>({});
  const conEstado = pedidos.some(p => "envio_estado" in p);
  const cambiarEstado = async (p: PedidoEnvio, e: EstadoEnvio) => {
    if (!conEstado) { toast("Falta correr supabase/estado-envio.sql en Supabase.", "hold"); return; }
    if (estadoDe(p) === e) return;
    setCambios(c => ({ ...c, [p.id]: e }));
    const { error } = await sb.from("pedidos").update({ envio_estado: e, enviado: e === "entregado" }).eq("id", p.id);
    if (error) {
      setCambios(c => { const n = { ...c }; delete n[p.id]; return n; });
      toast("No se pudo guardar. Probá de nuevo.", "hold"); return;
    }
    toast(`${quien(p)}: ${ESTADOS.find(x => x.k === e)!.largo.toLowerCase()}`);
    await onCambio();
    setCambios(c => { const n = { ...c }; delete n[p.id]; return n; });
  };

  const cargar = useCallback(async () => {
    const [e, d] = await Promise.all([
      sb.from("etiquetas").select("id, nombre, color").order("creada"),
      sb.from("dias_sin_envio").select("fecha"),
    ]);
    setEtiquetas(e.error ? null : (e.data as Etiqueta[]));
    if (d.data) setSinEnvio(new Set(d.data.map((x: { fecha: string }) => x.fecha)));
  }, [sb]);
  useEffect(() => { queueMicrotask(() => { void cargar(); }); }, [cargar]);

  const confirmados = pedidos.filter(p => p.estado === "confirmado")
    .map(p => cambios[p.id] ? { ...p, envio_estado: cambios[p.id], enviado: cambios[p.id] === "entregado" } : p);
  const porEnviar = confirmados.filter(p => estadoDe(p) !== "entregado");
  const enviados = confirmados.filter(p => estadoDe(p) === "entregado");
  const porId = useMemo(() => new Map((etiquetas ?? []).map(e => [e.id, e])), [etiquetas]);

  if (etiquetas === null) {
    return (
      <section className="panel">
        <h2>Envíos</h2>
        <p className="fin-aviso">Para organizar los envíos y crear etiquetas de color falta un paso único en la base de datos: correr el archivo <b>supabase/envios.sql</b> en Supabase (SQL Editor).</p>
      </section>
    );
  }

  // Por enviar: primero los que no tienen día, después por fecha.
  const grupos = new Map<string, PedidoEnvio[]>();
  [...porEnviar].sort((a, b) => (a.envio_fecha ?? "").localeCompare(b.envio_fecha ?? "")).forEach(p => {
    const k = p.envio_fecha ?? "";
    grupos.set(k, [...(grupos.get(k) ?? []), p]);
  });
  const sinPagar = porEnviar.filter(p => p.pago !== "pagado").length;
  const tarjeta = (p: PedidoEnvio) => <TarjetaPedido key={p.id} p={p} nombres={nombres} porId={porId} onAbrir={() => setEditando(p)} onEstado={e => void cambiarEstado(p, e)} />;

  return (
    <div className="env">
      <div className="kpis">
        <div className="kpi main"><small>Por entregar</small><b>{porEnviar.length}</b><span className="kpi-sub">{ESTADOS.slice(0, 3).map(x => `${porEnviar.filter(p => estadoDe(p) === x.k).length} ${x.corto.toLowerCase()}`).join(" · ")}</span></div>
        <div className="kpi"><small>Pendientes de pago</small><b>{sinPagar}</b><span className="kpi-sub">De los que están por enviar</span></div>
        <div className="kpi"><small>Sin día asignado</small><b>{grupos.get("")?.length ?? 0}</b><span className="kpi-sub">Tocá el pedido para elegir el día</span></div>
      </div>

      <div className="env-tabs">
        <Segmented label="Vista de envíos" options={["Por enviar", "Calendario", "Entregados", "Etiquetas"]} value={vista} onChange={setVista} />
      </div>

      <div className="env-vista" key={vista}>
      {vista === "Por enviar" && (
        <section className="panel">
          {porEnviar.length === 0 && <p className="empty-row" style={{ paddingTop: 18 }}>No hay envíos por preparar. Cuando confirmes un pedido, aparece acá.</p>}
          {[...grupos].map(([dia, lista]) => (
            <div key={dia || "sin"}>
              <h2 className={dia && dia < hoyIso() ? "env-tarde" : undefined}>
                {dia ? nombreDia(dia) : "Sin día asignado"}
                {dia && dia < hoyIso() && <small> · atrasado</small>}
                {dia && sinEnvio.has(dia) && <small> · marcaste que no hacés envíos</small>}
              </h2>
              {lista.map(tarjeta)}
            </div>
          ))}
        </section>
      )}

      {vista === "Calendario" && (
        <Calendario pedidos={porEnviar.concat(enviados)} sinEnvio={sinEnvio} porId={porId} tarjeta={tarjeta}
          onDia={async (dia, bloquear) => {
            const { error } = bloquear
              ? await sb.from("dias_sin_envio").insert({ fecha: dia })
              : await sb.from("dias_sin_envio").delete().eq("fecha", dia);
            if (error) toast("No se pudo guardar. Probá de nuevo.", "hold");
            await cargar();
          }} />
      )}

      {vista === "Entregados" && (
        <section className="panel">
          <h2>Ya entregados</h2>
          {enviados.length === 0 && <p className="empty-row">Todavía no marcaste pedidos como entregados.</p>}
          {[...enviados].sort((a, b) => (b.envio_fecha ?? "").localeCompare(a.envio_fecha ?? "")).slice(0, 40).map(tarjeta)}
        </section>
      )}

      {vista === "Etiquetas" && <Etiquetas etiquetas={etiquetas} onCambio={cargar} />}
      </div>

      <div className={`scrim${editando ? " open" : ""}`} onClick={() => setEditando(null)} />
      <div className={`sheet${editando ? " open" : ""}`} role="dialog" aria-modal="true" aria-label="Envío del pedido" aria-hidden={!editando}>
        <div className="s-body">
          <div className="grabber" />
          {editando && (
            <EditorEnvio key={editando.id} p={editando} etiquetas={etiquetas} sinEnvio={sinEnvio} nombres={nombres}
              onCerrar={() => setEditando(null)} onEtiquetas={cargar}
              onListo={async msg => { setEditando(null); toast(msg); await onCambio(); }} />
          )}
        </div>
      </div>
    </div>
  );
}

function TarjetaPedido({ p, nombres, porId, onAbrir, onEstado }: {
  p: PedidoEnvio; nombres: Map<string, string>; porId: Map<string, Etiqueta>; onAbrir: () => void; onEstado: (e: EstadoEnvio) => void;
}) {
  const pagado = p.pago === "pagado";
  const est = estadoDe(p);
  return (
    <div className="env-card">
    <button type="button" className="env-open" onClick={onAbrir}>
      <span className="env-top">
        <b>{quien(p)}{p.cliente?.trim() && <small className="env-cod"> #{p.codigo}</small>}</b>
        <span className="env-total">Gs. {gs(p.total)}</span>
      </span>
      <small className="env-items">{p.prendas.map(id => nombres.get(id) ?? id).join(", ")}</small>
      <span className="env-pills">
        <span className={`env-pill ${pagado ? "ok" : "warn"}`}>{pagado ? "Pagado" : "Pendiente de pago"}</span>
        <span className="env-pill">{p.envio_metodo ? METODO[p.envio_metodo] : "Sin forma de envío"}</span>
        {p.zona && <span className="env-pill">{p.zona}</span>}
        {(p.etiquetas ?? []).map(id => porId.get(id)).filter(Boolean).map(e => (
          <span key={e!.id} className="env-pill tag" style={{ background: e!.color }}>{e!.nombre}</span>
        ))}
      </span>
      {p.nota && <small className="env-nota">{p.nota}</small>}
    </button>
    <div className="env-est" role="group" aria-label="Estado del envío">
      {ESTADOS.map(x => (
        <button key={x.k} type="button" aria-pressed={est === x.k} title={x.largo} style={{ ["--c" as string]: x.color }} onClick={() => onEstado(x.k)}>
          <i />{x.corto}
        </button>
      ))}
    </div>
    </div>
  );
}

function EditorEnvio({ p, etiquetas, sinEnvio, nombres, onCerrar, onListo, onEtiquetas }: {
  p: PedidoEnvio; etiquetas: Etiqueta[]; sinEnvio: Set<string>; nombres: Map<string, string>;
  onCerrar: () => void; onListo: (msg: string) => Promise<void>; onEtiquetas: () => Promise<void>;
}) {
  const [creando, setCreando] = useState(false);
  const [nueva, setNueva] = useState({ nombre: "", color: PASTELES[0][1] });
  const crearEtiqueta = async () => {
    if (!nueva.nombre.trim()) return;
    const { data, error } = await supabase()!.from("etiquetas").insert({ nombre: nueva.nombre.trim(), color: nueva.color }).select("id").single();
    if (error || !data) { setError("No se pudo crear la etiqueta."); return; }
    await onEtiquetas();
    setF(x => ({ ...x, etiquetas: new Set([...x.etiquetas, (data as { id: string }).id]) }));
    setNueva({ nombre: "", color: PASTELES[0][1] }); setCreando(false);
  };
  const sb = supabase()!;
  const [f, setF] = useState({
    pago: p.pago === "pagado" ? "Pagado" : "Pendiente de pago",
    metodo: p.envio_metodo ? METODO[p.envio_metodo] : "Sin definir",
    fecha: p.envio_fecha ?? "", cliente: p.cliente ?? "", nota: p.nota ?? "",
    etiquetas: new Set(p.etiquetas ?? []),
  });
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");

  const guardar = async (enviado: boolean) => {
    setGuardando(true); setError("");
    const metodo = f.metodo === "Delivery propio" ? "delivery" : f.metodo === "Courier" ? "courier" : null;
    const { error } = await sb.from("pedidos").update({
      pago: f.pago === "Pagado" ? "pagado" : "pendiente", envio_metodo: metodo, envio_fecha: f.fecha || null,
      cliente: f.cliente.trim(), nota: f.nota.trim(), etiquetas: [...f.etiquetas], enviado,
      ...("envio_estado" in p ? { envio_estado: enviado ? "entregado" : (estadoDe(p) === "entregado" ? "retirar" : estadoDe(p)) } : {}),
    }).eq("id", p.id);
    setGuardando(false);
    if (error) { setError("No se pudo guardar. Probá de nuevo."); return; }
    await onListo(enviado && !p.enviado ? `${quien({ ...p, cliente: f.cliente })}: entregado` : `${quien({ ...p, cliente: f.cliente })}: guardado`);
  };

  return (
    <>
      <h3>{quien(p)}</h3>
      <p className="demo-note" style={{ textAlign: "left", margin: "2px 0 8px" }}>
        {p.prendas.map(id => nombres.get(id) ?? id).join(", ")} · {p.zona || "Sin zona"} · Gs. {gs(p.total)}
      </p>
      <form className="new-item env-form" onSubmit={e => { e.preventDefault(); void guardar(!!p.enviado); }}>
        <div className="field-seg">Pago<Segmented label="Pago" options={["Pendiente de pago", "Pagado"]} value={f.pago} onChange={v => setF(x => ({ ...x, pago: v }))} /></div>
        <div className="field-seg">Forma de envío<Segmented label="Forma de envío" options={["Sin definir", "Delivery propio", "Courier"]} value={f.metodo} onChange={v => setF(x => ({ ...x, metodo: v }))} /></div>
        <div className="two">
          <label>Día de envío<input type="date" value={f.fecha} onChange={e => setF(x => ({ ...x, fecha: e.target.value }))} /></label>
          <label>Nombre de la clienta<input value={f.cliente} placeholder="Como la tengas guardada" onChange={e => setF(x => ({ ...x, cliente: e.target.value }))} /></label>
        </div>
        {f.fecha && sinEnvio.has(f.fecha) && <p className="form-err">Ese día lo marcaste como sin envíos.</p>}
        <div className="field-seg">Etiquetas

          <div className="env-tags">
            {etiquetas.map(e => {
              const on = f.etiquetas.has(e.id);
              return (
                <button type="button" key={e.id} className={`env-pill tag pick${on ? " on" : ""}`} style={{ background: e.color }} aria-pressed={on}
                  onClick={() => setF(x => { const s = new Set(x.etiquetas); if (on) s.delete(e.id); else s.add(e.id); return { ...x, etiquetas: s }; })}>
                  {on ? "✓ " : ""}{e.nombre}
                </button>
              );
            })}
            {!creando && <button type="button" className="env-pill pick on env-add" onClick={() => setCreando(true)}>+ Nueva etiqueta</button>}
          </div>
          {creando && (
            <div className="env-nueva">
              <input autoFocus maxLength={30} value={nueva.nombre} placeholder="Nombre, ej: Envío sábado"
                onChange={e => setNueva(x => ({ ...x, nombre: e.target.value }))}
                onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); void crearEtiqueta(); } }} />
              <div className="env-swatches">
                {PASTELES.map(([n, c]) => (
                  <button type="button" key={c} aria-label={n} aria-pressed={nueva.color === c} className={nueva.color === c ? "on" : undefined} style={{ background: c }} onClick={() => setNueva(x => ({ ...x, color: c }))} />
                ))}
              </div>
              <div className="env-nueva-act">
                <button type="button" className="linkish" onClick={() => setCreando(false)}>Cancelar</button>
                <button type="button" className="env-pill tag pick on" style={{ background: nueva.color }} disabled={!nueva.nombre.trim()} onClick={crearEtiqueta}>Crear “{nueva.nombre.trim() || "etiqueta"}”</button>
              </div>
            </div>
          )}
        </div>
        <label>Nota<input value={f.nota} placeholder="Ej: dirección, horario, referencia" onChange={e => setF(x => ({ ...x, nota: e.target.value }))} /></label>
        {error && <p className="form-err" role="alert">{error}</p>}
        <div className="order-act">
          <button type="button" className="cta ghost" onClick={onCerrar}>Cerrar</button>
          <button type="submit" className="cta" disabled={guardando}>{guardando ? "Guardando…" : "Guardar"}</button>
        </div>
        <button type="button" className="linkish" disabled={guardando} onClick={() => guardar(!p.enviado)}>
          {p.enviado ? "Volver a “Por enviar”" : "Marcar como entregado"}
        </button>
      </form>
    </>
  );
}

function Calendario({ pedidos, sinEnvio, porId, tarjeta, onDia }: {
  pedidos: PedidoEnvio[]; sinEnvio: Set<string>; porId: Map<string, Etiqueta>;
  tarjeta: (p: PedidoEnvio) => React.ReactNode; onDia: (dia: string, bloquear: boolean) => Promise<void>;
}) {
  const hoy = hoyIso();
  const [mes, setMes] = useState(() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1); });
  const [dia, setDia] = useState(hoy);
  const porDia = useMemo(() => {
    const m = new Map<string, PedidoEnvio[]>();
    pedidos.forEach(p => { if (p.envio_fecha) m.set(p.envio_fecha, [...(m.get(p.envio_fecha) ?? []), p]); });
    return m;
  }, [pedidos]);
  const inicio = (mes.getDay() + 6) % 7; // lunes primero
  const dias = new Date(mes.getFullYear(), mes.getMonth() + 1, 0).getDate();
  const celdas = [...Array(inicio).fill(null), ...Array.from({ length: dias }, (_, i) => iso(new Date(mes.getFullYear(), mes.getMonth(), i + 1)))];
  const delDia = porDia.get(dia) ?? [];
  const bloqueado = sinEnvio.has(dia);

  return (
    <div className="cols">
      <section className="panel env-cal">
        <div className="fin-mes" style={{ padding: "16px 18px 0", marginBottom: 8 }}>
          <button type="button" aria-label="Mes anterior" onClick={() => setMes(new Date(mes.getFullYear(), mes.getMonth() - 1, 1))}>‹</button>
          <h2 style={{ padding: 0, fontSize: 22 }}>{MESES[mes.getMonth()]} {mes.getFullYear()}</h2>
          <button type="button" aria-label="Mes siguiente" onClick={() => setMes(new Date(mes.getFullYear(), mes.getMonth() + 1, 1))}>›</button>
        </div>
        <div className="cal-grid">
          {DIAS.map(d => <span key={d} className="cal-dow">{d}</span>)}
          {celdas.map((c, i) => c === null ? <span key={`v${i}`} /> : (
            <button type="button" key={c} onClick={() => setDia(c)}
              className={`cal-dia${c === dia ? " on" : ""}${c === hoy ? " hoy" : ""}${sinEnvio.has(c) ? " no" : ""}`}
              aria-label={`${nombreDia(c)}: ${porDia.get(c)?.length ?? 0} envíos${sinEnvio.has(c) ? ", sin envíos" : ""}`}>
              <span>{Number(c.slice(8))}</span>
              <span className="cal-dots">
                {(porDia.get(c) ?? []).slice(0, 4).map(p => (
                  <i key={p.id} style={{ background: porId.get(p.etiquetas?.[0] ?? "")?.color ?? "var(--petal-ink)" }} />
                ))}
              </span>
            </button>
          ))}
        </div>
        <p className="fin-aviso">Los puntos son pedidos (con el color de su primera etiqueta). Los días tachados no hacés envíos.</p>
      </section>
      <section className="panel">
        <h2 style={{ textTransform: "capitalize" }}>{nombreDia(dia)}</h2>
        {bloqueado && <p className="fin-aviso">Marcaste este día como sin envíos.</p>}
        {delDia.length === 0 && !bloqueado && <p className="empty-row">No hay envíos este día.</p>}
        {delDia.map(tarjeta)}
        <div style={{ padding: "4px 18px 18px" }}>
          <button type="button" className="cta ghost" onClick={() => onDia(dia, !bloqueado)}>
            {bloqueado ? "Volver a habilitar envíos este día" : "Este día no hago envíos"}
          </button>
        </div>
      </section>
    </div>
  );
}

function Etiquetas({ etiquetas, onCambio }: { etiquetas: Etiqueta[]; onCambio: () => Promise<void> }) {
  const sb = supabase()!;
  const { toast } = useStore();
  const [nombre, setNombre] = useState("");
  const [color, setColor] = useState(PASTELES[0][1]);

  const crear = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await sb.from("etiquetas").insert({ nombre: nombre.trim(), color });
    if (error) { toast("No se pudo crear la etiqueta.", "hold"); return; }
    setNombre(""); toast(`Etiqueta “${nombre.trim()}” creada`);
    await onCambio();
  };
  const cambiarColor = async (et: Etiqueta, c: string) => { await sb.from("etiquetas").update({ color: c }).eq("id", et.id); await onCambio(); };
  const borrar = async (et: Etiqueta) => {
    if (!window.confirm(`¿Borrar la etiqueta “${et.nombre}”? Se quita de los pedidos que la tengan.`)) return;
    await sb.from("etiquetas").delete().eq("id", et.id);
    await onCambio();
  };

  return (
    <div className="cols">
      <section className="panel">
        <h2>Nueva etiqueta</h2>
        <form className="new-item" onSubmit={crear}>
          <label>Nombre<input required maxLength={30} value={nombre} placeholder="Ej: Envío sábado, Regalo, Urgente" onChange={e => setNombre(e.target.value)} /></label>
          <div className="field-seg">Color
            <div className="env-swatches">
              {PASTELES.map(([n, c]) => (
                <button type="button" key={c} aria-label={n} aria-pressed={color === c} className={color === c ? "on" : undefined} style={{ background: c }} onClick={() => setColor(c)} />
              ))}
            </div>
          </div>
          <p className="env-preview">Así se ve: <span className="env-pill tag" style={{ background: color }}>{nombre.trim() || "Mi etiqueta"}</span></p>
          <button className="cta" type="submit" disabled={!nombre.trim()}>Crear etiqueta</button>
        </form>
      </section>
      <section className="panel">
        <h2>Mis etiquetas</h2>
        {etiquetas.length === 0 && <p className="empty-row">Todavía no creaste etiquetas.</p>}
        {etiquetas.map(et => (
          <div className="exp env-et" key={et.id}>
            <span><span className="env-pill tag" style={{ background: et.color }}>{et.nombre}</span>
              <span className="env-swatches mini">
                {PASTELES.map(([n, c]) => (
                  <button type="button" key={c} aria-label={`Cambiar a ${n}`} aria-pressed={et.color === c} className={et.color === c ? "on" : undefined} style={{ background: c }} onClick={() => cambiarColor(et, c)} />
                ))}
              </span>
            </span>
            <button type="button" className="linkish" onClick={() => borrar(et)}>Borrar</button>
          </div>
        ))}
      </section>
    </div>
  );
}
