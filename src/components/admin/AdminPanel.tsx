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

type FilaPrenda = {
  id: string; titulo: string; marca: string; talle: string; precio: number; categoria: string; condicion: string;
  costo: number; dibujo: string; color: string; fondo: string; estado: "disponible" | "reservada" | "vendida";
  reservada_hasta: string | null; pedido_id: string | null; creada: string;
};
type Pedido = { id: string; codigo: string; prendas: string[]; zona: string; total: number; estado: string; creado: string; vence: string };

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

  const cargar = useCallback(async () => {
    const [p, o] = await Promise.all([
      sb.from("prendas").select("*").order("creada", { ascending: false }),
      sb.from("pedidos").select("*").order("creado", { ascending: false }).limit(60),
    ]);
    if (p.data) setFilas(p.data as FilaPrenda[]);
    if (o.data) setPedidos(o.data as Pedido[]);
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
  const activa = seccion ?? "Pedidos";

  const confirmar = async (p: Pedido) => {
    const { error } = await sb.rpc("confirmar_pedido", { p_pedido: p.id });
    await listo(error ? "No se pudo confirmar. Probá de nuevo." : `Pedido #${p.codigo} vendido`, error ? "hold" : "sold");
  };
  const cancelar = async (p: Pedido) => {
    if (!window.confirm(`¿Cancelar el pedido #${p.codigo}? Las prendas vuelven a estar disponibles.`)) return;
    const { error } = await sb.rpc("cancelar_pedido", { p_pedido: p.id });
    await listo(error ? "No se pudo cancelar. Probá de nuevo." : `Pedido #${p.codigo} cancelado`);
  };

  const MENU: { k: string; sub: string; n?: number }[] = [
    { k: "Pedidos", sub: "Confirmá o cancelá lo que te piden", n: pendientes.length },
    { k: "Prendas", sub: "Editá precio, talle o estado", n: prendas.length },
    { k: "Nueva prenda", sub: "Publicá algo nuevo en la tienda" },
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
          <button className="linkish adm-out" onClick={() => void sb.auth.signOut()} title={email}>Cerrar sesión</button>
        </nav>

        <div className="adm-main">
          <button type="button" className="adm-back" onClick={() => setSeccion(null)}><ChevronIcon />Menú</button>

          {activa === "Pedidos" && (
            <>
              <div className="kpis">
                <div className="kpi main"><small>Por confirmar</small><b>{pendientes.length}</b></div>
                <div className="kpi"><small>Disponibles</small><b>{disponibles.length}</b></div>
                <div className="kpi"><small>Vendidas</small><b>{vendidas.length}</b></div>
                <div className="kpi"><small>Vendido en total</small><b>Gs. {gs(vendidas.reduce((a, p) => a + p.p, 0))}</b></div>
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
            <section className="panel">
              <h2>Mis prendas</h2>
              {prendas.length === 0 && <p className="empty-row">Todavía no cargaste prendas.</p>}
              {prendas.map((it, i) => (
                <button type="button" className="row row-btn" key={it.id} onClick={() => setEditando(filas[i])}>
                  <div className="thumbph ph" style={{ ["--tint" as string]: it.bg }}><Garment it={it} /></div>
                  <div className="t"><b>{it.t}</b><small>{it.id} · Talle {it.s} · Gs. {gs(it.p)}</small></div>
                  <span className={`st-pill ${ESTADO_LABEL[it.st][1]}`}>{ESTADO_LABEL[it.st][0]}</span>
                </button>
              ))}
            </section>
          )}

          {activa === "Nueva prenda" && (
            <section className="panel">
              <h2>Nueva prenda</h2>
              <PrendaForm filas={filas} onListo={async t => { await listo(`Publicaste “${t}”`); setSeccion("Prendas"); }} />
            </section>
          )}

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
