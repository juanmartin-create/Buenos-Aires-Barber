-- ============================================================
-- Gift cards: WhatsApp del comprador + permiso para borrar desde el panel.
-- Correr UNA vez en Supabase > SQL Editor.
-- ============================================================

-- 1) WhatsApp que deja el comprador en el checkout (opcional)
alter table gift_cards add column if not exists buyer_phone text;

-- 2) Los dueños pueden eliminar gift cards desde el panel
--    (faltaba la política de borrado: Supabase no borraba nada y no daba error)
drop policy if exists "gc dueno puede borrar" on gift_cards;
create policy "gc dueno puede borrar" on gift_cards
  for delete to authenticated
  using (auth.jwt()->>'email' in ('diegoizzo@icloud.com','juanmartin@simplex.la'));
