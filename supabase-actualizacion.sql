-- ============================================================
-- Actualización: vencimiento de gift cards, banner editable y roles.
-- Correr UNA VEZ en Supabase: Dashboard -> SQL Editor -> New query -> Run
-- ============================================================

-- 1) Fecha de vencimiento de las gift cards
alter table gift_cards add column if not exists expires_at timestamptz;

-- 2) Texto del banner en movimiento, editable desde el panel
insert into site_content (key, value, tipo) values
  ('marquee_texto', 'Corte clásico | Barba | Afeitado a navaja | Mar a Vie 11:00–20:30 | Sáb 10:00–20:30 | Lun y Dom cerrado | WhatsApp +54 9 11 3485-2904 | Desde 2015', 'texto')
on conflict (key) do nothing;

-- 3) Roles: solo el DUEÑO puede modificar contenido, servicios y equipo.
--    El recepcionista (cualquier otro usuario logueado) solo puede operar
--    gift cards (crear cortesías y validar/canjear códigos).
--    Estas políticas son RESTRICTIVAS: se suman a las existentes.

create policy "sc solo dueno ins" on site_content as restrictive
  for insert to authenticated
  with check (auth.jwt()->>'email' in ('diegoizzo@icloud.com','juanmartin@simplex.la'));
create policy "sc solo dueno upd" on site_content as restrictive
  for update to authenticated
  using (auth.jwt()->>'email' in ('diegoizzo@icloud.com','juanmartin@simplex.la'));
create policy "sc solo dueno del" on site_content as restrictive
  for delete to authenticated
  using (auth.jwt()->>'email' in ('diegoizzo@icloud.com','juanmartin@simplex.la'));

create policy "sv solo dueno ins" on servicios as restrictive
  for insert to authenticated
  with check (auth.jwt()->>'email' in ('diegoizzo@icloud.com','juanmartin@simplex.la'));
create policy "sv solo dueno upd" on servicios as restrictive
  for update to authenticated
  using (auth.jwt()->>'email' in ('diegoizzo@icloud.com','juanmartin@simplex.la'));
create policy "sv solo dueno del" on servicios as restrictive
  for delete to authenticated
  using (auth.jwt()->>'email' in ('diegoizzo@icloud.com','juanmartin@simplex.la'));

create policy "ba solo dueno ins" on barberos as restrictive
  for insert to authenticated
  with check (auth.jwt()->>'email' in ('diegoizzo@icloud.com','juanmartin@simplex.la'));
create policy "ba solo dueno upd" on barberos as restrictive
  for update to authenticated
  using (auth.jwt()->>'email' in ('diegoizzo@icloud.com','juanmartin@simplex.la'));
create policy "ba solo dueno del" on barberos as restrictive
  for delete to authenticated
  using (auth.jwt()->>'email' in ('diegoizzo@icloud.com','juanmartin@simplex.la'));
