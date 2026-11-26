"use client";
import { useEffect, useState } from "react";

/** Botón flotante discreto que aparece al bajar y vuelve al inicio de la tienda con scroll suave. */
export function BackToTop({ threshold = 700 }: { threshold?: number }) {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const on = () => setShow(window.scrollY > threshold);
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, [threshold]);
  const up = () => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" });
  };
  return (
    <button type="button" className="to-top" data-show={show} onClick={up} aria-label="Volver al inicio de la tienda" tabIndex={show ? 0 : -1} aria-hidden={!show}>
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 19V5M5.5 11.5 12 5l6.5 6.5" /></svg>
      <span>Arriba</span>
    </button>
  );
}
