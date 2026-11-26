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
    resumen: "Por transferencia, dentro de los 10 minutos. El pedido se cierra recién con el pago.",
    detalle: [
      "Pagás por transferencia o con el QR que Gab te manda desde la app del banco. No usamos pasarelas de pago.",
      "Cuando Gab te pasa los datos de pago, tenés 10 minutos para pagar. Si no, el pedido se cancela y las prendas vuelven a la tienda.",
      "La prenda es tuya recién cuando el pago se acredita y Gab lo confirma.",
      "Mandanos el comprobante por el mismo chat de WhatsApp.",
      "No emitimos factura.",
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
      "Si ya pagaste y todavía no podés recibir el envío, guardamos tus prendas hasta 3 semanas.",
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
