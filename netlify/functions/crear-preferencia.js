/* ============================================================
 * Netlify Function: crear-preferencia
 * Inicia una compra de gift card con Mercado Pago (Checkout Pro).
 *  1) Valida el servicio y toma el PRECIO REAL desde Supabase (no del cliente).
 *  2) Crea la preferencia de pago en MP con los datos del comprador/destinatario
 *     dentro del `metadata`.
 *  3) Devuelve el init_point para redirigir.
 * La gift card se crea recién cuando MP confirma el pago (en mp-webhook).
 * ============================================================ */

const SUPA_URL = process.env.SUPABASE_URL || 'https://nueyqdahtetoxsggqshg.supabase.co';
const SUPA_PUB = process.env.SUPABASE_ANON_KEY || 'sb_publishable_dkS_Kp-JWmZVp51rdf08eg_5PDNhkf5';
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

exports.handler = async function (event) {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: CORS, body: '' };
  if (event.httpMethod !== 'POST') return resp(405, 'Método no permitido');
  if (!MP_TOKEN) return resp(500, 'Falta configurar MP_ACCESS_TOKEN');

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

  // 2) Preferencia de Mercado Pago con datos en metadata
  var proto = event.headers['x-forwarded-proto'] || 'https';
  var host = event.headers['x-forwarded-host'] || event.headers.host;
  var base = process.env.SITE_URL || (proto + '://' + host);
  var pref = {
    items: [{
      title: 'Gift Card · ' + serv.nombre,
      quantity: 1, unit_price: Number(serv.precio), currency_id: 'ARS'
    }],
    external_reference: body.recipient_email,
    notification_url: base + '/.netlify/functions/mp-webhook',
    back_urls: {
      success: base + '/gracias.html',
      failure: base + '/Gift%20Card.html',
      pending: base + '/gracias.html'
    },
    metadata: {
      servicio_id: serv.id,
      servicio_slug: body.servicio_slug,
      servicio_nombre: serv.nombre,
      monto: serv.precio,
      recipient_name: body.recipient_name || null,
      recipient_email: body.recipient_email,
      mensaje: body.mensaje || null,
      buyer_email: body.buyer_email || null
    }
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
      sandbox_init_point: mpData.sandbox_init_point
    });
  } catch (e) {
    return resp(502, 'Error creando la preferencia: ' + e.message);
  }
};
