-- ============================================================
-- Una sola gift card por pago de Mercado Pago.
-- MP manda 2 avisos por pago (Webhook + IPN) y el webhook creaba 2 gift cards.
-- Correr en Supabase > SQL Editor, PASO POR PASO.
-- ============================================================

-- PASO 1 · Ver los duplicados que ya existen (no modifica nada)
select mp_payment_id, code, status, recipient_email, buyer_email, created_at, redeemed_at
from gift_cards
where mp_payment_id in (
  select mp_payment_id from gift_cards
  where mp_payment_id is not null
  group by mp_payment_id having count(*) > 1
)
order by mp_payment_id, created_at;

-- PASO 2 · Borrar los duplicados que sobran.
-- Por cada pago se queda con UNA: la canjeada si alguna se usó; si no, la primera creada.
-- Solo borra copias todavía 'active' (nunca una canjeada).
delete from gift_cards g
using (
  select id, row_number() over (
    partition by mp_payment_id
    order by (status = 'redeemed') desc, created_at asc
  ) as rn
  from gift_cards
  where mp_payment_id is not null
) d
where g.id = d.id and d.rn > 1 and g.status = 'active';

-- PASO 3 · Candado: la base rechaza una segunda gift card con el mismo pago
create unique index if not exists gift_cards_mp_payment_id_uniq
  on gift_cards (mp_payment_id);
