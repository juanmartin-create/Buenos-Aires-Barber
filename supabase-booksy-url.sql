-- ============================================================
-- Agrega columna booksy_url a la tabla barberos: link de Booksy
-- filtrado a ese barbero. Se usa como CTA "Reservar" del pop-up
-- que aparece al tocar la tarjeta en la sección Equipo.
-- Correr UNA VEZ en Supabase: Dashboard -> SQL Editor -> Run.
-- ============================================================

alter table barberos add column if not exists booksy_url text;

-- Carga inicial de links por barbero (matchea por nombre).
-- Si algún nombre no existe en la tabla, ese UPDATE no afecta filas
-- y se puede cargar después desde /admin.
update barberos set booksy_url = 'https://booksy.com/en-ar/799_buenos-aires-barber-shop_barberia_82385_la-lucila/staffer/9103'          where nombre = 'Diego';
update barberos set booksy_url = 'https://booksy.com/es-ar/799_buenos-aires-barber-shop_barberia_82385_la-lucila/staffer/13005#ba_s=dl_1' where nombre = 'Brian';
update barberos set booksy_url = 'https://booksy.com/en-ar/799_buenos-aires-barber-shop_barberia_82385_la-lucila/staffer/9108'          where nombre = 'Nahuel';
update barberos set booksy_url = 'https://booksy.com/en-ar/799_buenos-aires-barber-shop_barberia_82385_la-lucila/staffer/9330'          where nombre = 'Luis';
update barberos set booksy_url = 'https://booksy.com/es-ar/799_buenos-aires-barber-shop_barberia_82385_la-lucila/staffer/12834#ba_s=dl_1' where nombre = 'Iván';
update barberos set booksy_url = 'https://booksy.com/es-ar/799_buenos-aires-barber-shop_barberia_82385_la-lucila/staffer/14273#ba_s=sh_1' where nombre = 'Juan';
update barberos set booksy_url = 'https://booksy.com/es-ar/799_buenos-aires-barber-shop_barberia_82385_la-lucila/staffer/13007#ba_s=dl_1' where nombre = 'Lucas';
