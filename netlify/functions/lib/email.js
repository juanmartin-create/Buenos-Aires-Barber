/* Librería compartida: arma y envía los emails de gift cards.
 * - Email al destinatario (la gift card con su código)
 * - Email al comprador (comprobante de compra)
 * Prioridad de envío: SMTP genérico > Gmail app password > Resend. */

// Opción 1 (preferida): SMTP genérico — sirve para info@bsasbarbershop.com
// tanto si está en Google Workspace (smtp.gmail.com) como en un hosting (cPanel, DonWeb, etc.)
const SMTP_HOST = process.env.SMTP_HOST;                   // ej: smtp.gmail.com o mail.bsasbarbershop.com
const SMTP_PORT = Number(process.env.SMTP_PORT || 465);
const SMTP_USER = process.env.SMTP_USER;                   // ej: info@bsasbarbershop.com
const SMTP_PASS = process.env.SMTP_PASS;
const SMTP_FROM = process.env.SMTP_FROM;                   // opcional: 'Buenos Aires Barbershop <info@...>'

// Opción 2: cuenta de Gmail común con contraseña de aplicación
const GMAIL_USER = process.env.GMAIL_USER;                 // ej: bsasbarbershop@gmail.com
const GMAIL_APP_PASSWORD = process.env.GMAIL_APP_PASSWORD; // contraseña de aplicación (16 caracteres)

// Opción 3 (fallback): Resend
const RESEND_KEY = process.env.RESEND_API_KEY;
const FROM = process.env.RESEND_FROM || 'Buenos Aires Barbershop <onboarding@resend.dev>';

const SITE = (process.env.SITE_URL || 'https://buenosairesbarbershop-protoype.netlify.app').replace(/\/$/, '');
const LOGO = SITE + '/assets/img/logo/logo-principal-color-neg.png';

// Paleta del manual de marca
const C = {
  bg: '#0a0e0c', card: '#10160f', line: 'rgba(157,137,114,.25)',
  ink: '#f7f3ef', dim: '#9d8972', copper: '#b77636', copperSoft: 'rgba(183,118,54,.5)'
};

function fmtPrecio(n) { return '$' + (Math.round(Number(n) || 0)).toLocaleString('es-AR'); }

