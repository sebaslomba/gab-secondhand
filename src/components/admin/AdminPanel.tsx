"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import {
  CATEGORIAS, CONDICIONES, DIBUJO_POR_CATEGORIA, ESTADO_A_DB, ESTADO_DE_DB, ESTADO_LABEL, TALLES, gs,
  type Estado, type Prenda,
} from "@/lib/data";
import { Garment } from "@/components/Garment";
import { Segmented } from "@/components/Segmented";
import { useStore } from "@/components/Store";
import { ChevronIcon } from "@/components/Icons";
import { Filters } from "@/components/Filters";
import { Envios, type PedidoEnvio } from "@/components/admin/Envios";

type FilaPrenda = {
  id: string; titulo: string; marca: string; talle: string; precio: number; categoria: string; condicion: string;
  costo: number; dibujo: string; color: string; fondo: string; estado: "disponible" | "reservada" | "vendida";
  reservada_hasta: string | null; pedido_id: string | null; creada: string; vendida_en?: string | null;
};
export type Gasto = { id: string; fecha: string; concepto: string; monto: number };
type Pedido = PedidoEnvio & { vence: string };

const OPCIONES = ["Disponible", "Reservada", "Vendida"];
const A_ESTADO: Record<string, Estado> = { Disponible: "av", Reservada: "ho", Vendida: "so" };
// Colores suaves para las ilustraciones hasta que haya fotos.
const TONOS = [["#F4C9D6", "#F7E3E9"], ["#6C8DB5", "#DDE6EF"], ["#E8DCC4", "#F3E9E3"], ["#8E6A5B", "#EDE1D8"], ["#A9A4A0", "#E7E2DD"]];

const vigente = (f: FilaPrenda): Estado =>
  f.estado === "reservada" && (!f.reservada_hasta || new Date(f.reservada_hasta) <= new Date()) ? "av" : ESTADO_DE_DB[f.estado];
