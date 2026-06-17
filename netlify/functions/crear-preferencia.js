/* ============================================================
 * Netlify Function: crear-preferencia
 * Inicia una compra de gift card con Mercado Pago (Checkout Pro).
 *  1) Valida el servicio y toma el PRECIO REAL desde Supabase (no del cliente).
 *  2) Crea la gift card en estado 'pending' (pago aún no confirmado).
 *  3) Crea la preferencia de pago en MP y devuelve el link.
 * El alta definitiva (pending -> active) + el email los hace el webhook.
 * ============================================================ */

const SUPA_URL = process.env.SUPABASE_URL || 'https://nueyqdahtetoxsggqshg.supabase.co';
const SUPA_PUB = process.env.SUPABASE_ANON_KEY || 'sb_publishable_dkS_Kp-JWmZVp51rdf08eg_5PDNhkf5';
const SUPA_SECRET = process.env.SUPABASE_SERVICE_KEY;
const MP_TOKEN = process.env.MP_ACCESS_TOKEN;

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};
function resp(code, payload) {
  return {
    statusCode: code,
    headers: Object.assign({ 'Content-Type': 'application/json' }, CORS),
    body: typeof payload === 'string' ? JSON.stringify({ message: payload }) : JSON.stringify(payload)
  };
}
function genCode() {
  var ab = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789', p = function () {
    var s = ''; for (var i = 0; i < 4; i++) s += ab[Math.floor(Math.random() * ab.length)]; return s;
  };
  return 'BAB-' + p() + '-' + p();
}

exports.handler = async function (event) {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: CORS, body: '' };
  if (event.httpMethod !== 'POST') return resp(405, 'Método no permitido');
  if (!MP_TOKEN) return resp(500, 'Falta configurar MP_ACCESS_TOKEN');
  if (!SUPA_SECRET) return resp(500, 'Falta configurar SUPABASE_SERVICE_KEY');

  let body;
  try { body = JSON.parse(event.body || '{}'); }
  catch (e) { return resp(400, 'JSON inválido'); }

  if (!body.servicio_slug) return resp(400, 'Falta el servicio');
  if (!body.recipient_email) return resp(400, 'Falta el email del destinatario');

  // 1) Precio real desde Supabase (solo servicios activos)
  let serv;
  try {
    var sr = await fetch(SUPA_URL + '/rest/v1/servicios?slug=eq.' +
      encodeURIComponent(body.servicio_slug) + '&activo=eq.true&select=id,nombre,precio',
      { headers: { apikey: SUPA_PUB, Authorization: 'Bearer ' + SUPA_PUB } });
    var arr = await sr.json();
    serv = arr && arr[0];
  } catch (e) { return resp(502, 'Error consultando el servicio'); }
  if (!serv) return resp(404, 'Servicio no disponible');

  // 2) Crear gift card 'pending' (con reintento si el código se repite)
  var supaHeaders = {
    apikey: SUPA_SECRET, Authorization: 'Bearer ' + SUPA_SECRET,
    'Content-Type': 'application/json', Prefer: 'return=representation'
  };
  let gift, attempt = 0;
  while (attempt < 5 && !gift) {
    attempt++;
    var payload = {
      servicio_id: serv.id, code: genCode(), servicio_nombre: serv.nombre,
      monto: serv.precio, status: 'pending',
      recipient_name: body.recipient_name || null,
      recipient_email: body.recipient_email,
      mensaje: body.mensaje || null,
      buyer_email: body.buyer_email || null
    };
    var ins = await fetch(SUPA_URL + '/rest/v1/gift_cards', {
      method: 'POST', headers: supaHeaders, body: JSON.stringify(payload)
    });
    if (ins.ok) { var rows = await ins.json(); gift = rows[0]; break; }
    if (ins.status === 409) continue; // código duplicado: reintentar
    var err = await ins.text();
    return resp(502, 'No se pudo crear la gift card: ' + err);
  }
  if (!gift) return resp(500, 'No se pudo generar un código único');

  // 3) Preferencia de Mercado Pago
  var proto = event.headers['x-forwarded-proto'] || 'https';
  var host = event.headers['x-forwarded-host'] || event.headers.host;
  var base = process.env.SITE_URL || (proto + '://' + host);
  var pref = {
    items: [{
      title: 'Gift Card · ' + serv.nombre,
      quantity: 1, unit_price: Number(serv.precio), currency_id: 'ARS'
    }],
    external_reference: gift.id,
    notification_url: base + '/.netlify/functions/mp-webhook',
    back_urls: {
      success: base + '/gracias.html',
      failure: base + '/Gift%20Card.html',
      pending: base + '/gracias.html'
    },
    metadata: { gift_card_id: gift.id }
  };
  if (base.indexOf('https://') === 0) pref.auto_return = 'approved';

  try {
    var mp = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + MP_TOKEN, 'Content-Type': 'application/json' },
      body: JSON.stringify(pref)
    });
    var mpData = await mp.json();
    if (!mp.ok) return resp(502, 'Mercado Pago: ' + (mpData.message || JSON.stringify(mpData)));
    return resp(200, {
      ok: true,
      init_point: mpData.init_point,
      sandbox_init_point: mpData.sandbox_init_point,
      code: gift.code
    });
  } catch (e) {
    return resp(502, 'Error creando la preferencia: ' + e.message);
  }
};
