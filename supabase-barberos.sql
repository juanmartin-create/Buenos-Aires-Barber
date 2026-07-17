-- ============================================================
-- Tabla de barberos (equipo) editable desde el panel admin.
-- Correr UNA VEZ en Supabase: Dashboard -> SQL Editor -> New query -> Run
-- ============================================================

create table if not exists barberos (
  id bigint generated always as identity primary key,
  nombre text not null,
  rol text not null default 'Barbero',
  foto_url text,
  orden int not null default 0,
  activo boolean not null default true,
  updated_at timestamptz default now()
);

alter table barberos enable row level security;

-- La web puede leer el equipo sin login
create policy "barberos lectura publica" on barberos
  for select using (true);

-- Solo el dueño logueado en el panel puede crear/editar/borrar
create policy "barberos escritura admin" on barberos
  for all to authenticated using (true) with check (true);

-- Equipo actual (las fotos ya están en el repo del sitio)
insert into barberos (nombre, rol, foto_url, orden) values
  ('Luis',   'Barbero',  '/assets/img/barberos/diego3581.jpg',   1),
  ('Nahuel', 'Barbero',  '/assets/img/barberos/nahuel4008.jpg',  2),
  ('Iván',   'Barbero',  '/assets/img/barberos/ivan1720.jpg',    3),
  ('Lucas',  'Barbero',  '/assets/img/barberos/felix5786.jpg',   4),
  ('Brian',  'Barbero',  '/assets/img/barberos/maxi5536.jpg',    5),
  ('Isaías', 'Barbero',  '/assets/img/barberos/isaias_3816.jpeg',6),
  ('Diego',  'Fundador', '/assets/img/barberos/diego5365.jpeg',  7);
