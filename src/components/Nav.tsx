"use client";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { BagIcon, WhatsAppIcon } from "./Icons";
import { waLink } from "@/lib/data";

export function Nav() {
  const path = usePathname();
  const admin = path.startsWith("/admin");
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
            <>
              <Link href="/#como" className="hide-xs">Cómo comprar</Link>
              <Link href="/tienda" className="shop-btn" aria-current={path === "/tienda" ? "page" : undefined}>
                <BagIcon />Tienda
              </Link>
            </>
          )}
        </nav>
        {!admin && (
          <a className="wa" href={waLink("Hola Gab!")} target="_blank" rel="noopener">
            <WhatsAppIcon /><span>Escribinos</span>
          </a>
        )}
      </div>
    </header>
  );
}
