# Gab Secondhand

Tienda online de ropa de segunda mano. Cada prenda es única y tiene un estado: disponible, reservada o vendida.

- `/` Inicio: titular, perchero con destacadas y cómo comprar.
- `/tienda` Catálogo con filtros por categoría y talle.
- `/admin` Panel de la tienda (no aparece en el menú).

## Desarrollo

```bash
npm install
npm run dev
```

Por ahora los datos son de ejemplo (`src/lib/data.ts`). La próxima etapa conecta Supabase para prendas, reservas, ventas y gastos.
