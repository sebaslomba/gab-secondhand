"use client";
import { usePathname } from "next/navigation";
import { WhatsAppIcon } from "./Icons";
import { waLink } from "@/lib/data";

/** Botón flotante fijo abajo a la derecha: abre el mismo chat que "Escribinos" del header. No se muestra en el panel. */
export function WhatsAppFab() {
  const path = usePathname();
  if (path.startsWith("/admin")) return null;
  return (
    <a className="wa-fab" href={waLink("Hola Gab!")} target="_blank" rel="noopener" aria-label="Escribinos por WhatsApp">
      <WhatsAppIcon />
    </a>
  );
}
