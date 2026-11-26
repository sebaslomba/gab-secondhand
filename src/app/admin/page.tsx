"use client";
import { AdminDemo } from "@/components/admin/AdminDemo";
import { AdminPanel } from "@/components/admin/AdminPanel";
import { supabase } from "@/lib/supabase";

// Con Supabase conectado, el panel real; si no, la maqueta con datos de ejemplo.
export default function Admin() {
  return supabase() ? <AdminPanel /> : <AdminDemo />;
}
