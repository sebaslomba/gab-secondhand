"use client";
import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { PRENDAS, RESERVA_MIN, type Estado, type Prenda } from "@/lib/data";

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
  reserved: { at: number; ids: string[] } | null;
  reserveCart: () => void;
  finishOrder: () => void;
};
const StoreCtx = createContext<Ctx | null>(null);
const KEY = "gab-carrito";
const RESERVA_MS = RESERVA_MIN * 60 * 1000;

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<Prenda[]>(PRENDAS);
  const [openId, setOpenId] = useState<string | null>(null);
  const [toastMsg, setToast] = useState<Ctx["toastMsg"]>(null);
  const [cart, setCart] = useState<string[]>([]);
  const [reserved, setReserved] = useState<Ctx["reserved"]>(null);
  const [cartOpen, setCartOpen] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const t = useRef<ReturnType<typeof setTimeout> | null>(null);

  const setEstado = useCallback((id: string, st: Estado) => {
    setItems(xs => xs.map(x => (x.id === id ? { ...x, st } : x)));
  }, []);
  const toast = useCallback((msg: string, dot = "") => {
    setToast({ msg, dot });
    if (t.current) clearTimeout(t.current);
    t.current = setTimeout(() => setToast(null), 3200);
  }, []);

  // El carrito se recuerda en este navegador; si había una reserva vigente, se vuelve a marcar.
  useEffect(() => {
    const restore = () => { try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const saved = JSON.parse(raw) as { cart?: string[]; reserved?: Ctx["reserved"] };
        const ids = (saved.cart ?? []).filter(id => PRENDAS.some(p => p.id === id && p.st !== "so"));
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
      toast("Tu reserva venció. Las prendas siguen en tu carrito si todavía las querés.", "hold");
    }, Math.max(0, reserved.at + RESERVA_MS - Date.now()));
    return () => clearTimeout(h);
  }, [reserved, toast]);

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
  const reserveCart = useCallback(() => {
    const mine = reserved?.ids ?? [];
    const ids = cart.filter(id => mine.includes(id) || items.find(x => x.id === id)?.st === "av");
    setItems(xs => xs.map(x => (ids.includes(x.id) ? { ...x, st: "ho" } : x)));
    setReserved({ at: Date.now(), ids });
  }, [cart, items, reserved]);
  const finishOrder = useCallback(() => { setCart([]); setReserved(null); }, []);

  return (
    <StoreCtx.Provider value={{
      items, setEstado, openId, open: setOpenId, close: () => setOpenId(null), toast, toastMsg,
      cart, inCart, addToCart, removeFromCart, cartOpen,
      openCart: () => { setOpenId(null); setCartOpen(true); }, closeCart: () => setCartOpen(false),
      reserved, reserveCart, finishOrder,
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
