/* ============================================================
 * cms.js · Buenos Aires Barbershop
 * Lee de Supabase y reemplaza SOLO si el dueño cambió algo.
 * El HTML mantiene los textos/imágenes actuales como default, así que
 * la página renderiza al instante y este script es progressive enhancement.
 *
 * Es 100% defensivo: ante cualquier error hace no-op y quedan los defaults.
 * Jamás debe romper la landing.
 * ============================================================ */
(function () {
  'use strict';

  var cfg = window.SUPABASE_CONFIG;
  if (!cfg || !cfg.url || !cfg.key) return; // sin config -> solo defaults

  var headers = { apikey: cfg.key, Authorization: 'Bearer ' + cfg.key };

  function rest(path) {
    return fetch(cfg.url + '/rest/v1/' + path, { headers: headers })
      .then(function (r) { return r.ok ? r.json() : []; })
      .catch(function () { return []; });
  }

  function fmtPrecio(n) {
    var v = Math.round(Number(n) || 0);
    return '$' + v.toLocaleString('es-AR');
  }

  // ---- 1) Textos / imágenes / video editables (tabla site_content) ----
  function applyContent(rows) {
    if (!Array.isArray(rows)) return;
    rows.forEach(function (row) {
      if (row.value == null || row.value === '') return;
      var nodes = document.querySelectorAll('[data-cms="' + row.key + '"]');
      Array.prototype.forEach.call(nodes, function (el) {
        if (row.tipo === 'imagen') {
          if (el.tagName === 'IMG') el.src = row.value;
          else el.style.backgroundImage = "url('" + row.value + "')";
        } else if (row.tipo === 'video') {
          if (el.tagName === 'VIDEO' || el.tagName === 'SOURCE') {
            el.src = row.value;
            if (el.tagName === 'VIDEO' && el.load) el.load();
          } else {
            el.setAttribute('href', row.value);
          }
        } else { // texto
          if (row.key === 'hero_titulo') setHeroTitle(el, row.value);
          else if (row.key === 'marquee_texto') setMarquee(el, row.value);
          else el.textContent = row.value;
        }
      });
    });
  }

  // El título del hero está partido en <span class="word"> para la animación
  // GSAP. Si cambia, re-armamos las palabras. Convención: *palabra* => itálica.
  // Las dejamos visibles porque este fetch puede resolver DESPUÉS de la
  // animación de intro (si no, quedarían ocultas en su estado inicial).
  function setHeroTitle(el, text) {
    if ((el.getAttribute('data-cms-default') || '') === text) return; // sin cambios
    var html = text.trim().split(/\s+/).map(function (w) {
      var italic = /^\*.*\*$/.test(w);
      var clean = w.replace(/^\*+|\*+$/g, '')
                   .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      return '<span class="word' + (italic ? ' italic' : '') +
             '" style="transform:none;opacity:1">' + clean + '</span>';
    }).join(' ');
    el.innerHTML = html;
  }

  // El banner en loop: las frases van separadas por "|" en el panel.
  // Se duplica la lista para que la animación infinita no tenga cortes.
  function setMarquee(el, text) {
    var items = String(text).split('|').map(function (s) { return s.trim(); }).filter(Boolean);
    if (!items.length) return;
    var html = '';
    for (var k = 0; k < 2; k++) {
      items.forEach(function (it) {
        html += '<span>' + escHtml(it) + '</span><span>•</span>';
      });
    }
    el.innerHTML = html;
  }

  // ---- 2) Precios y visibilidad de servicios (fuente única: tabla servicios) ----
  // Recibe SOLO los servicios activos. Actualiza sus precios y oculta de la
  // landing los que el dueño marcó como "no visible".
  // Guarda: si la respuesta viene vacía (posible fallo de red), no oculta nada
  // y deja los 6 que están horneados en el HTML.
  function applyServicios(rows) {
    if (!Array.isArray(rows) || rows.length === 0) return;
    var activos = {};
    rows.forEach(function (s) { activos[s.slug] = s; });

    var items = document.querySelectorAll('[data-servicio]');
    Array.prototype.forEach.call(items, function (item) {
      var s = activos[item.getAttribute('data-servicio')];
      if (!s) { item.style.display = 'none'; return; } // no visible
      item.style.display = '';
      var p = item.querySelector('.service-price');
      var c = item.querySelector('.service-cash');
      var d = item.querySelector('.service-dur');
      if (p) p.textContent = fmtPrecio(s.precio);
      if (c && s.precio_efectivo != null) {
        c.textContent = fmtPrecio(s.precio_efectivo) + ' abonando en efectivo';
      }
      if (d && s.duracion) d.textContent = s.duracion;
    });
  }

  // ---- 3) Equipo (tabla barberos) ----
  // Si la tabla existe y tiene filas, re-renderiza la grilla del equipo.
  // Si no (error, vacía o tabla inexistente), quedan los 7 del HTML.
  function escHtml(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  function applyBarberos(rows) {
    if (!Array.isArray(rows) || rows.length === 0) return;
    var grid = document.querySelector('.team-grid');
    if (!grid) return;
    grid.innerHTML = rows.map(function (b) {
      return '<article class="barber">' +
        '<div class="barber-img"><img src="' + escHtml(b.foto_url || '') + '" alt="' + escHtml(b.nombre) + '" /></div>' +
        '<h3>' + escHtml(b.nombre) + '</h3><p>' + escHtml(b.rol || 'Barbero') + '</p>' +
        '</article>';
    }).join('');
  }

  function run() {
    rest('site_content?select=key,value,tipo').then(applyContent);
    rest('servicios?select=slug,precio,precio_efectivo,duracion&activo=eq.true&order=orden')
      .then(applyServicios);
    rest('barberos?select=nombre,rol,foto_url&activo=eq.true&order=orden')
      .then(applyBarberos);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', run);
  } else {
    run();
  }
})();
