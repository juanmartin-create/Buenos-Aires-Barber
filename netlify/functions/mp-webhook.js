/* ============================================================
 * Netlify Function: mp-webhook
 * Recibe la notificación de Mercado Pago cuando hay un pago.
 *  1) Verifica el pago consultando la API de MP (no confía en el payload).
 *  2) Si está aprobado, CREA la gift card 'active' con los datos del metadata.
 *  3) Manda el email al destinatario y el comprobante al comprador.
 * Idempotente: si ya existe una gift card con este mp_payment_id, no repite.
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

function genCode() {
  var ab = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789', p = function () {
    var s = ''; for (var i = 0; i < 4; i++) s += ab[Math.floor(Math.random() * ab.length)]; return s;
  };
  return 'BAB-' + p() + '-' + p();
}

// Código correlativo corto (00023) vía secuencia en Supabase.
async function nextCode() {
  try {
    var r = await fetch(SUPA_URL + '/rest/v1/rpc/next_gift_code', {
      method: 'POST',
      headers: {
        apikey: SUPA_SECRET, Authorization: 'Bearer ' + SUPA_SECRET,
        'Content-Type': 'application/json'
      },
      body: '{}'
    });
    if (r.ok) {
      var c = await r.json();
      if (typeof c === 'string' && c) return c;
    }
  } catch (e) {}
  return genCode();
}

exports.handler = async function (event) {
  // Siempre responder 200 rápido para que MP no reintente infinito.
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

    var supaHeaders = {
      apikey: SUPA_SECRET, Authorization: 'Bearer ' + SUPA_SECRET,
      'Content-Type': 'application/json', Prefer: 'return=representation'
    };

    // 2) Idempotencia: si ya existe una gift card con este mp_payment_id, no repetir
    var check = await fetch(SUPA_URL + '/rest/v1/gift_cards?mp_payment_id=eq.' +
      encodeURIComponent(String(paymentId)) + '&select=id',
      { headers: { apikey: SUPA_SECRET, Authorization: 'Bearer ' + SUPA_SECRET } });
    if (check.ok) {
      var existing = await check.json();
      if (existing && existing.length) return ok(); // ya procesado
    }

    // 3) Extraer datos del metadata (MP puede convertir a snake_case)
    var m = pay.metadata || {};
    var servicioId = m.servicio_id;
    var servicioNombre = m.servicio_nombre;
    var monto = m.monto || (pay.transaction_amount);
    var recipientEmail = m.recipient_email;
    if (!servicioId || !recipientEmail) return ok();

    // 4) Crear gift card 'active' (con reintento si el código colisiona)
    var venc = new Date();
    venc.setMonth(venc.getMonth() + 3);
    var gift, attempt = 0;
    while (attempt < 5 && !gift) {
      attempt++;
      var payload = {
        servicio_id: servicioId,
        code: await nextCode(),
        servicio_nombre: servicioNombre,
        monto: Number(monto) || 0,
        status: 'active',
        recipient_name: m.recipient_name || null,
        recipient_email: recipientEmail,
        mensaje: m.mensaje || null,
        buyer_email: m.buyer_email || null,
        mp_payment_id: String(paymentId),
        expires_at: venc.toISOString()
      };
      var ins = await fetch(SUPA_URL + '/rest/v1/gift_cards', {
        method: 'POST', headers: supaHeaders, body: JSON.stringify(payload)
      });
      if (ins.ok) {
        var rows = await ins.json();
        gift = rows && rows[0];
        break;
      }
      if (ins.status !== 409) return ok(); // error distinto a duplicado: cortar
    }
    if (!gift) return ok();

    // 5) Mandar la gift card al destinatario y el comprobante al comprador
    try { await sendGiftCardEmail(gift); } catch (e) { /* el alta ya quedó; el mail se puede reintentar */ }
    try { await sendBuyerReceiptEmail(gift); } catch (e) { /* idem */ }
    return ok();
  } catch (e) {
    return ok();
  }
};