const aPrenda = (f: FilaPrenda): Prenda => ({
  id: f.id, t: f.titulo, b: f.marca, s: f.talle, p: f.precio, c: f.categoria,
  g: (DIBUJO_POR_CATEGORIA[f.categoria] ?? f.dibujo) as Prenda["g"], col: f.color, bg: f.fondo,
  st: vigente(f), cond: f.condicion, cost: f.costo,
});
// Sin mayúsculas ni acentos, para buscar "cardigan" y encontrar "Cárdigan".
const norm = (t: string) => t.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
const ESTADOS_FILTRO = ["Todas", "Disponible", "Reservada", "Vendida"];
const hora = (iso: string) => new Date(iso).toLocaleString("es-PY", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

export function AdminPanel() {
  const sb = supabase()!;
  const [session, setSession] = useState<Session | null>(null);
  const [listo, setListo] = useState(false);
  const [esAdmin, setEsAdmin] = useState<boolean | null>(null);

  useEffect(() => {
    sb.auth.getSession().then(({ data }) => { setSession(data.session); setListo(true); });
    const { data } = sb.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => data.subscription.unsubscribe();
  }, [sb]);
  useEffect(() => {
    if (!session) return;
    sb.rpc("es_admin").then(({ data }) => setEsAdmin(data === true));
  }, [sb, session]);

  if (!listo) return <main className="wrap admin view view-in" />;
  if (!session) return <Ingreso />;
  if (esAdmin === false) {
    return (
      <main className="wrap admin view view-in">
        <div className="login">
          <h1>Sin permiso</h1>
          <p>La cuenta {session.user.email} no administra esta tienda.</p>
          <button className="cta" onClick={() => { setEsAdmin(null); void sb.auth.signOut(); }}>Usar otro email</button>
        </div>
      </main>
    );
  }
  return esAdmin ? <Panel email={session.user.email ?? ""} /> : <main className="wrap admin view view-in" />;
}

// Ingreso con email y contraseña (el celular puede guardarla y completarla con Face ID).
// Si se olvida la contraseña, se puede entrar con un código que llega por email.
function Ingreso() {
  const sb = supabase()!;
  const [paso, setPaso] = useState<"clave" | "email" | "codigo">("clave");
  const [email, setEmail] = useState("");
  const [clave, setClave] = useState("");
  const [codigo, setCodigo] = useState("");
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");

  const pedirCodigo = async (e: React.FormEvent) => {
    e.preventDefault(); setCargando(true); setError("");
    const { error } = await sb.auth.signInWithOtp({
      email: email.trim(),
      options: { shouldCreateUser: false, emailRedirectTo: `${location.origin}/admin` },
    });
    setCargando(false);
    if (error) setError(error.status === 429 ? "Esperá un minuto antes de pedir otro código." : "Ese email no tiene acceso al panel.");
    else setPaso("codigo");
  };
  const entrarConClave = async (e: React.FormEvent) => {
    e.preventDefault(); setCargando(true); setError("");
    const { error } = await sb.auth.signInWithPassword({ email: email.trim(), password: clave });
    setCargando(false);
    if (error) setError(error.status === 429 ? "Demasiados intentos. Esperá un minuto." : "El email o la contraseña no son correctos.");
  };
  const entrar = async (e: React.FormEvent) => {
    e.preventDefault(); setCargando(true); setError("");
    const { error } = await sb.auth.verifyOtp({ email: email.trim(), token: codigo.trim(), type: "email" });
    setCargando(false);
    if (error) setError("El código no es correcto o ya venció. Pedí uno nuevo.");
  };

  return (
    <main className="wrap admin view view-in">
      {paso === "clave" ? (
        <form className="login" onSubmit={entrarConClave}>
          <h1>Panel de Gab</h1>
          <p>Solo para la administración de la tienda.</p>
          <label htmlFor="lg-user">Email
            <input id="lg-user" type="email" required autoComplete="username" inputMode="email" value={email} onChange={e => setEmail(e.target.value)} />
          </label>
          <label htmlFor="lg-pass">Contraseña
            <input id="lg-pass" type="password" required autoComplete="current-password" value={clave} onChange={e => setClave(e.target.value)} />
          </label>
          {error && <p className="form-err" role="alert">{error}</p>}
          <button className="cta" type="submit" disabled={cargando}>{cargando ? "Entrando…" : "Ingresar"}</button>
          <button type="button" className="linkish" onClick={() => { setPaso("email"); setError(""); }}>Me olvidé la contraseña: entrar con un código por email</button>
        </form>
      ) : paso === "email" ? (
        <form className="login" onSubmit={pedirCodigo}>
          <h1>Entrar con código</h1>
          <p>Escribí tu email y te mandamos un código para entrar. Adentro podés poner una contraseña nueva en “Cuenta”.</p>
          <label htmlFor="lg-mail">Email
            <input id="lg-mail" type="email" required autoComplete="email" inputMode="email" value={email} onChange={e => setEmail(e.target.value)} />
          </label>
          {error && <p className="form-err" role="alert">{error}</p>}
          <button className="cta" type="submit" disabled={cargando}>{cargando ? "Enviando…" : "Mandarme el código"}</button>
          <button type="button" className="linkish" onClick={() => { setPaso("clave"); setError(""); }}>Volver a entrar con contraseña</button>
        </form>
      ) : (
        <form className="login" onSubmit={entrar}>
          <h1>Revisá tu email</h1>
          <p>Te mandamos un mensaje a <b>{email}</b>. Tocá el link o escribí el código acá.</p>
          <label htmlFor="lg-code">Código
            <input id="lg-code" required autoComplete="one-time-code" inputMode="numeric" pattern="[0-9]*" maxLength={10}
              value={codigo} onChange={e => setCodigo(e.target.value.replace(/\D/g, ""))} className="otp" />
          </label>
          {error && <p className="form-err" role="alert">{error}</p>}
          <button className="cta" type="submit" disabled={cargando || codigo.length < 6}>{cargando ? "Entrando…" : "Entrar"}</button>
          <button type="button" className="linkish" onClick={() => { setPaso("email"); setCodigo(""); setError(""); }}>Cambiar email o pedir otro código</button>
          <button type="button" className="linkish" onClick={() => { setPaso("clave"); setCodigo(""); setError(""); }}>Volver a entrar con contraseña</button>
        </form>
      )}
    </main>
  );
}

function Panel({ email }: { email: string }) {
  const sb = supabase()!;
  const { toast, sync } = useStore();
  // null: en el celular se ve el menú; en pantallas grandes, Pedidos.
  const [seccion, setSeccion] = useState<string | null>(null);
  const [filas, setFilas] = useState<FilaPrenda[]>([]);
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [ahora, setAhora] = useState(0);
  const [editando, setEditando] = useState<FilaPrenda | null>(null);
  const [busca, setBusca] = useState("");
  const [tipo, setTipo] = useState("Todo");
  const [estado, setEstado] = useState("Todas");
  // null: la tabla de gastos todavía no existe en la base (falta correr supabase/finanzas.sql).
  const [gastos, setGastos] = useState<Gasto[] | null>([]);

  const cargar = useCallback(async () => {
    const [p, o, g] = await Promise.all([
      sb.from("prendas").select("*").order("creada", { ascending: false }),
      sb.from("pedidos").select("*").order("creado", { ascending: false }).limit(200),
      sb.from("gastos").select("id, fecha, concepto, monto").order("fecha", { ascending: false }),
    ]);
    if (p.data) setFilas(p.data as FilaPrenda[]);
    if (o.data) setPedidos(o.data as Pedido[]);
    setGastos(g.error ? null : (g.data as Gasto[]));
    setAhora(Date.now());
  }, [sb]);
  // Se actualiza solo cada 20 segundos y al volver a la app.
  useEffect(() => {
    queueMicrotask(() => { void cargar(); });
    const h = setInterval(cargar, 20000);
    const tic = setInterval(() => setAhora(Date.now()), 15000);
    const v = () => { if (document.visibilityState === "visible") void cargar(); };
    document.addEventListener("visibilitychange", v);
    return () => { clearInterval(h); clearInterval(tic); document.removeEventListener("visibilitychange", v); };
  }, [cargar]);

  const listo = async (msg: string, dot = "") => { toast(msg, dot); await cargar(); void sync(); };
  const prendas = useMemo(() => filas.map(aPrenda), [filas]);
  const porId = useMemo(() => new Map(prendas.map(p => [p.id, p])), [prendas]);

  const pendientes = pedidos.filter(p => p.estado === "pendiente" && new Date(p.vence).getTime() > ahora);
  const historial = pedidos.filter(p => p.estado === "confirmado").slice(0, 10);
  const vendidas = prendas.filter(p => p.st === "so");
  const disponibles = prendas.filter(p => p.st === "av");
  const reservadas = prendas.filter(p => p.st === "ho");
  const mesActual = useMemo(() => resumenMes(filas, pedidos, gastos ?? [], claveMes(new Date())), [filas, pedidos, gastos]);
  const activa = seccion ?? "Pedidos";
  // Cada palabra escrita tiene que aparecer en nombre, marca, talle, tipo, condición o código.
  const filtradas = useMemo(() => {
    const palabras = norm(busca).split(/\s+/).filter(Boolean);
    return filas.map((f, i) => ({ f, it: prendas[i] })).filter(({ f, it }) => {
      if (tipo !== "Todo" && it.c !== tipo) return false;
      if (estado !== "Todas" && it.st !== A_ESTADO[estado]) return false;
      const texto = norm(`${it.t} ${it.b} ${it.s} ${it.c} ${it.cond ?? ""} ${f.id}`);
      return palabras.every(w => texto.includes(w));
    });
  }, [filas, prendas, busca, tipo, estado]);
  const hayFiltro = !!busca.trim() || tipo !== "Todo" || estado !== "Todas";

  const confirmar = async (p: Pedido) => {
    const { error } = await sb.rpc("confirmar_pedido", { p_pedido: p.id });
    await listo(error ? "No se pudo confirmar. Probá de nuevo." : `Pedido #${p.codigo} vendido. Organizá el envío en Envíos`, error ? "hold" : "sold");
  };
  const cancelar = async (p: Pedido) => {
    if (!window.confirm(`¿Cancelar el pedido #${p.codigo}? Las prendas vuelven a estar disponibles.`)) return;
    const { error } = await sb.rpc("cancelar_pedido", { p_pedido: p.id });
    await listo(error ? "No se pudo cancelar. Probá de nuevo." : `Pedido #${p.codigo} cancelado`);
  };

  const MENU: { k: string; sub: string; n?: number }[] = [
    { k: "Pedidos", sub: "Confirmá o cancelá lo que te piden", n: pendientes.length },
    { k: "Prendas", sub: "Editá precio, talle o estado", n: prendas.length },
    { k: "Envíos", sub: "Pago, día y forma de envío de cada pedido", n: pedidos.filter(p => p.estado === "confirmado" && !p.enviado).length },
    { k: "Nueva prenda", sub: "Publicá algo nuevo en la tienda" },
    { k: "Finanzas", sub: "Lo que entró, lo que gastaste y lo que ganaste" },
    { k: "Cuenta", sub: "Contraseña y cerrar sesión" },
  ];

  return (
    <main className="wrap admin view view-in">
      <div className={`adm${seccion ? " in" : ""}`}>
        <nav className="adm-nav" aria-label="Secciones del panel">
          <div className="adm-hello"><h1>Hola, Gab</h1><p>Lo que cambies acá se ve al instante en la tienda.</p></div>
          <ul>
            {MENU.map(m => (
              <li key={m.k}>
                <button type="button" aria-current={activa === m.k ? "page" : undefined} onClick={() => setSeccion(m.k)}>
                  <span><b>{m.k}</b><small>{m.sub}</small></span>
                  {!!m.n && <em className={m.k === "Pedidos" ? "hot" : undefined}>{m.n}</em>}
                  <ChevronIcon />
                </button>
              </li>
            ))}
          </ul>
        </nav>

        <div className="adm-main">
          <button type="button" className="adm-back" onClick={() => setSeccion(null)}><ChevronIcon />Menú</button>

          {activa === "Pedidos" && (
            <>
              <div className="kpis">
                <div className="kpi main"><small>Pedidos por confirmar</small><b>{pendientes.length}</b>
                  <span className="kpi-sub">{pendientes.length ? "Esperando tu respuesta" : "Nada pendiente"}</span></div>
                <div className="kpi"><small>Prendas cargadas</small><b>{prendas.length}</b>
                  <span className="kpi-sub">{disponibles.length} a la venta · {reservadas.length} {reservadas.length === 1 ? "reservada" : "reservadas"} · {vendidas.length} {vendidas.length === 1 ? "vendida" : "vendidas"}</span></div>
                <div className="kpi"><small>Vendido este mes</small><b>Gs. {gs(mesActual.ingresos)}</b>
                  <span className="kpi-sub">{mesActual.vendidas.length} {mesActual.vendidas.length === 1 ? "prenda" : "prendas"}</span></div>
                <button type="button" className="kpi kpi-link" onClick={() => setSeccion("Finanzas")}><small>Ganancia este mes</small><b>Gs. {gs(mesActual.ganancia)}</b>
                  <span className="kpi-sub">Ver detalle en Finanzas ›</span></button>
              </div>
              <section className="panel">
                <h2>Por confirmar</h2>
                {pendientes.length === 0 && <p className="empty-row">No hay pedidos esperando. Cuando alguien toque “Enviar” en la tienda, aparece acá.</p>}
                {pendientes.map(p => {
                  const min = Math.max(0, Math.ceil((new Date(p.vence).getTime() - ahora) / 60000));
                  return (
                    <article className="order" key={p.id}>
                      <header>
                        <b>Pedido #{p.codigo}</b>
                        <span className="order-time">Reservado {min} min más</span>
                      </header>
                      <ul>
                        {p.prendas.map(id => {
                          const it = porId.get(id);
                          return (
                            <li key={id}>
                              {it && <div className="thumbph ph" style={{ ["--tint" as string]: it.bg }}><Garment it={it} /></div>}
                              <span>{it?.t ?? id}<small>{id}{it ? ` · Talle ${it.s}` : ""}</small></span>
                              <span>{it ? `Gs. ${gs(it.p)}` : ""}</span>
                            </li>
                          );
                        })}
                      </ul>
                      <p className="order-sum">{p.zona || "Sin zona"} · <b>Total Gs. {gs(p.total)}</b></p>
                      <div className="order-act">
                        <button className="cta ghost" onClick={() => cancelar(p)}>Cancelar</button>
                        <button className="cta" onClick={() => confirmar(p)}>Confirmar venta</button>
                      </div>
                    </article>
                  );
                })}
                {historial.length > 0 && (
                  <>
                    <h2>Últimas ventas</h2>
                    {historial.map(p => (
                      <div className="exp" key={p.id}><span>#{p.codigo} · {p.prendas.length} {p.prendas.length === 1 ? "prenda" : "prendas"}<small>{hora(p.creado)}</small></span><span>Gs. {gs(p.total)}</span></div>
                    ))}
                  </>
                )}
              </section>
            </>
          )}

          {activa === "Prendas" && (
            <section className="panel adm-prendas">
              <h2>Mis prendas</h2>
              <div className="adm-tools">
                <label className="adm-search">
                  <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /></svg>
                  <input type="search" value={busca} onChange={e => setBusca(e.target.value)}
                    placeholder="Buscar por nombre, marca, talle…" aria-label="Buscar prendas" enterKeyHint="search" />
                  {busca && <button type="button" aria-label="Borrar búsqueda" onClick={() => setBusca("")}>×</button>}
                </label>
                <Filters groups={[
                  { key: "tipo", label: "Tipo de ropa", value: tipo, active: tipo !== "Todo", options: CATEGORIAS, selected: tipo, onPick: setTipo },
                  { key: "estado", label: "Estado", value: estado, active: estado !== "Todas", options: ESTADOS_FILTRO, selected: estado, onPick: setEstado },
                ]} />
                {hayFiltro && (
                  <p className="adm-count">
                    {filtradas.length} {filtradas.length === 1 ? "prenda" : "prendas"}
                    <button type="button" onClick={() => { setBusca(""); setTipo("Todo"); setEstado("Todas"); }}>Ver todas</button>
                  </p>
                )}
              </div>
              {prendas.length === 0 && <p className="empty-row">Todavía no cargaste prendas.</p>}
              {prendas.length > 0 && filtradas.length === 0 && <p className="empty-row">No encontramos prendas con esa búsqueda.</p>}
              <div className="adm-grid">
                {filtradas.map(({ f, it }) => {
                  const [lab, cls] = ESTADO_LABEL[it.st];
                  return (
                    <button type="button" key={it.id} className={`card glass mini${it.st === "so" ? " is-sold" : ""}${it.st === "ho" ? " is-hold" : ""}`}
                      onClick={() => setEditando(f)} aria-label={`Editar ${it.t}, talle ${it.s}, ${lab}`}>
                      <div className="ph" style={{ ["--tint" as string]: it.bg }}><Garment it={it} /></div>
                      <div className="info">
                        <div className="top"><span className="brand">{it.b}</span><span className={`st-pill ${cls}`}>{lab}</span></div>
                        <h3>{it.t}</h3>
                        <small className="mini-meta">{it.id} · Talle {it.s}</small>
                        <div className="price"><small>Gs.</small>{gs(it.p)}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>
          )}

          {activa === "Nueva prenda" && (
            <section className="panel">
              <h2>Nueva prenda</h2>
              <PrendaForm filas={filas} onListo={async t => { await listo(`Publicaste “${t}”`); setSeccion("Prendas"); }} />
            </section>
          )}

          {activa === "Envíos" && <Envios pedidos={pedidos} nombres={new Map(filas.map(f => [f.id, f.titulo]))} onCambio={cargar} />}

          {activa === "Finanzas" && <Finanzas filas={filas} pedidos={pedidos} gastos={gastos} onCambio={cargar} />}

          {activa === "Cuenta" && <Cuenta email={email} />}
        </div>
      </div>

      <div className={`scrim${editando ? " open" : ""}`} onClick={() => setEditando(null)} />
      <div className={`sheet${editando ? " open" : ""}`} role="dialog" aria-modal="true" aria-label="Editar prenda" aria-hidden={!editando}>
        <div className="s-body">
          <div className="grabber" />
          {editando && (
            <>
              <h3>Editar prenda</h3>
              <p className="demo-note" style={{ textAlign: "left", margin: "2px 0 8px" }}>{editando.id}</p>
              <PrendaForm key={editando.id} filas={filas} prenda={editando}
                onListo={async t => { setEditando(null); await listo(`Guardaste “${t}”`); }}
                onCancelar={() => setEditando(null)} />
            </>
          )}
        </div>
      </div>
    </main>
  );
}

// Formulario para publicar una prenda nueva o editar una existente.
function PrendaForm({ filas, prenda, onListo, onCancelar }: {
  filas: FilaPrenda[]; prenda?: FilaPrenda; onListo: (t: string) => Promise<void>; onCancelar?: () => void;
}) {
  const sb = supabase()!;
  const fmt = (n: number) => (n ? gs(n) : "");
  const [f, setF] = useState({
    titulo: prenda?.titulo ?? "", marca: prenda?.marca === "Sin marca" ? "" : prenda?.marca ?? "", talle: prenda?.talle ?? "M",
    precio: fmt(prenda?.precio ?? 0), categoria: prenda?.categoria ?? "Remeras", condicion: prenda?.condicion ?? CONDICIONES[1],
    costo: fmt(prenda?.costo ?? 0), estado: prenda ? ESTADO_LABEL[vigente(prenda)][0] : "Disponible",
  });
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setF(x => ({ ...x, [k]: e.target.value }));
  const num = (s: string) => Number(s.replace(/\D/g, "")) || 0;
  const money = (k: "precio" | "costo") => (e: React.ChangeEvent<HTMLInputElement>) =>
    setF(x => ({ ...x, [k]: e.target.value.replace(/\D/g, "") ? gs(num(e.target.value)) : "" }));
  const talles = TALLES.includes(f.talle) ? TALLES : [f.talle, ...TALLES];

  const guardar = async (e: React.FormEvent) => {
    e.preventDefault(); setGuardando(true); setError("");
    const datos = {
      titulo: f.titulo.trim(), marca: f.marca.trim() || "Sin marca", talle: f.talle, precio: num(f.precio),
      categoria: f.categoria, condicion: f.condicion, costo: num(f.costo), dibujo: DIBUJO_POR_CATEGORIA[f.categoria] ?? "tee",
    };
    let r;
    if (prenda) {
      const st = A_ESTADO[f.estado];
      const cambioEstado = st !== vigente(prenda);
      // Una reserva hecha a mano (por Instagram, en persona) dura una semana; después vuelve a Disponible.
      const estado = !cambioEstado ? {} : st === "ho"
        ? { estado: ESTADO_A_DB[st], reservada_hasta: new Date(Date.now() + 7 * 864e5).toISOString() }
        : { estado: ESTADO_A_DB[st], reservada_hasta: null, ...(st === "av" ? { pedido_id: null } : {}) };
      r = await sb.from("prendas").update({ ...datos, ...estado }).eq("id", prenda.id);
    } else {
      // Código siguiente: GS-115, GS-116...
      const max = Math.max(100, ...filas.map(x => Number(x.id.replace(/\D/g, "")) || 0));
      const [color, fondo] = TONOS[(max + 1) % TONOS.length];
      r = await sb.from("prendas").insert({ id: `GS-${max + 1}`, ...datos, color, fondo });
    }
    setGuardando(false);
    if (r.error) { setError("No se pudo guardar. Revisá los datos y probá de nuevo."); return; }
    await onListo(datos.titulo);
  };

  return (
    <form className="new-item" onSubmit={guardar}>
      <label>¿Qué es?<input required value={f.titulo} onChange={set("titulo")} placeholder="Ej: Campera de jean oversize" /></label>
      <div className="two">
        <label>Precio (Gs.)<input required inputMode="numeric" value={f.precio} onChange={money("precio")} placeholder="120.000" /></label>
        <label>Talle<select value={f.talle} onChange={set("talle")}>{talles.map(t => <option key={t}>{t}</option>)}</select></label>
      </div>
      <div className="two">
        <label>Tipo<select value={f.categoria} onChange={set("categoria")}>{CATEGORIAS.filter(c => c !== "Todo").map(c => <option key={c}>{c}</option>)}</select></label>
        <label>Estado de la prenda<select value={f.condicion} onChange={set("condicion")}>{CONDICIONES.map(c => <option key={c}>{c}</option>)}</select></label>
      </div>
      <div className="two">
        <label>Marca<input value={f.marca} onChange={set("marca")} placeholder="Opcional" /></label>
        <label>Lo que te costó<input inputMode="numeric" value={f.costo} onChange={money("costo")} placeholder="Solo lo ves vos" /></label>
      </div>
      {prenda && (
        <div className="field-seg"><span>En la tienda</span>
          <Segmented label="En la tienda" options={OPCIONES} value={f.estado} onChange={o => setF(x => ({ ...x, estado: o }))} />
        </div>
      )}
      {!prenda && <p className="demo-note">Las fotos se suman en el próximo paso. Por ahora la prenda se muestra con un dibujo.</p>}
      {error && <p className="form-err" role="alert">{error}</p>}
      <div className="order-act">
        {onCancelar && <button type="button" className="cta ghost" onClick={onCancelar}>Cancelar</button>}
        <button className="cta" type="submit" disabled={guardando || !f.titulo.trim() || !num(f.precio)}>
          {guardando ? "Guardando…" : prenda ? "Guardar cambios" : "Publicar en la tienda"}
        </button>
      </div>
    </form>
  );
}

function Cuenta({ email }: { email: string }) {
  const sb = supabase()!;
  const { toast } = useStore();
  const [clave, setClave] = useState("");
  const [guardando, setGuardando] = useState(false);
  const guardar = async (e: React.FormEvent) => {
    e.preventDefault(); setGuardando(true);
    const { error } = await sb.auth.updateUser({ password: clave });
    setGuardando(false);
    if (error) { toast("No se pudo cambiar. Usá al menos 8 caracteres.", "hold"); return; }
    setClave(""); toast("Contraseña guardada");
  };
  return (
    <section className="panel">
      <h2>Cuenta</h2>
      <form className="new-item" onSubmit={guardar}>
        <p className="demo-note" style={{ textAlign: "left", margin: 0 }}>Entraste como {email}. Desde este dispositivo no te vamos a pedir nada hasta que toques “Cerrar sesión”.</p>
        <input type="email" autoComplete="username" value={email} readOnly hidden />
        <label>Contraseña nueva<input type="password" autoComplete="new-password" minLength={8} required value={clave} onChange={e => setClave(e.target.value)} /></label>
        <button className="cta" type="submit" disabled={guardando || clave.length < 8}>{guardando ? "Guardando…" : "Guardar contraseña"}</button>
      </form>
      <div className="new-item"><button className="cta ghost" onClick={() => void sb.auth.signOut()}>Cerrar sesión</button></div>
    </section>
  );
}

// ---------- Finanzas ----------

const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
const claveMes = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
const nombreMes = (k: string) => { const [a, m] = k.split("-"); return `${MESES[Number(m) - 1]} ${a}`; };
const mover = (k: string, n: number) => { const [a, m] = k.split("-").map(Number); return claveMes(new Date(a, m - 1 + n, 1)); };
const CONCEPTOS = ["Envío", "Bolsas y packaging", "Compra de ropa", "Publicidad", "Otro"];

// Fecha de venta: la guardada por la base; si falta (antes de correr finanzas.sql), la del pedido o la de carga.
function fechaVenta(f: FilaPrenda, pedidos: Pedido[]) {
  return f.vendida_en ?? pedidos.find(p => p.id === f.pedido_id)?.creado ?? f.creada;
}
function resumenMes(filas: FilaPrenda[], pedidos: Pedido[], gastos: Gasto[], mes: string) {
  const vendidas = filas.filter(f => f.estado === "vendida" && claveMes(new Date(fechaVenta(f, pedidos))) === mes);
  const ingresos = vendidas.reduce((a, f) => a + f.precio, 0);
  const costo = vendidas.reduce((a, f) => a + (f.costo || 0), 0);
  const delMes = gastos.filter(g => g.fecha.slice(0, 7) === mes);
  const otros = delMes.reduce((a, g) => a + g.monto, 0);
  return { vendidas, ingresos, costo, gastos: delMes, otros, egresos: costo + otros, ganancia: ingresos - costo - otros, sinCosto: vendidas.filter(f => !f.costo).length };
}

function Finanzas({ filas, pedidos, gastos, onCambio }: { filas: FilaPrenda[]; pedidos: Pedido[]; gastos: Gasto[] | null; onCambio: () => Promise<void> }) {
  const sb = supabase()!;
  const { toast } = useStore();
  const hoy = claveMes(new Date());
  const [mes, setMes] = useState(hoy);
  const r = useMemo(() => resumenMes(filas, pedidos, gastos ?? [], mes), [filas, pedidos, gastos, mes]);
  const ultimos = useMemo(() => Array.from({ length: 6 }, (_, i) => mover(hoy, -5 + i)).map(k => ({ k, ...resumenMes(filas, pedidos, gastos ?? [], k) })), [filas, pedidos, gastos, hoy]);
  const tope = Math.max(1, ...ultimos.map(u => Math.max(u.ingresos, u.egresos)));
  const enStock = filas.filter(f => f.estado !== "vendida");
  const invertido = enStock.reduce((a, f) => a + (f.costo || 0), 0);
  const potencial = enStock.reduce((a, f) => a + f.precio, 0);

  const [nuevo, setNuevo] = useState({ concepto: CONCEPTOS[0], detalle: "", monto: "", fecha: new Date().toLocaleDateString("en-CA") });
  const [guardando, setGuardando] = useState(false);
  const num = (s: string) => Number(s.replace(/\D/g, "")) || 0;
  const agregar = async (e: React.FormEvent) => {
    e.preventDefault(); setGuardando(true);
    const concepto = nuevo.detalle.trim() ? `${nuevo.concepto}: ${nuevo.detalle.trim()}` : nuevo.concepto;
    const { error } = await sb.from("gastos").insert({ concepto, monto: num(nuevo.monto), fecha: nuevo.fecha });
    setGuardando(false);
    if (error) { toast("No se pudo guardar el gasto. Probá de nuevo.", "hold"); return; }
    toast(`Gasto guardado: Gs. ${gs(num(nuevo.monto))}`);
    setNuevo(x => ({ ...x, detalle: "", monto: "" }));
    setMes(nuevo.fecha.slice(0, 7));
    await onCambio();
  };
  const borrar = async (g: Gasto) => {
    if (!window.confirm(`¿Borrar el gasto “${g.concepto}” de Gs. ${gs(g.monto)}?`)) return;
    const { error } = await sb.from("gastos").delete().eq("id", g.id);
    toast(error ? "No se pudo borrar." : "Gasto borrado", error ? "hold" : "");
    await onCambio();
  };

  return (
    <div className="fin">
      <div className="fin-mes">
        <button type="button" aria-label="Mes anterior" onClick={() => setMes(mover(mes, -1))}>‹</button>
        <h2>{nombreMes(mes)}</h2>
        <button type="button" aria-label="Mes siguiente" disabled={mes >= hoy} onClick={() => setMes(mover(mes, 1))}>›</button>
      </div>

      <div className="kpis">
        <div className="kpi"><small>Entró (ventas)</small><b>Gs. {gs(r.ingresos)}</b><span className="kpi-sub">{r.vendidas.length} {r.vendidas.length === 1 ? "prenda vendida" : "prendas vendidas"}</span></div>
        <div className="kpi"><small>Salió (gastos)</small><b>Gs. {gs(r.egresos)}</b><span className="kpi-sub">Costo de lo vendido + otros gastos</span></div>
        <div className={`kpi main${r.ganancia < 0 ? " neg" : ""}`}><small>{r.ganancia < 0 ? "Pérdida" : "Ganancia"}</small><b>Gs. {gs(Math.abs(r.ganancia))}</b><span className="kpi-sub">Lo que te quedó en el mes</span></div>
      </div>

      <div className="cols">
        <section className="panel">
          <h2>Cómo se calcula</h2>
          <div className="exp"><span>Ventas del mes<small>Precio de las prendas que pasaron a Vendida</small></span><span>Gs. {gs(r.ingresos)}</span></div>
          <div className="exp"><span>− Lo que te costaron esas prendas<small>El “costo” que pusiste al cargar cada una</small></span><span>Gs. {gs(r.costo)}</span></div>
          <div className="exp"><span>− Otros gastos del mes<small>Envíos, bolsas y lo que anotes abajo</small></span><span>Gs. {gs(r.otros)}</span></div>
          <div className="exp fin-total"><span>= {r.ganancia < 0 ? "Pérdida" : "Ganancia"}</span><span>Gs. {gs(r.ganancia)}</span></div>
          {r.sinCosto > 0 && <p className="fin-aviso">{r.sinCosto === 1 ? "1 prenda vendida no tiene" : `${r.sinCosto} prendas vendidas no tienen`} costo cargado, así que la ganancia puede ser menor. Podés completarlo en Prendas.</p>}

          <h2>Ventas de {MESES[Number(mes.slice(5)) - 1]}</h2>
          {r.vendidas.length === 0 && <p className="empty-row">No hubo ventas este mes.</p>}
          {r.vendidas.map(f => (
            <div className="exp" key={f.id}>
              <span>{f.titulo}<small>{f.id} · costó Gs. {gs(f.costo || 0)} · ganaste Gs. {gs(f.precio - (f.costo || 0))}</small></span>
              <span>Gs. {gs(f.precio)}</span>
            </div>
          ))}
        </section>

        <div className="fin-side">
          <section className="panel">
            <h2>Últimos 6 meses</h2>
            <div className="fin-leyenda"><span><i className="in" />Entró</span><span><i className="out" />Salió</span></div>
            {ultimos.map(u => (
              <button type="button" key={u.k} className={`fin-bar${u.k === mes ? " on" : ""}`} onClick={() => setMes(u.k)}>
                <span className="fin-bar-mes">{MESES[Number(u.k.slice(5)) - 1].slice(0, 3)}</span>
                <span className="fin-bar-barras">
                  <i className="in" style={{ width: `${(u.ingresos / tope) * 100}%` }} />
                  <i className="out" style={{ width: `${(u.egresos / tope) * 100}%` }} />
                </span>
                <span className="fin-bar-gan">{u.ganancia < 0 ? "−" : ""}Gs. {gs(Math.abs(u.ganancia))}</span>
              </button>
            ))}
          </section>

          <section className="panel">
            <h2>Ropa sin vender</h2>
            <div className="exp"><span>Lo que pagaste por ella<small>{enStock.length} prendas en la tienda o reservadas</small></span><span>Gs. {gs(invertido)}</span></div>
            <div className="exp"><span>Si la vendés toda<small>Suma de los precios de venta</small></span><span>Gs. {gs(potencial)}</span></div>
          </section>

          <section className="panel">
            <h2>Otros gastos</h2>
            {gastos === null ? (
              <p className="fin-aviso">Para anotar gastos falta un paso único en la base de datos: correr el archivo <b>supabase/finanzas.sql</b> en Supabase (SQL Editor).</p>
            ) : (
              <>
                <form className="new-item" onSubmit={agregar}>
                  <div className="two">
                    <label>Tipo<select value={nuevo.concepto} onChange={e => setNuevo(x => ({ ...x, concepto: e.target.value }))}>{CONCEPTOS.map(c => <option key={c}>{c}</option>)}</select></label>
                    <label>Monto (Gs.)<input required inputMode="numeric" placeholder="25.000" value={nuevo.monto}
                      onChange={e => setNuevo(x => ({ ...x, monto: e.target.value.replace(/\D/g, "") ? gs(num(e.target.value)) : "" }))} /></label>
                  </div>
                  <div className="two">
                    <label>Detalle (opcional)<input value={nuevo.detalle} placeholder="Ej: moto a Lambaré" onChange={e => setNuevo(x => ({ ...x, detalle: e.target.value }))} /></label>
                    <label>Fecha<input type="date" required value={nuevo.fecha} onChange={e => setNuevo(x => ({ ...x, fecha: e.target.value }))} /></label>
                  </div>
                  <button className="cta" type="submit" disabled={guardando || !num(nuevo.monto)}>{guardando ? "Guardando…" : "Anotar gasto"}</button>
                </form>
                {r.gastos.length === 0 && <p className="empty-row">Sin otros gastos en {MESES[Number(mes.slice(5)) - 1]}.</p>}
                {r.gastos.map(g => (
                  <div className="exp" key={g.id}>
                    <span>{g.concepto}<small>{new Date(`${g.fecha}T12:00`).toLocaleDateString("es-PY", { day: "numeric", month: "short" })} · <button type="button" className="linkish" onClick={() => borrar(g)}>Borrar</button></small></span>
                    <span>Gs. {gs(g.monto)}</span>
                  </div>
                ))}
              </>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
