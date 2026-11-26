"use client";
import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { PRENDAS, RESERVA_MIN, deFila, type Estado, type FilaCatalogo, type Prenda } from "@/lib/data";

type Ctx = {
  items: Prenda[];
  setEstado: (id: string, st: Estado) => void;
  openId: string | null;
  open: (id: string) => void;
  close: () => void;
  toast: (msg: string, dot?: string) => void;
  toastMsg: { msg: string; dot: string } | null;
  // Carrito: cada prenda es única, así que solo guardamos ids (sin cantidades).
  cart: string[];
  inCart: (id: string) => boolean;
  addToCart: (id: string) => void;
  removeFromCart: (id: string) => void;
  cartOpen: boolean;
  openCart: () => void;
  closeCart: () => void;
  // Pedido enviado por WhatsApp: desde ese momento corren los minutos de reserva de esas prendas.
  // Con base de datos, "pedido" es el id secreto del pedido y "codigo" el corto que ve Gab.
  reserved: { at: number; ids: string[]; pedido?: string; codigo?: string } | null;
  reserveCart: (zona: string) => Promise<Reserva>;
  // Vuelve a leer los estados del servidor (si hay base de datos).
  sync: () => Promise<void>;
  finishOrder: () => void;
};
export type Reserva =
  | { ok: true; ids: string[]; codigo?: string }
  | { ok: false; ids: string[]; error?: boolean };

const StoreCtx = createContext<Ctx | null>(null);
const KEY = "gab-carrito";
const RESERVA_MS = RESERVA_MIN * 60 * 1000;

