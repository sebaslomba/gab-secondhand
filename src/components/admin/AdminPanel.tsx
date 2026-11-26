"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
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
import { Envios, quien, type PedidoEnvio } from "@/components/admin/Envios";

type FilaPrenda = {
  id: string; titulo: string; marca: string; talle: string; precio: number; categoria: string; condicion: string;
  costo: number; dibujo: string; color: string; fondo: string; estado: "disponible" | "reservada" | "vendida";
  reservada_hasta: string | null; pedido_id: string | null; creada: string; vendida_en?: string | null; fotos?: string[] | null;
};
export type Gasto = { id: string; fecha: string; concepto: string; monto: number; tipo?: "ingreso" | "egreso" };
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
  st: vigente(f), cond: f.condicion, cost: f.costo, fotos: f.fotos ?? [],
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
  // Hoja de prenda: "nueva" o la prenda a editar. Se guarda aparte de "abierta" para que el contenido
  // no desaparezca mientras la hoja se cierra con la animación.
  const [hoja, setHoja] = useState<{ p: FilaPrenda | null; n: number }>({ p: null, n: 0 });
  const [abierta, setAbierta] = useState(false);
  const abrir = (p: FilaPrenda | null) => { setHoja(h => ({ p, n: h.n + 1 })); setAbierta(true); };
  const cerrar = () => setAbierta(false);
  useEffect(() => {
    if (!abierta) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") setAbierta(false); };
    window.addEventListener("keydown", esc);
    return () => { document.body.style.overflow = prev; window.removeEventListener("keydown", esc); };
  }, [abierta]);
  const [busca, setBusca] = useState("");
  const [tipo, setTipo] = useState("Todo");
  const [estado, setEstado] = useState("Todas");
  // null: la tabla de gastos todavía no existe en la base (falta correr supabase/finanzas.sql).
  const [gastos, setGastos] = useState<Gasto[] | null>([]);

  const cargar = useCallback(async () => {
    const [p, o, g] = await Promise.all([
      sb.from("prendas").select("*").order("creada", { ascending: false }),
      sb.from("pedidos").select("*").order("creado", { ascending: false }).limit(200),
      sb.from("gastos").select("*").order("fecha", { ascending: false }),
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
  const mesActual = useMemo(() => { const [d, h] = rangoMes(new Date()); return resumen(filas, pedidos, gastos ?? [], d, h); }, [filas, pedidos, gastos]);
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
    await listo(error ? "No se pudo confirmar. Probá de nuevo." : `${quien(p)}: vendido. Organizá el envío en Envíos`, error ? "hold" : "sold");
  };
  const nombrar = async (p: Pedido, nombre: string) => {
    const { error } = await sb.from("pedidos").update({ cliente: nombre.trim() }).eq("id", p.id);
    await listo(error ? "No se pudo guardar el nombre." : nombre.trim() ? `Guardado: ${nombre.trim()}` : "Nombre borrado", error ? "hold" : "");
  };
  const cancelar = async (p: Pedido) => {
    if (!window.confirm(`¿Cancelar ${p.cliente?.trim() ? `el pedido de ${p.cliente.trim()}` : `el pedido #${p.codigo}`}? Las prendas vuelven a estar disponibles.`)) return;
    const { error } = await sb.rpc("cancelar_pedido", { p_pedido: p.id });
    await listo(error ? "No se pudo cancelar. Probá de nuevo." : `${quien(p)}: cancelado`);
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
                  <span className="kpi-sub">{mesActual.ventas.length} {mesActual.ventas.length === 1 ? "prenda" : "prendas"}</span></div>
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
                        <b>{quien(p)}{p.cliente?.trim() && <small className="env-cod"> #{p.codigo}</small>}</b>
                        <span className="order-time">Reservado {min} min más</span>
                      </header>
                      <input className="order-cliente" defaultValue={p.cliente ?? ""} placeholder={`Nombre de la clienta (código #${p.codigo} en WhatsApp)`}
                        aria-label="Nombre de la clienta" onBlur={e => { if (e.target.value.trim() !== (p.cliente ?? "").trim()) void nombrar(p, e.target.value); }}
                        onKeyDown={e => { if (e.key === "Enter") e.currentTarget.blur(); }} />
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
                      <div className="exp" key={p.id}><span>{quien(p)} · {p.prendas.length} {p.prendas.length === 1 ? "prenda" : "prendas"}<small>{hora(p.creado)}</small></span><span>Gs. {gs(p.total)}</span></div>
                    ))}
                  </>
                )}
              </section>
            </>
          )}

          {activa === "Prendas" && (
            <section className="panel adm-prendas">
              <div className="adm-head">
                <h2>Mis prendas</h2>
                <button type="button" className="adm-add" onClick={() => abrir(null)}><span aria-hidden="true">+</span>Nueva prenda</button>
              </div>
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
                      onClick={() => abrir(f)} aria-label={`Editar ${it.t}, talle ${it.s}, ${lab}`}>
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

      {/* Fuera de <main>: su animación de entrada usa transform y atraparía lo que es "fixed". */}
      {createPortal(<>
      {activa === "Prendas" && (
        <button type="button" className={`adm-fab${abierta ? " off" : ""}`} onClick={() => abrir(null)} aria-label="Agregar prenda nueva">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>
        </button>
      )}

      <div className={`scrim ed-scrim${abierta ? " open" : ""}`} onClick={cerrar} />
      <div className={`sheet ed${abierta ? " open" : ""}`} role="dialog" aria-modal="true"
        aria-label={hoja.p ? "Editar prenda" : "Nueva prenda"} aria-hidden={!abierta}>
        <header className="ed-head">
          <button type="button" className="ed-x" onClick={cerrar} aria-label="Cerrar">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" /></svg>
          </button>
          <div>
            <h3>{hoja.p ? "Editar prenda" : "Nueva prenda"}</h3>
            <small>{hoja.p ? `${hoja.p.id} · ${hoja.p.titulo}` : "Se publica al instante en la tienda"}</small>
          </div>
        </header>
        <div className="s-body">
          {hoja.n > 0 && (
            <PrendaForm key={hoja.n} filas={filas} prenda={hoja.p ?? undefined}
              onListo={async t => { const era = hoja.p; cerrar(); await listo(era ? `Guardaste “${t}”` : `Publicaste “${t}”`); }}
              onCancelar={cerrar} />
          )}
        </div>
      </div>
      </>, document.body)}
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
  const [fotos, setFotos] = useState<string[]>(prenda?.fotos ?? []);
  const [subiendo, setSubiendo] = useState(0);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const subir = async (archivos: FileList | null) => {
    if (!archivos?.length) return;
    setError("");
    const lista = [...archivos].slice(0, 8);
    setSubiendo(n => n + lista.length);
    for (const a of lista) {
      try {
        const blob = await comprimir(a);
        const ruta = `prendas/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`;
        const { error } = await sb.storage.from("fotos").upload(ruta, blob, { contentType: "image/jpeg", cacheControl: "31536000" });
        if (error) throw error;
        const url = sb.storage.from("fotos").getPublicUrl(ruta).data.publicUrl;
        setFotos(x => [...x, url]);
      } catch {
        setError("No se pudo subir una foto. Si es la primera vez, falta correr supabase/fotos.sql en Supabase.");
      } finally {
        setSubiendo(n => n - 1);
      }
    }
  };
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
      ...(fotos.length || prenda?.fotos?.length ? { fotos } : {}),
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
      <div className="field-seg"><span>Fotos <small className="env-hint">La primera es la portada</small></span>
        <div className="fotos-edit">
          {fotos.map((u, i) => (
            <div key={u} className={`fotos-item${i === 0 ? " portada" : ""}`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={u} alt={`Foto ${i + 1}`} />
              <button type="button" className="fotos-x" aria-label={`Quitar foto ${i + 1}`} onClick={() => setFotos(x => x.filter(y => y !== u))}>×</button>
              {i > 0 && <button type="button" className="fotos-portada" onClick={() => setFotos(x => [u, ...x.filter(y => y !== u)])}>Portada</button>}
            </div>
          ))}
          {Array.from({ length: subiendo }, (_, i) => <div key={`s${i}`} className="fotos-item cargando" aria-label="Subiendo foto" />)}
          <label className="fotos-add">
            <input type="file" accept="image/*" multiple onChange={e => { void subir(e.target.files); e.target.value = ""; }} />
            <span>+</span><small>Agregar fotos</small>
          </label>
        </div>
      </div>
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
      {error && <p className="form-err" role="alert">{error}</p>}
      <div className="order-act">
        {onCancelar && <button type="button" className="cta ghost" onClick={onCancelar}>Cancelar</button>}
        <button className="cta" type="submit" disabled={guardando || subiendo > 0 || !f.titulo.trim() || !num(f.precio)}>
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
// Ingreso: ventas por fecha de venta. Egreso: lo que pagaste por cada prenda (por fecha de carga) + gastos anotados.
// Ganancia: ingreso − egreso del mismo período.

const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
const isoDia = (d: Date) => d.toLocaleDateString("en-CA");
const deIso = (s: string) => new Date(`${s}T12:00`);
const rangoMes = (d: Date): [string, string] => [isoDia(new Date(d.getFullYear(), d.getMonth(), 1)), isoDia(new Date(d.getFullYear(), d.getMonth() + 1, 0))];
const rangoSemana = (d: Date): [string, string] => {
  const lun = new Date(d.getFullYear(), d.getMonth(), d.getDate() - ((d.getDay() + 6) % 7));
  return [isoDia(lun), isoDia(new Date(lun.getFullYear(), lun.getMonth(), lun.getDate() + 6))];
};
const corta = (s: string) => deIso(s).toLocaleDateString("es-PY", { day: "numeric", month: "short" });
const CONCEPTOS = { egreso: ["Envío", "Bolsas y packaging", "Publicidad", "Otro"], ingreso: ["Live de TikTok", "Grupo de WhatsApp", "Instagram", "Venta en persona", "Otro"] };

type Mov = { key: string; fecha: string; titulo: string; detalle: string; monto: number; gasto?: Gasto };

// Fecha de venta: la guardada por la base; si falta, la del pedido o la de carga.
function fechaVenta(f: FilaPrenda, pedidos: Pedido[]) {
  return isoDia(new Date(f.vendida_en ?? pedidos.find(p => p.id === f.pedido_id)?.creado ?? f.creada));
}
function resumen(filas: FilaPrenda[], pedidos: Pedido[], gastos: Gasto[], desde: string, hasta: string) {
  const dentro = (d: string) => d >= desde && d <= hasta;
  const ventas: Mov[] = filas.filter(f => f.estado === "vendida").map(f => ({ key: `v${f.id}`, fecha: fechaVenta(f, pedidos), titulo: f.titulo, detalle: f.id, monto: f.precio })).concat(
      gastos.filter(g => g.tipo === "ingreso").map(g => ({ key: `g${g.id}`, fecha: g.fecha, titulo: g.concepto, detalle: "Ingreso anotado", monto: g.monto, gasto: g })))
    .filter(m => dentro(m.fecha)).sort((a, b) => b.fecha.localeCompare(a.fecha));
  const egresos: Mov[] = [
    ...filas.filter(f => f.costo > 0).map(f => ({ key: `c${f.id}`, fecha: isoDia(new Date(f.creada)), titulo: f.titulo, detalle: `Compra de prenda · ${f.id}`, monto: f.costo })),
    ...gastos.filter(g => g.tipo !== "ingreso").map(g => ({ key: `g${g.id}`, fecha: g.fecha, titulo: g.concepto, detalle: "Gasto anotado", monto: g.monto, gasto: g })),
  ].filter(m => dentro(m.fecha)).sort((a, b) => b.fecha.localeCompare(a.fecha));
  const ingreso = ventas.reduce((a, m) => a + m.monto, 0);
  const egreso = egresos.reduce((a, m) => a + m.monto, 0);
  return { ventas, egresos, ingreso, egreso, ganancia: ingreso - egreso, ingresos: ingreso };
}

function Finanzas({ filas, pedidos, gastos, onCambio }: { filas: FilaPrenda[]; pedidos: Pedido[]; gastos: Gasto[] | null; onCambio: () => Promise<void> }) {
  const sb = supabase()!;
  const { toast } = useStore();
  const [modo, setModo] = useState("Mes");
  const [ancla, setAncla] = useState(() => new Date());
  const [libre, setLibre] = useState(() => rangoMes(new Date()));
  const [abierto, setAbierto] = useState<string | null>(null);

  const [desde, hasta] = modo === "Semana" ? rangoSemana(ancla) : modo === "Mes" ? rangoMes(ancla) : libre;
  const r = useMemo(() => resumen(filas, pedidos, gastos ?? [], desde, hasta), [filas, pedidos, gastos, desde, hasta]);
  const mover = (n: number) => setAncla(a => modo === "Semana" ? new Date(a.getFullYear(), a.getMonth(), a.getDate() + 7 * n) : new Date(a.getFullYear(), a.getMonth() + n, 1));
  const enCurso = hasta >= isoDia(new Date());
  const titulo = modo === "Mes" ? `${MESES[ancla.getMonth()]} ${ancla.getFullYear()}` : `${corta(desde)} – ${corta(hasta)}`;

  const meses = useMemo(() => {
    const hoy = new Date();
    return Array.from({ length: 6 }, (_, i) => new Date(hoy.getFullYear(), hoy.getMonth() - 5 + i, 1)).map(d => {
      const [a, b] = rangoMes(d);
      return { d, ...resumen(filas, pedidos, gastos ?? [], a, b) };
    });
  }, [filas, pedidos, gastos]);
  const tope = Math.max(1, ...meses.map(m => Math.max(m.ingreso, m.egreso)));

  const borrar = async (g: Gasto) => {
    if (!window.confirm(`¿Borrar “${g.concepto}” de Gs. ${gs(g.monto)}?`)) return;
    const { error } = await sb.from("gastos").delete().eq("id", g.id);
    toast(error ? "No se pudo borrar." : "Borrado", error ? "hold" : "");
    await onCambio();
  };
  const lista = (movs: Mov[], vacio: string) => movs.length === 0 ? <p className="empty-row">{vacio}</p> : movs.map(m => (
    <div className="exp" key={m.key}>
      <span>{m.titulo}<small>{corta(m.fecha)} · {m.detalle}{m.gasto && <> · <button type="button" className="linkish" onClick={() => borrar(m.gasto!)}>Borrar</button></>}</small></span>
      <span>Gs. {gs(m.monto)}</span>
    </div>
  ));
  const boton = (k: string, label: string, monto: number, cls: string) => (
    <button type="button" className={`fin-btn ${cls}${abierto === k ? " on" : ""}`} aria-expanded={abierto === k} onClick={() => setAbierto(abierto === k ? null : k)}>
      <small>{label}</small>
      <b>{monto < 0 ? "−" : ""}Gs. {gs(Math.abs(monto))}</b>
      <span className="fin-ver">{abierto === k ? "Ocultar detalle" : "Ver detalle"}<ChevronIcon /></span>
    </button>
  );

  return (
    <div className="fin">
      <div className="fin-periodo">
        <Segmented label="Período" options={["Semana", "Mes", "Fechas"]} value={modo} onChange={setModo} />
        {modo === "Fechas" ? (
          <div className="fin-fechas">
            <label>Desde<input type="date" value={libre[0]} max={libre[1]} onChange={e => setLibre([e.target.value, libre[1]])} /></label>
            <label>Hasta<input type="date" value={libre[1]} min={libre[0]} onChange={e => setLibre([libre[0], e.target.value])} /></label>
          </div>
        ) : (
          <div className="fin-mes">
            <button type="button" aria-label="Anterior" onClick={() => mover(-1)}>‹</button>
            <h2>{titulo}</h2>
            <button type="button" aria-label="Siguiente" disabled={enCurso} onClick={() => mover(1)}>›</button>
          </div>
        )}
      </div>

      <div className="fin-btns">
        {boton("in", "Ingreso", r.ingreso, "in")}
        {boton("out", "Egreso", r.egreso, "out")}
        {boton("gan", "Ganancia", r.ganancia, "gan")}
      </div>

      {abierto === "in" && (
        <section className="panel fin-det in">
          <h2>Ingresos</h2>
          {lista(r.ventas, "No hubo ingresos en este período.")}
          <h2>Anotar un ingreso</h2>
          <Anotar tipo="ingreso" sinTabla={gastos === null} onCambio={onCambio} />
        </section>
      )}
      {abierto === "out" && (
        <section className="panel fin-det out">
          <h2>Egresos</h2>
          {lista(r.egresos, "No hubo egresos en este período.")}
          <h2>Anotar un gasto</h2>
          <Anotar tipo="egreso" sinTabla={gastos === null} onCambio={onCambio} />
        </section>
      )}
      {abierto === "gan" && (
        <section className="panel fin-det">
          <div className="exp"><span>Ingreso</span><span className="t-in">Gs. {gs(r.ingreso)}</span></div>
          <div className="exp"><span>Egreso</span><span className="t-out">− Gs. {gs(r.egreso)}</span></div>
          <div className="exp fin-total"><span>Ganancia</span><span>Gs. {gs(r.ganancia)}</span></div>
        </section>
      )}

      <section className="panel fin-chart">
        <h2>Por mes</h2>
        <div className="fin-cols">
          {meses.map(m => (
            <button type="button" key={m.d.getMonth()} className="fin-col" onClick={() => { setModo("Mes"); setAncla(m.d); }}
              aria-label={`${MESES[m.d.getMonth()]}: ingreso Gs. ${gs(m.ingreso)}, egreso Gs. ${gs(m.egreso)}`}>
              <span className="fin-col-barras">
                <i className="in" style={{ height: `${(m.ingreso / tope) * 100}%` }} />
                <i className="out" style={{ height: `${(m.egreso / tope) * 100}%` }} />
              </span>
              <small>{MESES[m.d.getMonth()].slice(0, 3)}</small>
            </button>
          ))}
        </div>
        <div className="fin-leyenda"><span><i className="in" />Ingreso</span><span><i className="out" />Egreso</span></div>
      </section>
    </div>
  );
}

// Formulario para anotar un ingreso (live, WhatsApp…) o un gasto (envío, bolsas…) a mano.
function Anotar({ tipo, sinTabla, onCambio }: { tipo: "ingreso" | "egreso"; sinTabla: boolean; onCambio: () => Promise<void> }) {
  const sb = supabase()!;
  const { toast } = useStore();
  const [f, setF] = useState({ concepto: CONCEPTOS[tipo][0], detalle: "", monto: "", fecha: isoDia(new Date()) });
  const [guardando, setGuardando] = useState(false);
  const num = (t: string) => Number(t.replace(/\D/g, "")) || 0;
  if (sinTabla) return <p className="fin-aviso">Falta correr <b>supabase/finanzas.sql</b> en Supabase (SQL Editor).</p>;
  const guardar = async (e: React.FormEvent) => {
    e.preventDefault(); setGuardando(true);
    const concepto = f.detalle.trim() ? `${f.concepto}: ${f.detalle.trim()}` : f.concepto;
    const { error } = await sb.from("gastos").insert({ concepto, monto: num(f.monto), fecha: f.fecha, tipo });
    setGuardando(false);
    if (error) {
      toast(tipo === "ingreso" ? "No se pudo guardar. ¿Corriste el SQL nuevo de finanzas?" : "No se pudo guardar. Probá de nuevo.", "hold");
      return;
    }
    toast(`${tipo === "ingreso" ? "Ingreso" : "Gasto"} anotado: Gs. ${gs(num(f.monto))}`);
    setF(x => ({ ...x, detalle: "", monto: "" }));
    await onCambio();
  };
  return (
    <form className="new-item" onSubmit={guardar}>
      <div className="two">
        <label>{tipo === "ingreso" ? "De dónde" : "Tipo"}<select value={f.concepto} onChange={e => setF(x => ({ ...x, concepto: e.target.value }))}>{CONCEPTOS[tipo].map(c => <option key={c}>{c}</option>)}</select></label>
        <label>Monto (Gs.)<input required inputMode="numeric" placeholder={tipo === "ingreso" ? "150.000" : "25.000"} value={f.monto}
          onChange={e => setF(x => ({ ...x, monto: e.target.value.replace(/\D/g, "") ? gs(num(e.target.value)) : "" }))} /></label>
      </div>
      <div className="two">
        <label>Detalle (opcional)<input value={f.detalle} placeholder={tipo === "ingreso" ? "Ej: 3 remeras en el live" : "Ej: moto a Lambaré"} onChange={e => setF(x => ({ ...x, detalle: e.target.value }))} /></label>
        <label>Fecha<input type="date" required value={f.fecha} onChange={e => setF(x => ({ ...x, fecha: e.target.value }))} /></label>
      </div>
      <button className="cta" type="submit" disabled={guardando || !num(f.monto)}>{guardando ? "Guardando…" : tipo === "ingreso" ? "Anotar ingreso" : "Anotar gasto"}</button>
    </form>
  );
}

// Achica la foto del celular (a 1600 px y JPEG) para que suba rápido y la tienda cargue liviana.
async function comprimir(archivo: File): Promise<Blob> {
  const bmp = await createImageBitmap(archivo);
  const escala = Math.min(1, 1600 / Math.max(bmp.width, bmp.height));
  const c = document.createElement("canvas");
  c.width = Math.round(bmp.width * escala); c.height = Math.round(bmp.height * escala);
  c.getContext("2d")!.drawImage(bmp, 0, 0, c.width, c.height);
  bmp.close();
  return new Promise((ok, mal) => c.toBlob(b => (b ? ok(b) : mal(new Error("foto"))), "image/jpeg", 0.82));
}
