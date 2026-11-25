"use client";
import { createContext, useCallback, useContext, useRef, useState } from "react";
import { PRENDAS, type Estado, type Prenda } from "@/lib/data";

type Ctx = {
  items: Prenda[];
  setEstado: (id: string, st: Estado) => void;
  openId: string | null;
  open: (id: string) => void;
  close: () => void;
  toast: (msg: string, dot?: string) => void;
  toastMsg: { msg: string; dot: string } | null;
};
const StoreCtx = createContext<Ctx | null>(null);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<Prenda[]>(PRENDAS);
  const [openId, setOpenId] = useState<string | null>(null);
  const [toastMsg, setToast] = useState<Ctx["toastMsg"]>(null);
  const t = useRef<ReturnType<typeof setTimeout> | null>(null);

  const setEstado = useCallback((id: string, st: Estado) => {
    setItems(xs => xs.map(x => (x.id === id ? { ...x, st } : x)));
  }, []);
  const toast = useCallback((msg: string, dot = "") => {
    setToast({ msg, dot });
    if (t.current) clearTimeout(t.current);
    t.current = setTimeout(() => setToast(null), 3200);
  }, []);

  return (
    <StoreCtx.Provider value={{ items, setEstado, openId, open: setOpenId, close: () => setOpenId(null), toast, toastMsg }}>
      {children}
    </StoreCtx.Provider>
  );
}

export function useStore() {
  const c = useContext(StoreCtx);
  if (!c) throw new Error("useStore fuera de StoreProvider");
  return c;
}
