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

  function run() {
    rest('site_content?select=key,value,tipo').then(applyContent);
    rest('servicios?select=slug,precio,precio_efectivo,duracion&activo=eq.true&order=orden')
      .then(applyServicios);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', run);
  } else {
    run();
  }
})();
