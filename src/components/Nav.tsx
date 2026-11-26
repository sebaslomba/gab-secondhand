"use client";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { BagIcon, CartIcon, WhatsAppIcon } from "./Icons";
import { useStore } from "./Store";
import { waLink } from "@/lib/data";

export function Nav() {
  const path = usePathname();
  const admin = path.startsWith("/admin");
  const { cart, openCart } = useStore();
  const n = cart.length;
  // El contador "salta" cada vez que se suma una prenda.
  const [bump, setBump] = useState(0);
  const prev = useRef(n);
  useEffect(() => { if (n > prev.current) setBump(b => b + 1); prev.current = n; }, [n]);
  return (
    <header className="nav">
      <div className="wrap">
        <Link href="/" aria-label="Gab Secondhand, inicio">
          <Image className="logo" src="/logo.png" alt="Gab Secondhand" width={700} height={149} priority />
        </Link>
        <nav className="nav-links" aria-label="Principal">
          {admin ? (
            <Link href="/">Salir del panel</Link>
          ) : (
            <Link href="/tienda" className="shop-btn" aria-current={path === "/tienda" ? "page" : undefined}>
              <BagIcon />Tienda
            </Link>
          )}
        </nav>
        {!admin && (
          <button type="button" className="cart-btn" onClick={openCart}
            aria-label={n ? `Carrito, ${n} ${n === 1 ? "prenda" : "prendas"}` : "Carrito vacío"}>
            <CartIcon />
            {n > 0 && <span className="badge" key={bump}>{n}</span>}
          </button>
        )}
        {!admin && (
          <a className="wa" href={waLink("Hola Gab!")} target="_blank" rel="noopener">
            <WhatsAppIcon /><span>Escribinos</span>
          </a>
        )}
      </div>
    </header>
  );
}
