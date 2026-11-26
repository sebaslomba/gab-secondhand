import { RESERVA_MIN } from "./data";

// Reglas de cómo trabaja Gab Secondhand. El footer muestra el resumen y /politicas el texto completo.
export const POLITICAS: { id: string; t: string; resumen: string; detalle: string[] }[] = [
  {
    id: "pedidos",
    t: "Pedidos",
    resumen: "Se hacen por WhatsApp desde el carrito y Gab los confirma.",
    detalle: [
      "Armás tu carrito en la web y lo enviás por WhatsApp. Ese mensaje es un pedido, todavía no es una compra.",
      `Al enviarlo, las prendas quedan apartadas para vos ${RESERVA_MIN} minutos.`,
      "Gab revisa el pedido, te confirma las prendas y te pasa los datos de pago.",
    ],
  },
  {
    id: "pagos",
    t: "Pagos",
    resumen: "Por transferencia bancaria. El pedido se cierra recién con el pago.",
    detalle: [
      "Pagás por transferencia o con el QR que Gab te manda desde la app del banco. No usamos pasarelas de pago.",
      "La prenda es tuya recién cuando el pago se acredita y Gab lo confirma. Hasta entonces puede volver a la tienda.",
      "Mandanos el comprobante por el mismo chat de WhatsApp.",
    ],
  },
  {
    id: "envios",
    t: "Envíos",
    resumen: "Envío propio en Gran Asunción, siempre después del pago.",
    detalle: [
      "El envío sale recién después de confirmado el pago.",
      "En Asunción y Gran Asunción el envío es propio. No usamos apps de delivery ni mensajería de terceros. El costo depende de tu zona y lo ves en el carrito.",
      "Al interior enviamos por Multienvíos. Ese costo se cotiza aparte y Gab te lo pasa por WhatsApp.",
      "No hay retiro en persona.",
    ],
  },
  {
    id: "devoluciones",
    t: "Devoluciones",
    resumen: "No hay cambios ni devoluciones. Preguntá todo antes de pagar.",
    detalle: [
      "Cada prenda es única y de segunda mano, por eso no aceptamos cambios ni devoluciones.",
      "Antes de pagar podés pedir más fotos, medidas o detalles del estado de la prenda. Te respondemos todo por WhatsApp.",
    ],
  },
];
