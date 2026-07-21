-- ============================================================
-- Códigos de gift card numéricos y correlativos (00001, 00002, ...)
-- Correr UNA VEZ en Supabase: Dashboard -> SQL Editor -> New query -> Run
-- ============================================================

create sequence if not exists gift_card_num start 1;

-- security definer: permite obtener el próximo número sin dar permisos
-- directos sobre la secuencia
create or replace function next_gift_code() returns text
language sql security definer as $$
  select lpad(nextval('gift_card_num')::text, 5, '0');
$$;

-- Si quieren continuar el contador del sistema viejo (ej: la última física
-- fue la 230), descomentar y ajustar:
-- select setval('gift_card_num', 230);
