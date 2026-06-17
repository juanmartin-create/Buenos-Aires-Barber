/* ============================================================
 * Netlify Function: enviar-giftcard
 * Manda el código de una gift card por email al destinatario (Resend).
 * Verifica que quien llama tenga sesión válida de Supabase (el dueño).
 * ============================================================ */
const { sendGiftCardEmail } = require('./lib/email');

const SUPA_URL = process.env.SUPABASE_URL || 'https://nueyqdahtetoxsggqshg.supabase.co';
const SUPA_KEY = process.env.SUPABASE_ANON_KEY || 'sb_publishable_dkS_Kp-JWmZVp51rdf08eg_5PDNhkf5';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
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

  let body;
  try { body = JSON.parse(event.body || '{}'); }
  catch (e) { return resp(400, 'JSON inválido'); }

  // 1) Verificar sesión del dueño
  var auth = event.headers.authorization || event.headers.Authorization || '';
  var token = auth.replace(/^Bearer\s+/i, '') || body.access_token;
  if (!token) return resp(401, 'No autorizado');
  try {
    var u = await fetch(SUPA_URL + '/auth/v1/user', {
      headers: { apikey: SUPA_KEY, Authorization: 'Bearer ' + token }
    });
    if (!u.ok) return resp(401, 'Sesión inválida');
  } catch (e) { return resp(500, 'No se pudo verificar la sesión'); }

  // 2) Validar y enviar
  if (!body.recipient_email || !body.code) return resp(400, 'Faltan email o código');
  try {
    var data = await sendGiftCardEmail(body);
    return resp(200, { ok: true, id: data.id });
  } catch (e) {
    return resp(502, e.message);
  }
};