function fmtVence(s) {
  if (!s) return '';
  try { return new Date(s).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' }); }
  catch (e) { return ''; }
}

function escapeHtml(s) {
  return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function shell(innerHtml) {
  return [
    '<div style="background:' + C.bg + ';padding:36px 16px;font-family:Georgia,\'Times New Roman\',serif">',
    '<div style="max-width:520px;margin:0 auto;background:' + C.card + ';border:1px solid ' + C.line + ';border-radius:4px;overflow:hidden">',
    '<div style="padding:34px 32px 26px;text-align:center;border-bottom:1px solid ' + C.line + '">',
    '<img src="' + LOGO + '" alt="Buenos Aires Barbershop" width="190" style="display:block;margin:0 auto;max-width:190px;height:auto" />',
    '</div>',
    innerHtml,
    '<div style="padding:20px 32px;border-top:1px solid ' + C.line + ';text-align:center">',
    '<p style="margin:0;color:' + C.dim + ';font-size:12px;font-style:italic">Buenos Aires Barbershop · El último ritual masculino</p>',
    '<p style="margin:6px 0 0;color:' + C.dim + ';font-size:11px">Reservá tu turno en <a href="https://buenosairesbarbershop.booksy.com/" style="color:' + C.copper + '">Booksy</a> · <a href="https://instagram.com/buenosairesbarbershop" style="color:' + C.copper + '">@buenosairesbarbershop</a></p>',
    '</div>',
    '</div></div>'
  ].join('');
}

function codeBox(code) {
  return '<div style="font-family:Consolas,Menlo,monospace;font-size:34px;letter-spacing:.18em;color:' + C.copper + ';background:' + C.bg + ';border:1px dashed ' + C.copperSoft + ';border-radius:6px;padding:20px;text-align:center;margin:0 0 20px">' + escapeHtml(code) + '</div>';
}

/* ---------- Email al destinatario: la gift card ---------- */
function buildEmail(g) {
  var mensaje = g.mensaje
    ? '<p style="margin:0 0 18px;color:' + C.dim + ';font-style:italic;text-align:center">&ldquo;' + escapeHtml(g.mensaje) + '&rdquo;</p>'
    : '';
  return shell([
    '<div style="padding:32px">',
    '<p style="margin:0 0 6px;color:' + C.copper + ';letter-spacing:.25em;font-size:11px;text-transform:uppercase;text-align:center;font-family:Arial,sans-serif">Gift Card · Experiencia</p>',
    (g.recipient_name ? '<p style="margin:14px 0 8px;color:' + C.ink + ';font-size:17px">Hola ' + escapeHtml(g.recipient_name) + ',</p>' : ''),
    '<p style="margin:0 0 14px;color:' + C.ink + ';font-size:17px">Te regalaron una experiencia en la barbería:</p>',
    '<h2 style="margin:6px 0 18px;color:' + C.copper + ';font-size:26px;font-weight:normal;font-style:italic;text-align:center">' + escapeHtml(g.servicio_nombre || '') + '</h2>',
    mensaje,
    '<p style="margin:0 0 8px;color:' + C.dim + ';font-size:13px;text-align:center;font-family:Arial,sans-serif">Tu código de gift card</p>',
    codeBox(g.code),
    '<p style="margin:0 0 4px;color:' + C.dim + ';font-size:14px;text-align:center">Valor: <span style="color:' + C.ink + '">' + fmtPrecio(g.monto) + '</span></p>',
    (g.expires_at ? '<p style="margin:0 0 4px;color:' + C.dim + ';font-size:13px;text-align:center">Válida hasta el <span style="color:' + C.ink + '">' + fmtVence(g.expires_at) + '</span></p>' : ''),
    '<p style="margin:20px 0 0;color:' + C.dim + ';font-size:14px;line-height:1.7;text-align:center">Presentá este código en el local para vivir tu experiencia.<br/>Cada servicio incluye una bebida de cortesía.</p>',
    '</div>'
  ].join(''));
}

/* ---------- Email al comprador: comprobante ---------- */
function buildBuyerEmail(g) {
  return shell([
    '<div style="padding:32px">',
    '<p style="margin:0 0 6px;color:' + C.copper + ';letter-spacing:.25em;font-size:11px;text-transform:uppercase;text-align:center;font-family:Arial,sans-serif">Comprobante de compra</p>',
    '<p style="margin:14px 0 18px;color:' + C.ink + ';font-size:17px;text-align:center">¡Gracias por tu compra! Tu pago fue acreditado.</p>',
    '<table style="width:100%;border-collapse:collapse;margin:0 0 20px;font-family:Arial,sans-serif;font-size:14px">',
    '<tr><td style="padding:9px 0;color:' + C.dim + ';border-bottom:1px solid ' + C.line + '">Experiencia</td><td style="padding:9px 0;color:' + C.ink + ';text-align:right;border-bottom:1px solid ' + C.line + '">' + escapeHtml(g.servicio_nombre || '') + '</td></tr>',
    '<tr><td style="padding:9px 0;color:' + C.dim + ';border-bottom:1px solid ' + C.line + '">Monto</td><td style="padding:9px 0;color:' + C.ink + ';text-align:right;border-bottom:1px solid ' + C.line + '">' + fmtPrecio(g.monto) + '</td></tr>',
    '<tr><td style="padding:9px 0;color:' + C.dim + ';border-bottom:1px solid ' + C.line + '">Código</td><td style="padding:9px 0;color:' + C.copper + ';text-align:right;border-bottom:1px solid ' + C.line + ';font-family:Consolas,monospace;letter-spacing:.1em">' + escapeHtml(g.code) + '</td></tr>',
    (g.recipient_email ? '<tr><td style="padding:9px 0;color:' + C.dim + ';border-bottom:1px solid ' + C.line + '">Enviada a</td><td style="padding:9px 0;color:' + C.ink + ';text-align:right;border-bottom:1px solid ' + C.line + '">' + escapeHtml(g.recipient_email) + '</td></tr>' : ''),
    (g.expires_at ? '<tr><td style="padding:9px 0;color:' + C.dim + ';border-bottom:1px solid ' + C.line + '">Válida hasta</td><td style="padding:9px 0;color:' + C.ink + ';text-align:right;border-bottom:1px solid ' + C.line + '">' + fmtVence(g.expires_at) + '</td></tr>' : ''),
    (g.mp_payment_id ? '<tr><td style="padding:9px 0;color:' + C.dim + '">N° de operación (Mercado Pago)</td><td style="padding:9px 0;color:' + C.ink + ';text-align:right">' + escapeHtml(g.mp_payment_id) + '</td></tr>' : ''),
    '</table>',
    '<p style="margin:0;color:' + C.dim + ';font-size:13px;line-height:1.7;text-align:center">La gift card con el código ya fue enviada al email del destinatario.<br/>Ante cualquier consulta, respondé este correo.</p>',
    '</div>'
  ].join(''));
}

/* ---------- Envío ---------- */
function smtpTransport() {
  const nodemailer = require('nodemailer');
  if (SMTP_HOST && SMTP_USER && SMTP_PASS) {
    return {
      t: nodemailer.createTransport({ host: SMTP_HOST, port: SMTP_PORT, secure: SMTP_PORT === 465, auth: { user: SMTP_USER, pass: SMTP_PASS } }),
      from: SMTP_FROM || ('"Buenos Aires Barbershop" <' + SMTP_USER + '>')
    };
  }
  if (GMAIL_USER && GMAIL_APP_PASSWORD) {
    return {
      t: nodemailer.createTransport({ service: 'gmail', auth: { user: GMAIL_USER, pass: GMAIL_APP_PASSWORD } }),
      from: '"Buenos Aires Barbershop" <' + GMAIL_USER + '>'
    };
  }
  return null;
}

async function sendEmail(to, subject, html) {
  var smtp = smtpTransport();
  if (smtp) return smtp.t.sendMail({ from: smtp.from, to: to, subject: subject, html: html });
  if (RESEND_KEY) {
    var r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + RESEND_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: FROM, to: to, subject: subject, html: html })
    });
    var data = await r.json();
    if (!r.ok) throw new Error('Resend: ' + (data.message || JSON.stringify(data)));
    return data;
  }
  throw new Error('Falta configurar el envío de emails: SMTP_HOST/SMTP_USER/SMTP_PASS (o GMAIL_USER + GMAIL_APP_PASSWORD, o RESEND_API_KEY)');
}

async function sendGiftCardEmail(g) {
  return sendEmail(g.recipient_email, 'Tu Gift Card de Buenos Aires Barbershop 🎁', buildEmail(g));
}

async function sendBuyerReceiptEmail(g) {
  if (!g.buyer_email) return null;
  return sendEmail(g.buyer_email, 'Comprobante de tu compra · Buenos Aires Barbershop', buildBuyerEmail(g));
}

module.exports = { sendGiftCardEmail, sendBuyerReceiptEmail, buildEmail, buildBuyerEmail, fmtPrecio, escapeHtml };