export function StoreProvider({ children }: { children: React.ReactNode }) {
  // Con base de datos se arranca vacío (sin mostrar las prendas de ejemplo) hasta que llega el catálogo.
  const [items, setItems] = useState<Prenda[]>(process.env.NEXT_PUBLIC_SUPABASE_URL ? [] : PRENDAS);
  const [openId, setOpenId] = useState<string | null>(null);
  const [toastMsg, setToast] = useState<Ctx["toastMsg"]>(null);
  const [cart, setCart] = useState<string[]>([]);
  const [reserved, setReserved] = useState<Ctx["reserved"]>(null);
  const [cartOpen, setCartOpen] = useState(false);
  const [loaded, setLoaded] = useState(false);
  // "db": los estados vienen del servidor. "local": todavía sin base, todo vive en este navegador.
  const modo = useRef<"db" | "local">("local");
  const reservedRef = useRef<Ctx["reserved"]>(null);
  useEffect(() => { reservedRef.current = reserved; }, [reserved]);
  const t = useRef<ReturnType<typeof setTimeout> | null>(null);

  const setEstado = useCallback((id: string, st: Estado) => {
    setItems(xs => xs.map(x => (x.id === id ? { ...x, st } : x)));
  }, []);
  const toast = useCallback((msg: string, dot = "") => {
    setToast({ msg, dot });
    if (t.current) clearTimeout(t.current);
    t.current = setTimeout(() => setToast(null), 3200);
  }, []);

  // Con base de datos, el catálogo entero (prendas nuevas incluidas) viene del servidor.
  const sync = useCallback(async () => {
    try {
      const r = await fetch("/api/catalogo", { cache: "no-store" });
      // Base sin preparar o caída: se muestran las prendas de ejemplo y todo sigue en modo local.
      if (!r.ok) { setItems(cur => (cur.length ? cur : PRENDAS)); return; }
      const j = (await r.json()) as { modo: string; prendas: FilaCatalogo[] };
      modo.current = "db";
      setItems(j.prendas.map(deFila));
    } catch { /* sin conexión: se queda con lo último que sabía */ }
  }, []);
  // Al entrar y cada vez que la persona vuelve a la pestaña, se actualizan los estados.
  useEffect(() => {
    queueMicrotask(() => { void sync(); });
    const v = () => { if (document.visibilityState === "visible") void sync(); };
    document.addEventListener("visibilitychange", v);
    return () => document.removeEventListener("visibilitychange", v);
  }, [sync]);

  // El carrito se recuerda en este navegador; si había una reserva vigente, se vuelve a marcar.
  useEffect(() => {
    const restore = () => { try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const saved = JSON.parse(raw) as { cart?: string[]; reserved?: Ctx["reserved"] };
        const ids = (saved.cart ?? []).filter(id => !PRENDAS.some(p => p.id === id && p.st === "so"));
        const r = saved.reserved && Date.now() - saved.reserved.at < RESERVA_MS
          ? { at: saved.reserved.at, ids: saved.reserved.ids.filter(id => ids.includes(id)) } : null;
        setCart(ids);
        setReserved(r?.ids.length ? r : null);
        if (r) setItems(xs => xs.map(x => (r.ids.includes(x.id) && x.st === "av" ? { ...x, st: "ho" } : x)));
      }
    } catch { /* sin almacenamiento: el carrito vive solo en esta visita */ }
    setLoaded(true); };
    queueMicrotask(restore);
  }, []);
  useEffect(() => {
    if (!loaded) return;
    try { localStorage.setItem(KEY, JSON.stringify({ cart, reserved })); } catch { /* ignorar */ }
  }, [cart, reserved, loaded]);

  // Al vencer la reserva, las prendas vuelven a estar disponibles (quedan en el carrito).
  useEffect(() => {
    if (!reserved) return;
    const h = setTimeout(() => {
      setItems(xs => xs.map(x => (reserved.ids.includes(x.id) && x.st === "ho" ? { ...x, st: "av" } : x)));
      setReserved(null);
      void sync();
      toast("Tu reserva venció. Las prendas siguen en tu carrito si todavía las querés.", "hold");
    }, Math.max(0, reserved.at + RESERVA_MS - Date.now()));
    return () => clearTimeout(h);
  }, [reserved, toast, sync]);

  const inCart = useCallback((id: string) => cart.includes(id), [cart]);
  const addToCart = useCallback((id: string) => {
    setCart(c => (c.includes(id) ? c : [...c, id]));
  }, []);
  const removeFromCart = useCallback((id: string) => {
    setCart(c => c.filter(x => x !== id));
    // Si estaba reservada por esta persona, se libera para las demás.
    if (reserved?.ids.includes(id)) {
      setItems(xs => xs.map(x => (x.id === id && x.st === "ho" ? { ...x, st: "av" } : x)));
      const ids = reserved.ids.filter(x => x !== id);
      setReserved(ids.length ? { ...reserved, ids } : null);
    }
  }, [reserved]);
  // Reserva todo lo que sigue disponible del carrito (más lo ya reservado) y reinicia los minutos.
  // Con base de datos, el servidor decide: o reserva todas juntas o ninguna, y dice cuáles ya no están.
  const reserveCart = useCallback(async (zona: string): Promise<Reserva> => {
    const prev = reservedRef.current;
    const mine = prev?.ids ?? [];
    const ids = cart.filter(id => mine.includes(id) || items.find(x => x.id === id)?.st === "av");
    const marcar = (at: number, extra: Partial<NonNullable<Ctx["reserved"]>> = {}) => {
      setItems(xs => xs.map(x => (ids.includes(x.id) ? { ...x, st: "ho" } : x)));
      setReserved({ at, ids, ...extra });
    };

    if (modo.current === "local") await sync();
    if (modo.current === "local") { marcar(Date.now()); return { ok: true, ids }; }

    try {
      const r = await fetch("/api/reservar", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids, zona, anterior: prev?.pedido }),
      });
      const j = await r.json();
      if (r.ok && j.ok) {
        marcar(new Date(j.vence).getTime() - RESERVA_MS, { pedido: j.pedido, codigo: j.codigo });
        return { ok: true, ids, codigo: j.codigo };
      }
      if (r.status === 409 && Array.isArray(j.no_disponibles)) {
        const no = j.no_disponibles as { id: string; estado: string }[];
        setItems(xs => xs.map(x => {
          const n = no.find(y => y.id === x.id);
          return n ? { ...x, st: n.estado === "vendida" ? "so" : "ho" } : x;
        }));
        // Si eran suyas pero ya vencieron, dejan de figurar como reservadas por esta persona.
        if (prev) setReserved(p => (p ? { ...p, ids: p.ids.filter(id => !no.some(y => y.id === id)) } : p));
        return { ok: false, ids: no.map(y => y.id) };
      }
    } catch { /* abajo */ }
    return { ok: false, ids: [], error: true };
  }, [cart, items, sync]);
  const finishOrder = useCallback(() => { setCart([]); setReserved(null); }, []);

  return (
    <StoreCtx.Provider value={{
      items, setEstado, openId, open: setOpenId, close: () => setOpenId(null), toast, toastMsg,
      cart, inCart, addToCart, removeFromCart, cartOpen,
      openCart: () => { setOpenId(null); setCartOpen(true); }, closeCart: () => setCartOpen(false),
      reserved, reserveCart, finishOrder, sync,
    }}>
      {children}
    </StoreCtx.Provider>
  );
}

export function useStore() {
  const c = useContext(StoreCtx);
  if (!c) throw new Error("useStore fuera de StoreProvider");
  return c;
}
