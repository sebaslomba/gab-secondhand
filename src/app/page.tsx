"use client";
import Link from "next/link";
import { Rack } from "@/components/Rack";
import { useStore } from "@/components/Store";
import { RESERVA_MIN } from "@/lib/data";

export default function Home() {
  const { items } = useStore();
  const disponibles = items.filter(i => i.st === "av").length;
  return (
    <main className="view view-in">
      <section className="wrap hero">
        <h1>La mejor calidad, con envíos <span className="brush">seguros.</span></h1>
      </section>
      <Rack />
      <div className="wrap home-cta">
        <Link href="/tienda" className="big-cta">
          Ver toda la tienda
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
        </Link>
        <span id="avail-line">{disponibles} prendas disponibles hoy</span>
      </div>
      <section className="how" id="como">
        <div className="wrap">
          <h2>Cómo comprar</h2>
          <ol className="steps">
            <li className="glass"><h3>Armá tu carrito</h3><p>Sumá las prendas que quieras y tocá “Enviar”. Te abrimos WhatsApp con la lista y quedan apartadas a tu nombre {RESERVA_MIN} minutos para pagarlas.</p></li>
            <li className="glass"><h3>Transferí al alias</h3><p>Copiá el alias y transferí el monto exacto desde tu banco o billetera.</p></li>
            <li className="glass"><h3>Mandá el comprobante</h3><p>Te abrimos WhatsApp con el mensaje listo. Confirmamos el pago y dejamos la prenda lista para tu delivery.</p></li>
          </ol>
        </div>
      </section>
    </main>
  );
}
