/* ============================================================
 * Netlify Function: mp-webhook
 * Recibe la notificación de Mercado Pago cuando hay un pago.
 *  1) Verifica el pago consultando la API de MP (no confía en el payload).
 *  2) Si está aprobado, pasa la gift card de 'pending' a 'active'.
 *  3) Manda el email al destinatario.
 * Idempotente: solo actúa si la gift card sigue en 'pending'.
 * ============================================================ */
const { sendGiftCardEmail, sendBuyerReceiptEmail } = require('./lib/email');

const SUPA_URL = process.env.SUPABASE_URL || 'https://nueyqdahtetoxsggqshg.supabase.co';
const SUPA_SECRET = process.env.SUPABASE_SERVICE_KEY;
const MP_TOKEN = process.env.MP_ACCESS_TOKEN;

function ok() { return { statusCode: 200, body: 'ok' }; }

async function getPaymentId(event) {
  // MP manda el id de varias formas según la versión del webhook
  var q = event.queryStringParameters || {};
  if (q['data.id']) return q['data.id'];
  if (q.id && (q.topic === 'payment' || q.type === 'payment')) return q.id;
  try {
    var b = JSON.parse(event.body || '{}');
    if (b.data && b.data.id) return b.data.id;
    if (b.type === 'payment' && b.id) return b.id;
  } catch (e) {}
  return null;
}

exports.handler = async function (event) {
  // Siempre responder 200 rápido para que MP no reintente infinito,
  // salvo errores de config que conviene ver.
  if (!MP_TOKEN || !SUPA_SECRET) return ok();

  var paymentId = await getPaymentId(event);
  if (!paymentId) return ok();

  try {
    // 1) Consultar el pago real en MP
    var pr = await fetch('https://api.mercadopago.com/v1/payments/' + paymentId, {
      headers: { Authorization: 'Bearer ' + MP_TOKEN }
    });
    if (!pr.ok) return ok();
    var pay = await pr.json();
    if (pay.status !== 'approved') return ok();

    var giftId = pay.external_reference || (pay.metadata && pay.metadata.gift_card_id);
    if (!giftId) return ok();

    var supaHeaders = {
      apikey: SUPA_SECRET, Authorization: 'Bearer ' + SUPA_SECRET,
      'Content-Type': 'application/json', Prefer: 'return=representation'
    };

    // 2) Activar SOLO si sigue pendiente (idempotencia: si ya está active, no repite)
    var up = await fetch(SUPA_URL + '/rest/v1/gift_cards?id=eq.' + encodeURIComponent(giftId) +
      '&status=eq.pending', {
      method: 'PATCH', headers: supaHeaders,
      body: JSON.stringify({ status: 'active', mp_payment_id: String(paymentId) })
    });
    var rows = up.ok ? await up.json() : [];
    if (!rows.length) return ok(); // ya estaba activa o no existe -> no reenviar

    // 3) Mandar la gift card al destinatario y el comprobante al comprador
    try { await sendGiftCardEmail(rows[0]); } catch (e) { /* el alta ya quedó; el mail se puede reintentar */ }
    try { await sendBuyerReceiptEmail(rows[0]); } catch (e) { /* idem */ }
    return ok();
  } catch (e) {
    return ok();
  }
};
