-- ============================================================
-- Una sola gift card por pago de Mercado Pago.
-- MP manda 2 avisos por pago (Webhook + IPN) y el webhook creaba 2 gift cards.
-- Correr UNA vez en Supabase > SQL Editor.
-- No toca las gift cards existentes (aunque haya duplicadas viejas):
-- el candado aplica solo a las creadas desde el momento en que se corre.
-- ============================================================
do $$
begin
  execute format(
    'create unique index if not exists gift_cards_mp_payment_id_uniq
       on gift_cards (mp_payment_id)
       where mp_payment_id is not null and created_at > %L::timestamptz',
    now()
  );
end $$;
