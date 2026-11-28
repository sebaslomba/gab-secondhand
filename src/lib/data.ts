export type Estado = "av" | "ho" | "so";
export type Prenda = {
  id: string; t: string; b: string; s: string; p: number; c: string;
  g: "tee" | "dress" | "jeans" | "jacket" | "skirt" | "sweater";
  col: string; bg: string; st: Estado; cond: string; cost: number; fotos?: string[];
  // Precio antes de la oferta: si es mayor que p, la prenda está en oferta.
  pa?: number;
};

export const WHATSAPP = "595972217237";
export const WHATSAPP_LABEL = "+595 972 217 237";
export const INSTAGRAM = "https://www.instagram.com/gab_secondhand";
export const TIKTOK = "https://www.tiktok.com/@gabsecondhand";
// Minutos que dura una reserva hecha por la web (Sebas pidió entre 10 y 20).
export const RESERVA_MIN = 15;
export const ALIAS = { alias: "gab.secondhand", titular: "A definir", banco: "A definir" };

export const CATEGORIAS = ["Todo", "Remeras", "Vestidos", "Pantalones", "Polleras", "Abrigos", "Shorts", "Calzado", "Accesorios"];
export const TALLES = ["XS", "S", "M", "L", "38", "40"];
export const ESTADO_LABEL: Record<Estado, [string, string]> = {
  av: ["Disponible", ""], ho: ["Reservada", "hold"], so: ["Vendida", "sold"],
};

// Datos de ejemplo hasta conectar la base de datos (etapa 1).
export const PRENDAS: Prenda[] = [
  { id: "GS-101", t: "Campera de jean oversize", b: "Levi's", s: "M", p: 120000, c: "Abrigos", g: "jacket", col: "#6C8DB5", bg: "#DDE6EF", st: "av", cond: "Muy buen estado", cost: 45000 },
  { id: "GS-102", t: "Vestido midi de lino", b: "Zara", s: "S", p: 95000, c: "Vestidos", g: "dress", col: "#E8DCC4", bg: "#F3E9E3", st: "av", cond: "Como nuevo", cost: 30000 },
  { id: "GS-103", t: "Jean mom tiro alto", b: "Mango", s: "38", p: 85000, c: "Pantalones", g: "jeans", col: "#4F6E95", bg: "#E1E7EE", st: "av", cond: "Muy buen estado", cost: 28000 },
  { id: "GS-104", t: "Remera vintage estampada", b: "Nike", s: "L", p: 60000, c: "Remeras", g: "tee", col: "#F5F0E6", bg: "#EAD9CF", st: "av", cond: "Buen estado", cost: 15000, pa: 80000 },
  { id: "GS-105", t: "Pollera plisada satinada", b: "H&M", s: "M", p: 70000, c: "Polleras", g: "skirt", col: "#C9A27E", bg: "#F4E4D6", st: "av", cond: "Como nuevo", cost: 22000 },
  { id: "GS-106", t: "Sweater tejido trenzado", b: "Sin marca", s: "M", p: 110000, c: "Abrigos", g: "sweater", col: "#EADFCB", bg: "#E6DDD0", st: "av", cond: "Muy buen estado", cost: 35000 },
  { id: "GS-107", t: "Blazer marrón entallado", b: "Mango", s: "L", p: 150000, c: "Abrigos", g: "jacket", col: "#7A4E36", bg: "#EADBCF", st: "ho", cond: "Muy buen estado", cost: 50000 },
  { id: "GS-108", t: "Vestido corto floral", b: "Shein", s: "XS", p: 75000, c: "Vestidos", g: "dress", col: "#F4C9D6", bg: "#F7E3E9", st: "so", cond: "Buen estado", cost: 20000 },
  { id: "GS-109", t: "Remera básica rosa", b: "Uniqlo", s: "S", p: 45000, c: "Remeras", g: "tee", col: "#F4C9D6", bg: "#F1E4DC", st: "av", cond: "Como nuevo", cost: 12000 },
  { id: "GS-110", t: "Cárdigan corto de punto", b: "Bershka", s: "M", p: 90000, c: "Abrigos", g: "sweater", col: "#8E6A5B", bg: "#EDE1D8", st: "av", cond: "Buen estado", cost: 25000 },
  { id: "GS-111", t: "Pantalón sastrero crema", b: "Zara", s: "40", p: 98000, c: "Pantalones", g: "jeans", col: "#E9DFCC", bg: "#E5DCD0", st: "so", cond: "Muy buen estado", cost: 30000 },
  { id: "GS-113", t: "Remera crop rayada", b: "Bershka", s: "XS", p: 50000, c: "Remeras", g: "tee", col: "#E9E2D6", bg: "#EDE3E6", st: "av", cond: "Como nuevo", cost: 14000 },
  { id: "GS-114", t: "Remera oversize gris", b: "Pull&Bear", s: "XS", p: 55000, c: "Remeras", g: "tee", col: "#A9A4A0", bg: "#E7E2DD", st: "av", cond: "Muy buen estado", cost: 15000 },
  { id: "GS-112", t: "Pollera de jean mini", b: "Levi's", s: "S", p: 65000, c: "Polleras", g: "skirt", col: "#5D7FA8", bg: "#DFE6EE", st: "av", cond: "Buen estado", cost: 18000 },
];

