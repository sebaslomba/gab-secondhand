"use client";
import Link from "next/link";
import { Rack } from "@/components/Rack";
import { RESERVA_MIN } from "@/lib/data";

export default function Home() {
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
      </div>
      <section className="how" id="como">
        <div className="wrap">
          <h2>Cómo comprar</h2>
          <ol className="steps">
            <li className="glass"><h3>Armá tu carrito</h3><p>Sumá las prendas que quieras y elegí tu zona para ver el envío y el total.</p></li>
            <li className="glass"><h3>Enviá tu pedido</h3><p>Te abrimos WhatsApp con tu pedido listo para mandar. Las prendas quedan apartadas para vos {RESERVA_MIN} minutos.</p></li>
            <li className="glass"><h3>Coordinamos con Gab</h3><p>Gab te confirma las prendas, te pasa los datos de pago y sale tu delivery.</p></li>
          </ol>
        </div>
      </section>
    </main>
  );
}
