# Base de datos (Supabase)

1. Crear el proyecto desde Vercel → Storage → Supabase (región São Paulo) y conectarlo a `gab-secondhand`. Vercel carga solo las variables (`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, etc.).
2. En Supabase → SQL Editor, correr `schema.sql` y después `seed.sql` (prendas de ejemplo).
3. Redeploy en Vercel. Desde ahí la web lee los estados de la base y reserva por el servidor.

Sin esas variables, la web sigue funcionando como antes (estados guardados en cada navegador).

## Cómo funciona la reserva

- `prendas.estado`: `disponible`, `reservada` o `vendida`. Una reserva vencida (`reservada_hasta` pasada) cuenta como disponible.
- `reservar_prendas(ids, zona, envio, minutos, anterior)` bloquea las filas y reserva **todas o ninguna**. Si alguna ya no está libre, devuelve cuáles.
- El navegador nunca escribe en la base: llama a `/api/reservar`, que usa la clave privada en el servidor.
- `confirmar_pedido` / `cancelar_pedido` son para el backoffice (requieren usuario en la tabla `admins`).
