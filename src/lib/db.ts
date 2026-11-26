// Acceso a Supabase solo desde el servidor (rutas /api). La clave privada nunca llega al navegador.
// Acepta los nombres de variables que carga la integración de Supabase en Vercel.
const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY;

export const dbLista = !!(url && key);

export function db(path: string, init: RequestInit = {}) {
  const headers: Record<string, string> = { apikey: key!, "Content-Type": "application/json" };
  // Las claves viejas son JWT y van también como Bearer; las nuevas (sb_secret_) solo en apikey.
  if (key!.startsWith("eyJ")) headers.Authorization = `Bearer ${key}`;
  return fetch(`${url}/rest/v1/${path}`, { ...init, headers: { ...headers, ...(init.headers as Record<string, string>) }, cache: "no-store" });
}

export type EstadoDb = "disponible" | "reservada" | "vendida";
