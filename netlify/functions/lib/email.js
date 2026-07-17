/* Librería compartida: arma y envía el email de la gift card.
 * Prioridad: Gmail SMTP (sale desde la casilla real de la barbería).
 * Fallback: Resend (si no hay credenciales de Gmail configuradas).
 * La usan tanto la creación de cortesía como el webhook de Mercado Pago. */

const GMAIL_USER = process.env.GMAIL_USER;               // ej: bsasbarbershop@gmail.com
const GMAIL_APP_PASSWORD = process.env.GMAIL_APP_PASSWORD; // contraseña de aplicación (16 caracteres)
const RESEND_KEY = process.env.RESEND_API_KEY;
const FROM = process.env.RESEND_FROM || 'Buenos Aires Barbershop <onboarding@resend.dev>';

function fmtPrecio(n) { return '$' + (Math.round(Number(n) || 0)).toLocaleString('es-AR'); }

function escapeHtml(s) {
  return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function buildEmail(g) {
  var mensaje = g.mensaje
    ? '<p style="margin:0 0 18px;color:#a89e91;font-style:italic">“' + escapeHtml(g.mensaje) + '”</p>'
    : '';
  return [
    '<div style="background:#0a0908;padding:32px 16px;font-family:Arial,Helvetica,sans-serif">',
    '<div style="max-width:520px;margin:0 auto;background:#141312;border:1px solid rgba(244,237,228,.12);border-radius:14px;overflow:hidden">',
    '<div style="padding:28px 32px;border-bottom:1px solid rgba(244,237,228,.12)">',
    '<p style="margin:0;color:#c9a96a;letter-spacing:.2em;font-size:11px;text-transform:uppercase">Gift Card · Experiencia</p>',
    '<h1 style="margin:8px 0 0;color:#f4ede4;font-size:22px;font-weight:600">Buenos Aires Barbershop</h1>',
    '</div>',
    '<div style="padding:32px">',
    (g.recipient_name ? '<p style="margin:0 0 16px;color:#f4ede4">Hola ' + escapeHtml(g.recipient_name) + ',</p>' : ''),
    '<p style="margin:0 0 8px;color:#f4ede4">Te regalaron una experiencia en la barbería:</p>',
    '<h2 style="margin:6px 0 18px;color:#c9a96a;font-size:24px">' + escapeHtml(g.servicio_nombre || '') + '</h2>',
    mensaje,
    '<p style="margin:0 0 6px;color:#a89e91;font-size:13px">Tu código de gift card:</p>',
    '<div style="font-family:monospace;font-size:28px;letter-spacing:.12em;color:#c9a96a;background:#1e1c1a;border:1px dashed rgba(201,169,106,.5);border-radius:10px;padding:18px;text-align:center;margin:0 0 20px">' + escapeHtml(g.code) + '</div>',
    '<p style="margin:0 0 4px;color:#a89e91;font-size:13px">Valor: <span style="color:#f4ede4">' + fmtPrecio(g.monto) + '</span></p>',
    '<p style="margin:18px 0 0;color:#a89e91;font-size:13px;line-height:1.6">Presentá este código en el local para usar tu experiencia. Reservá tu turno en <a href="https://buenosairesbarbershop.booksy.com/" style="color:#c9a96a">Booksy</a>.</p>',
    '</div>',
    '<div style="padding:18px 32px;border-top:1px solid rgba(244,237,228,.12);color:#a89e91;font-size:11px">Buenos Aires Barbershop · El último ritual masculino.</div>',
    '</div></div>'
  ].join('');
}

const SUBJECT = 'Tu Gift Card de Buenos Aires Barbershop 🎁';

async function sendViaGmail(g) {
  const nodemailer = require('nodemailer');
  var transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: GMAIL_USER, pass: GMAIL_APP_PASSWORD }
  });
  return transporter.sendMail({
    from: '"Buenos Aires Barbershop" <' + GMAIL_USER + '>',
    to: g.recipient_email,
    subject: SUBJECT,
    html: buildEmail(g)
  });
}

async function sendViaResend(g) {
  var r = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + RESEND_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: FROM,
      to: g.recipient_email,
      subject: SUBJECT,
      html: buildEmail(g)
    })
  });
  var data = await r.json();
  if (!r.ok) throw new Error('Resend: ' + (data.message || JSON.stringify(data)));
  return data;
}

async function sendGiftCardEmail(g) {
  if (GMAIL_USER && GMAIL_APP_PASSWORD) return sendViaGmail(g);
  if (RESEND_KEY) return sendViaResend(g);
  throw new Error('Falta configurar el envío de emails: GMAIL_USER + GMAIL_APP_PASSWORD (o RESEND_API_KEY)');
}

module.exports = { sendGiftCardEmail, buildEmail, fmtPrecio, escapeHtml };
