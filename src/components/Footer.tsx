"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { InstagramIcon, TikTokIcon } from "./Icons";
import { INSTAGRAM, TIKTOK, waLink } from "@/lib/data";
import { POLITICAS } from "@/lib/politicas";

export function Footer() {
  const path = usePathname();
  if (path.startsWith("/admin")) return null;
  return (
    <footer className="contact" id="contacto">
      <div className="wrap">
        <div>
          <h2>¿Tenés dudas? <a href={waLink("Hola Gab!")} target="_blank" rel="noopener">Escribinos</a></h2>
        </div>
        <ul className="socials" aria-label="Redes de Gab Secondhand">
          <li><a href={INSTAGRAM} target="_blank" rel="noopener" aria-label="Instagram"><InstagramIcon /><span>@gab_secondhand</span></a></li>
          <li><a href={TIKTOK} target="_blank" rel="noopener" aria-label="TikTok"><TikTokIcon /><span>@gabsecondhand</span></a></li>
        </ul>
      </div>
      {path !== "/politicas" && <div className="wrap policies" aria-labelledby="pol-t">
        <h3 id="pol-t">Cómo trabajamos</h3>
        <ul>
          {POLITICAS.map(p => (
            <li key={p.id}><Link href={`/politicas#${p.id}`}><b>{p.t}</b><span>{p.resumen}</span></Link></li>
          ))}
        </ul>
        <Link href="/politicas" className="policies-more">Ver todas las políticas</Link>
      </div>}
    </footer>
  );
}
