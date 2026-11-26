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

type FilaPrenda = {
  id: string; titulo: string; marca: string; talle: string; precio: number; categoria: string; condicion: string;
  costo: number; dibujo: string; color: string; fondo: string; estado: "disponible" | "reservada" | "vendida";
  reservada_hasta: string | null; pedido_id: string | null; creada: string;
};
type Pedido = { id: string; codigo: string; prendas: string[]; zona: string; total: number; estado: string; creado: string; vence: string };

const OPCIONES = ["Disponible", "Reservada", "Vendida"];
const A_ESTADO: Record<string, Estado> = { Disponible: "av", Reservada: "ho", Vendida: "so" };
const SECCIONES = ["Pedidos", "Prendas", "Nueva prenda", "Cuenta"];
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
  const [seccion, setSeccion] = useState("Pedidos");
  const [filas, setFilas] = useState<FilaPrenda[]>([]);
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [ahora, setAhora] = useState(0);

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

  const confirmar = async (p: Pedido) => {
    const { error } = await sb.rpc("confirmar_pedido", { p_pedido: p.id });
    await listo(error ? "No se pudo confirmar. Probá de nuevo." : `Pedido #${p.codigo} vendido`, error ? "hold" : "sold");
  };
  const cancelar = async (p: Pedido) => {
    if (!window.confirm(`¿Cancelar el pedido #${p.codigo}? Las prendas vuelven a estar disponibles.`)) return;
    const { error } = await sb.rpc("cancelar_pedido", { p_pedido: p.id });
    await listo(error ? "No se pudo cancelar. Probá de nuevo." : `Pedido #${p.codigo} cancelado`);
  };
  const cambiarEstado = async (it: Prenda, o: string) => {
    const st = A_ESTADO[o];
    // Una reserva hecha a mano (por Instagram, en persona) dura una semana; después vuelve a Disponible.
    const cambios = st === "ho"
      ? { estado: ESTADO_A_DB[st], reservada_hasta: new Date(Date.now() + 7 * 864e5).toISOString() }
      : { estado: ESTADO_A_DB[st], reservada_hasta: null, ...(st === "av" ? { pedido_id: null } : {}) };
    setFilas(fs => fs.map(f => (f.id === it.id ? { ...f, ...cambios } as FilaPrenda : f)));
    const { error } = await sb.from("prendas").update(cambios).eq("id", it.id);
    await listo(error ? "No se pudo guardar el cambio." : `${it.t}: ${o.toLowerCase()}`, error ? "hold" : ESTADO_LABEL[st][1]);
  };

  return (
    <main className="wrap admin view view-in">
      <div className="admin-head">
        <div>
          <h1>Hola, Gab</h1>
          <p>Lo que cambies acá se ve al instante en la tienda.</p>
        </div>
        <button className="linkish" onClick={() => void sb.auth.signOut()} title={email}>Salir</button>
      </div>
      <div className="kpis">
        <div className="kpi main"><small>Pedidos por confirmar</small><b>{pendientes.length}</b></div>
        <div className="kpi"><small>Disponibles</small><b>{disponibles.length}</b></div>
        <div className="kpi"><small>Vendidas</small><b>{vendidas.length}</b></div>
        <div className="kpi"><small>Vendido en total</small><b>Gs. {gs(vendidas.reduce((a, p) => a + p.p, 0))}</b></div>
      </div>
      <div className="admin-tabs"><Segmented label="Sección" options={SECCIONES} value={seccion} onChange={setSeccion} /></div>

      {seccion === "Pedidos" && (
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
      )}

      {seccion === "Prendas" && (
        <section className="panel">
          <h2>Mis prendas</h2>
          {prendas.length === 0 && <p className="empty-row">Todavía no cargaste prendas.</p>}
          {prendas.map(it => (
            <div className="row" key={it.id}>
              <div className="thumbph ph" style={{ ["--tint" as string]: it.bg }}><Garment it={it} /></div>
              <div className="t"><b>{it.t}</b><small>{it.id} · Talle {it.s} · Gs. {gs(it.p)}</small></div>
              <Segmented label={`Estado de ${it.t}`} options={OPCIONES} value={ESTADO_LABEL[it.st][0]} onChange={o => void cambiarEstado(it, o)} />
            </div>
          ))}
        </section>
      )}

      {seccion === "Cuenta" && <Cuenta email={email} />}
      {seccion === "Nueva prenda" && <NuevaPrenda filas={filas} onListo={async t => { await listo(`Publicaste “${t}”`); setSeccion("Prendas"); }} />}
    </main>
  );
}

