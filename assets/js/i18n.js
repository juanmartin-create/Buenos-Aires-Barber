/* ============================================================
 * i18n.js · Buenos Aires Barbershop
 * Toggle ES/EN. Cada elemento traducible tiene un atributo
 * data-en con el texto en inglés (o HTML). El texto en español
 * es el que ya vive en el HTML — se guarda como data-es en el
 * primer render y se restaura al volver a español.
 *
 * Los placeholders de inputs se traducen con data-en-placeholder.
 * ============================================================ */
(function () {
  'use strict';
  var KEY = 'bab-lang';
  var current = 'es';
  try { if (localStorage.getItem(KEY) === 'en') current = 'en'; } catch (e) {}

  function saveDefault(el) {
    if (!el.hasAttribute('data-es')) el.setAttribute('data-es', el.innerHTML);
    if (el.hasAttribute('data-en-placeholder') && !el.hasAttribute('data-es-placeholder')) {
      el.setAttribute('data-es-placeholder', el.placeholder || '');
    }
  }

  function apply(lang) {
    current = lang;
    document.documentElement.lang = lang;
    document.body.setAttribute('data-lang', lang);

    document.querySelectorAll('[data-en]').forEach(function (el) {
      saveDefault(el);
      el.innerHTML = (lang === 'en') ? el.getAttribute('data-en') : el.getAttribute('data-es');
    });

    document.querySelectorAll('[data-en-placeholder]').forEach(function (el) {
      saveDefault(el);
      el.placeholder = (lang === 'en')
        ? el.getAttribute('data-en-placeholder')
        : el.getAttribute('data-es-placeholder');
    });

    document.querySelectorAll('[data-i18n-btn]').forEach(function (b) {
      var label = (lang === 'en') ? 'Language' : 'Idioma';
      var code = (lang === 'en') ? 'ES' : 'EN';
      b.innerHTML =
        '<svg class="lang-icon" viewBox="0 0 24 24" width="12" height="12" fill="none" ' +
        'stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
        '<circle cx="12" cy="12" r="9"/><path d="M3 12h18"/>' +
        '<path d="M12 3c2.5 3 4 6 4 9s-1.5 6-4 9"/>' +
        '<path d="M12 3c-2.5 3-4 6-4 9s1.5 6 4 9"/></svg>' +
        '<span class="lang-label">' + label + ':</span>' +
        '<span class="lang-code">' + code + '</span>';
      b.setAttribute('aria-label', lang === 'en' ? 'Cambiar a español' : 'Switch to English');
    });

    try { localStorage.setItem(KEY, lang); } catch (e) {}
  }

  function toggle() { apply(current === 'en' ? 'es' : 'en'); }

  function init() {
    document.querySelectorAll('[data-i18n-btn]').forEach(function (b) {
      b.addEventListener('click', function (e) { e.preventDefault(); toggle(); });
    });
    apply(current);
  }

  // Correr después de cms.js (que puede reemplazar textos); usamos load
  // en vez de DOMContentLoaded para asegurar el orden.
  if (document.readyState === 'complete') {
    setTimeout(init, 200);
  } else {
    window.addEventListener('load', function () { setTimeout(init, 200); });
  }
})();
