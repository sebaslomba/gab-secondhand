"use client";
import { usePathname } from "next/navigation";
import { InstagramIcon, TikTokIcon } from "./Icons";
import { INSTAGRAM, TIKTOK, waLink } from "@/lib/data";

export function Footer() {
  if (usePathname().startsWith("/admin")) return null;
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
    </footer>
  );
}