export const GASTOS = [
  { d: "22 nov", t: "Compra de lote en feria", cat: "Stock", m: 180000 },
  { d: "18 nov", t: "Bolsas y etiquetas", cat: "Insumos", m: 42000 },
  { d: "12 nov", t: "Publicidad en Instagram", cat: "Publicidad", m: 60000 },
  { d: "05 nov", t: "Envíos del mes", cat: "Envíos", m: 35000 },
];

export const gs = (n: number) => n.toLocaleString("es-PY").replace(/,/g, ".");
export const waLink = (text: string) => `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(text)}`;

// Delivery en moto con salida desde Asunción (tabla de Gab, nov 2026). Al interior va por Multienvíos y se cotiza aparte.
export const ENVIO_INTERIOR = "Interior (Multienvíos)";
export const ZONAS_ENVIO: { z: string; m: number }[] = [
  { z: "Asunción", m: 20000 }, { z: "Asunción, Zeballos Cué", m: 25000 }, { z: "Asunción, Loma Pytã", m: 25000 },
  { z: "Areguá", m: 30000 }, { z: "Capiatá, ruta 1", m: 30000 }, { z: "Capiatá, ruta 2", m: 30000 },
  { z: "Fernando de la Mora", m: 20000 }, { z: "Guarambaré", m: 45000 }, { z: "Ypané", m: 35000 }, { z: "Itá", m: 50000 },
  { z: "Itauguá", m: 35000 }, { z: "J. Augusto Saldívar", m: 35000 }, { z: "Lambaré", m: 20000 }, { z: "Limpio", m: 35000 },
  { z: "Luque", m: 30000 }, { z: "Mariano R. Alonso", m: 30000 }, { z: "Ñemby", m: 30000 }, { z: "San Antonio", m: 30000 },
  { z: "San Bernardino", m: 70000 }, { z: "San Lorenzo", m: 25000 }, { z: "Villa Elisa", m: 30000 }, { z: "Villa Hayes", m: 60000 },
  { z: "Villeta", m: 50000 }, { z: "Caacupé", m: 85000 },
];

// Fila de la vista "catalogo" de la base (ver supabase/schema.sql).
export type FilaCatalogo = {
  id: string; titulo: string; marca: string; talle: string; precio: number; categoria: string;
  condicion: string; dibujo: string; color: string; fondo: string; estado: "disponible" | "reservada" | "vendida"; fotos?: string[] | null;
  precio_antes?: number | null;
};
export const DIBUJO_POR_CATEGORIA: Record<string, Prenda["g"]> = {
  Remeras: "tee", Vestidos: "dress", Pantalones: "jeans", Polleras: "skirt", Abrigos: "jacket", Shorts: "skirt",
};
export const ESTADO_DE_DB: Record<FilaCatalogo["estado"], Estado> = { disponible: "av", reservada: "ho", vendida: "so" };
export const ESTADO_A_DB: Record<Estado, FilaCatalogo["estado"]> = { av: "disponible", ho: "reservada", so: "vendida" };
export const CONDICIONES = ["Como nuevo", "Muy buen estado", "Buen estado"];
export const deFila = (f: FilaCatalogo): Prenda => ({
  id: f.id, t: f.titulo, b: f.marca, s: f.talle, p: f.precio, c: f.categoria,
  g: (["tee", "dress", "jeans", "jacket", "skirt", "sweater"].includes(f.dibujo) ? f.dibujo : DIBUJO_POR_CATEGORIA[f.categoria] ?? "tee") as Prenda["g"],
  col: f.color, bg: f.fondo, st: ESTADO_DE_DB[f.estado], cond: f.condicion, cost: 0, fotos: f.fotos ?? [], pa: f.precio_antes ?? undefined,
});

export const enOferta = (it: Prenda) => !!it.pa && it.pa > it.p;
