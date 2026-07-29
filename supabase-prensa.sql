-- ============================================================
-- Tabla de prensa (notas en medios) editable desde el panel admin.
-- Correr UNA VEZ en Supabase: Dashboard -> SQL Editor -> New query -> Run
-- ============================================================

create table if not exists prensa (
  id bigint generated always as identity primary key,
  titulo text,                 -- nombre del medio (referencia en el panel y alt de la imagen)
  imagen_url text not null,
  link text,                   -- URL de la nota (opcional)
  orden int not null default 0,
  activo boolean not null default true,
  updated_at timestamptz default now()
);

alter table prensa enable row level security;

-- La web puede leer las notas sin login
create policy "prensa lectura publica" on prensa
  for select using (true);

-- Usuarios logueados en el panel pueden escribir…
create policy "prensa escritura admin" on prensa
  for all to authenticated using (true) with check (true);

-- …pero solo el dueño (política restrictiva, igual que el resto de tablas)
create policy "pr solo dueno ins" on prensa as restrictive
  for insert to authenticated
  with check (auth.jwt()->>'email' in ('diegoizzo@icloud.com','juanmartin@simplex.la'));
create policy "pr solo dueno upd" on prensa as restrictive
  for update to authenticated
  using (auth.jwt()->>'email' in ('diegoizzo@icloud.com','juanmartin@simplex.la'));
create policy "pr solo dueno del" on prensa as restrictive
  for delete to authenticated
  using (auth.jwt()->>'email' in ('diegoizzo@icloud.com','juanmartin@simplex.la'));

-- Notas actuales (las imágenes ya están en el repo del sitio)
insert into prensa (titulo, imagen_url, link, orden) values
  ('La Nación',        '/assets/img/prensa/prensa-1.jpg', 'https://www.lanacion.com.ar/lifestyle/el-universo-detras-de-las-barbas-y-los-barbudos-nid2140846', 1),
  ('La Nación',        '/assets/img/prensa/prensa-2.jpg', 'https://www.lanacion.com.ar/lifestyle/el-universo-detras-de-las-barbas-y-los-barbudos-nid2140846', 2),
  ('El Intransigente', '/assets/img/prensa/prensa-3.jpg', 'https://elintransigente.com/espectaculo/2019/08/03/the-barber-job-salon-berlin-bacan-y-otras-barberias-exclusivas-para-un-cambio-de-look/', 3),
  ('Clarín',           '/assets/img/prensa/prensa-4.jpg', 'https://www.clarin.com/zonales/barberia-olivos-supero-concurso-mejores-mundo_0_mLfYw-83b.html', 4),
  ('Artero Entrevista','/assets/img/prensa/prensa-5.jpg', 'https://arteropeluqueriablog.com/diego-izzo/', 5);
