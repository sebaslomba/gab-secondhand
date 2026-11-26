"use client";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Cliente del navegador, solo para el panel de Gab. Usa la clave pública: lo que puede hacer
// lo limitan las reglas de la base (solo una cuenta en la tabla "admins" puede editar).
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

let client: SupabaseClient | null = null;
export function supabase() {
  if (!url || !key) return null;
  client ??= createClient(url, key, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } });
  return client;
}
