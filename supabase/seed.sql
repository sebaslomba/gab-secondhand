-- Prendas de ejemplo (las mismas de src/lib/data.ts). Borrar cuando Gab cargue las reales.
insert into prendas (id, titulo, marca, talle, precio, categoria, dibujo, color, fondo, estado, condicion, costo) values
  ('GS-101', 'Campera de jean oversize', 'Levi''s', 'M', 120000, 'Abrigos', 'jacket', '#6C8DB5', '#DDE6EF', 'disponible', 'Muy buen estado', 45000),
  ('GS-102', 'Vestido midi de lino', 'Zara', 'S', 95000, 'Vestidos', 'dress', '#E8DCC4', '#F3E9E3', 'disponible', 'Como nuevo', 30000),
  ('GS-103', 'Jean mom tiro alto', 'Mango', '38', 85000, 'Pantalones', 'jeans', '#4F6E95', '#E1E7EE', 'disponible', 'Muy buen estado', 28000),
  ('GS-104', 'Remera vintage estampada', 'Nike', 'L', 60000, 'Remeras', 'tee', '#F5F0E6', '#EAD9CF', 'disponible', 'Buen estado', 15000),
  ('GS-105', 'Pollera plisada satinada', 'H&M', 'M', 70000, 'Polleras', 'skirt', '#C9A27E', '#F4E4D6', 'disponible', 'Como nuevo', 22000),
  ('GS-106', 'Sweater tejido trenzado', 'Sin marca', 'M', 110000, 'Abrigos', 'sweater', '#EADFCB', '#E6DDD0', 'disponible', 'Muy buen estado', 35000),
  ('GS-107', 'Blazer marrón entallado', 'Mango', 'L', 150000, 'Abrigos', 'jacket', '#7A4E36', '#EADBCF', 'disponible', 'Muy buen estado', 50000),
  ('GS-108', 'Vestido corto floral', 'Shein', 'XS', 75000, 'Vestidos', 'dress', '#F4C9D6', '#F7E3E9', 'vendida', 'Buen estado', 20000),
  ('GS-109', 'Remera básica rosa', 'Uniqlo', 'S', 45000, 'Remeras', 'tee', '#F4C9D6', '#F1E4DC', 'disponible', 'Como nuevo', 12000),
  ('GS-110', 'Cárdigan corto de punto', 'Bershka', 'M', 90000, 'Abrigos', 'sweater', '#8E6A5B', '#EDE1D8', 'disponible', 'Buen estado', 25000),
  ('GS-111', 'Pantalón sastrero crema', 'Zara', '40', 98000, 'Pantalones', 'jeans', '#E9DFCC', '#E5DCD0', 'vendida', 'Muy buen estado', 30000),
  ('GS-113', 'Remera crop rayada', 'Bershka', 'XS', 50000, 'Remeras', 'tee', '#E9E2D6', '#EDE3E6', 'disponible', 'Como nuevo', 14000),
  ('GS-114', 'Remera oversize gris', 'Pull&Bear', 'XS', 55000, 'Remeras', 'tee', '#A9A4A0', '#E7E2DD', 'disponible', 'Muy buen estado', 15000),
  ('GS-112', 'Pollera de jean mini', 'Levi''s', 'S', 65000, 'Polleras', 'skirt', '#5D7FA8', '#DFE6EE', 'disponible', 'Buen estado', 18000)
on conflict (id) do nothing;