function NuevaPrenda({ filas, onListo }: { filas: FilaPrenda[]; onListo: (t: string) => Promise<void> }) {
  const sb = supabase()!;
  const [f, setF] = useState({ titulo: "", marca: "", talle: "M", precio: "", categoria: "Remeras", condicion: CONDICIONES[1], costo: "" });
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setF(x => ({ ...x, [k]: e.target.value }));
  const num = (s: string) => Number(s.replace(/\D/g, "")) || 0;

  const guardar = async (e: React.FormEvent) => {
    e.preventDefault(); setGuardando(true); setError("");
    // Código siguiente: GS-115, GS-116...
    const max = Math.max(100, ...filas.map(x => Number(x.id.replace(/\D/g, "")) || 0));
    const [color, fondo] = TONOS[(max + 1) % TONOS.length];
    const { error } = await sb.from("prendas").insert({
      id: `GS-${max + 1}`, titulo: f.titulo.trim(), marca: f.marca.trim() || "Sin marca", talle: f.talle,
      precio: num(f.precio), categoria: f.categoria, condicion: f.condicion, costo: num(f.costo),
      dibujo: DIBUJO_POR_CATEGORIA[f.categoria] ?? "tee", color, fondo,
    });
    setGuardando(false);
    if (error) { setError("No se pudo publicar. Revisá los datos y probá de nuevo."); return; }
    await onListo(f.titulo.trim());
  };

  return (
    <section className="panel">
      <h2>Nueva prenda</h2>
      <form className="new-item" onSubmit={guardar}>
        <label>¿Qué es?<input required value={f.titulo} onChange={set("titulo")} placeholder="Ej: Campera de jean oversize" /></label>
        <div className="two">
          <label>Precio (Gs.)<input required inputMode="numeric" value={f.precio} onChange={e => setF(x => ({ ...x, precio: e.target.value.replace(/\D/g, "") ? gs(num(e.target.value)) : "" }))} placeholder="120.000" /></label>
          <label>Talle<select value={f.talle} onChange={set("talle")}>{TALLES.map(t => <option key={t}>{t}</option>)}</select></label>
        </div>
        <div className="two">
          <label>Tipo<select value={f.categoria} onChange={set("categoria")}>{CATEGORIAS.filter(c => c !== "Todo").map(c => <option key={c}>{c}</option>)}</select></label>
          <label>Estado<select value={f.condicion} onChange={set("condicion")}>{CONDICIONES.map(c => <option key={c}>{c}</option>)}</select></label>
        </div>
        <div className="two">
          <label>Marca<input value={f.marca} onChange={set("marca")} placeholder="Opcional" /></label>
          <label>Lo que te costó<input inputMode="numeric" value={f.costo} onChange={e => setF(x => ({ ...x, costo: e.target.value.replace(/\D/g, "") ? gs(num(e.target.value)) : "" }))} placeholder="Solo lo ves vos" /></label>
        </div>
        <p className="demo-note">Las fotos se suman en el próximo paso. Por ahora la prenda se muestra con un dibujo.</p>
        {error && <p className="form-err" role="alert">{error}</p>}
        <button className="cta" type="submit" disabled={guardando || !f.titulo.trim() || !num(f.precio)}>{guardando ? "Publicando…" : "Publicar en la tienda"}</button>
      </form>
    </section>
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
        <p className="demo-note" style={{ textAlign: "left", margin: 0 }}>Entraste como {email}. Desde este dispositivo no te vamos a pedir nada hasta que toques “Salir”.</p>
        <input type="email" autoComplete="username" value={email} readOnly hidden />
        <label>Contraseña nueva<input type="password" autoComplete="new-password" minLength={8} required value={clave} onChange={e => setClave(e.target.value)} /></label>
        <button className="cta" type="submit" disabled={guardando || clave.length < 8}>{guardando ? "Guardando…" : "Guardar contraseña"}</button>
      </form>
    </section>
  );
}
