"use client";
import { usePathname } from "next/navigation";
import { InstagramIcon, TikTokIcon, WhatsAppIcon } from "./Icons";
import { INSTAGRAM, TIKTOK, WHATSAPP_LABEL, waLink } from "@/lib/data";

export function Footer() {
  if (usePathname().startsWith("/admin")) return null;
  return (
    <footer className="contact" id="contacto">
      <div className="wrap">
        <div>
          <h2>¿Dudas con un talle o una medida?</h2>
          <p>Escribinos y te mandamos fotos extra o medidas exactas de la prenda.</p>
        </div>
        <ul className="socials" aria-label="Redes de Gab Secondhand">
          <li><a href={waLink("Hola Gab!")} target="_blank" rel="noopener" aria-label="WhatsApp"><WhatsAppIcon /><span>{WHATSAPP_LABEL}</span></a></li>
          <li><a href={INSTAGRAM} target="_blank" rel="noopener" aria-label="Instagram"><InstagramIcon /><span>@gab_secondhand</span></a></li>
          <li><a href={TIKTOK} target="_blank" rel="noopener" aria-label="TikTok"><TikTokIcon /><span>@gabsecondhand</span></a></li>
        </ul>
      </div>
    </footer>
  );
}
