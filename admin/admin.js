/* ============================================================
 * admin.js · Panel de administración
 * Login (Supabase Auth) + edición de contenido, precios, gift cards
 * y validación de códigos. Todo protegido por RLS del lado del server.
 * ============================================================ */
(function () {
  'use strict';

  var cfg = window.SUPABASE_CONFIG;
  if (!cfg || !cfg.url || !cfg.key) {
    alert('Falta la configuración de Supabase (supabase-config.js).');
    return;
  }
  var sb = supabase.createClient(cfg.url, cfg.key);

  var $ = function (sel, root) { return (root || document).querySelector(sel); };
  var el = function (tag, attrs, html) {
    var e = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) { e.setAttribute(k, attrs[k]); });
    if (html != null) e.innerHTML = html;
    return e;
  };
  var esc = function (s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  };
  var fmtPrecio = function (n) { return '$' + (Math.round(Number(n) || 0)).toLocaleString('es-AR'); };
  var fmtFecha = function (s) {
    if (!s) return '—';
    try { return new Date(s).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' }); }
    catch (e) { return s; }
  };

  // ---------- AUTH ----------
  var loginScreen = $('#login'), appScreen = $('#app');

  // Dueño: acceso total. Cualquier otro usuario (recepción): solo Gift Cards y Validar.
  var OWNER_EMAILS = ['diegoizzo@icloud.com', 'juanmartin@simplex.la'];
  function esDueno(session) {
    return OWNER_EMAILS.indexOf(String(session.user.email || '').toLowerCase()) !== -1;
  }

  function aplicarRol(session) {
    if (esDueno(session)) return;
    // Recepción: solo Gift Cards y Validar
    ['contenido', 'equipo', 'servicios', 'prensa'].forEach(function (name) {
      var tab = document.querySelector('.tab[data-tab="' + name + '"]');
      if (tab) tab.style.display = 'none';
    });
    // Activar Gift Cards por defecto
    document.querySelectorAll('.tab').forEach(function (t) { t.classList.remove('active'); });
    document.querySelectorAll('.panel').forEach(function (p) { p.classList.remove('active'); });
    var gcTab = document.querySelector('.tab[data-tab="giftcards"]');
    if (gcTab) gcTab.classList.add('active');
    var gcPanel = $('#tab-giftcards');
    if (gcPanel) gcPanel.classList.add('active');
  }

  function showApp(session) {
    loginScreen.hidden = true;
    appScreen.hidden = false;
    $('#userEmail').textContent = session.user.email;
    aplicarRol(session);
    if (esDueno(session)) {
      loadContenido();
      loadBarberos();
      loadPrensa();
    }
    loadServicios(); // recepción también lo necesita para el select de cortesías
    loadGiftCards();
  }
  function showLogin() {
    appScreen.hidden = true;
    loginScreen.hidden = false;
  }

  $('#loginForm').addEventListener('submit', function (e) {
    e.preventDefault();
    var btn = $('#loginBtn'), errEl = $('#loginError');
    errEl.hidden = true;
    btn.disabled = true; btn.textContent = 'Entrando…';
    sb.auth.signInWithPassword({ email: $('#email').value.trim(), password: $('#password').value })
      .then(function (res) {
        if (res.error) {
          console.error('Login error:', res.error);
          errEl.textContent = res.error.message || 'Email o contraseña incorrectos.';
          errEl.hidden = false;
        } else if (!res.data || !res.data.session) {
          errEl.textContent = 'No se recibió sesión (¿usuario sin confirmar?).';
          errEl.hidden = false;
        } else {
          try {
            showApp(res.data.session);
          } catch (err) {
            console.error('showApp error:', err);
            errEl.textContent = 'Entró, pero falló al cargar el panel: ' + (err && err.message);
            errEl.hidden = false;
          }
        }
      })
      .catch(function (err) {
        console.error('Login exception:', err);
        errEl.textContent = 'Error de conexión: ' + (err && err.message);
        errEl.hidden = false;
      })
      .finally(function () { btn.disabled = false; btn.textContent = 'Entrar'; });
  });

  $('#logoutBtn').addEventListener('click', function () {
    sb.auth.signOut().then(showLogin);
  });

  // ---------- TABS ----------
  Array.prototype.forEach.call(document.querySelectorAll('.tab'), function (tab) {
    tab.addEventListener('click', function () {
      document.querySelectorAll('.tab').forEach(function (t) { t.classList.remove('active'); });
      document.querySelectorAll('.panel').forEach(function (p) { p.classList.remove('active'); });
      tab.classList.add('active');
      $('#tab-' + tab.dataset.tab).classList.add('active');
    });
  });

  // ---------- STORAGE (subir imágenes) ----------
  function uploadImage(file) {
    var ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
    var path = 'landing/' + Date.now() + '-' + Math.random().toString(36).slice(2) + '.' + ext;
    return sb.storage.from('media').upload(path, file, { cacheControl: '3600', upsert: false })
      .then(function (res) {
        if (res.error) throw res.error;
        return sb.storage.from('media').getPublicUrl(path).data.publicUrl;
      });
  }

  // ---------- CONTENIDO ----------
  var CONTENT_LABELS = {
    hero_titulo: 'Título principal (hero)',
    hero_sub: 'Subtítulo (hero)',
    hero_gift_tagline: 'Frase de gift card (hero)',
    hero_bg: 'Foto de fondo del hero',
    historia_img: 'Foto de la sección historia',
    marquee_texto: 'Banner en movimiento (frases del hero)'
  };

  function loadContenido() {
    var wrap = $('#contenidoForm');
    wrap.innerHTML = '<p class="hint">Cargando…</p>';
    sb.from('site_content').select('key,value,tipo').then(function (res) {
      if (res.error) { wrap.innerHTML = '<p class="error">No se pudo cargar el contenido.</p>'; return; }
      var rows = res.data.sort(function (a, b) {
        return Object.keys(CONTENT_LABELS).indexOf(a.key) - Object.keys(CONTENT_LABELS).indexOf(b.key);
      });
      wrap.innerHTML = '';
      rows.forEach(function (row) { wrap.appendChild(contentCard(row)); });
    });
  }

  function contentCard(row) {
    var label = CONTENT_LABELS[row.key] || row.key;
    var card = el('div', { class: 'card' });
    card.appendChild(el('p', { class: 'card-title' }, esc(label)));

    var input;
    if (row.tipo === 'imagen') {
      var box = el('div', { class: 'img-edit' });
      var prev = el('img', { class: 'img-preview', src: row.value || '', alt: '' });
      var grow = el('div', { class: 'grow' });
      var f = el('div', { class: 'field' });
      f.appendChild(el('label', null, 'URL de la imagen'));
      input = el('input', { type: 'text', value: row.value || '' });
      f.appendChild(input);
      var fileWrap = el('div', { class: 'field' });
      fileWrap.appendChild(el('label', null, '…o subí una foto nueva'));
      var file = el('input', { type: 'file', accept: 'image/*' });
      fileWrap.appendChild(file);
      file.addEventListener('change', function () {
        if (!file.files[0]) return;
        input.value = 'Subiendo…';
        uploadImage(file.files[0]).then(function (url) {
          input.value = url; prev.src = url;
        }).catch(function (err) {
          input.value = row.value || '';
          alert('No se pudo subir la imagen. ¿Creaste el bucket "media" en Supabase Storage?\n\n' + (err.message || ''));
        });
      });
      input.addEventListener('input', function () { prev.src = input.value; });
      grow.appendChild(f); grow.appendChild(fileWrap);
      box.appendChild(prev); box.appendChild(grow);
      card.appendChild(box);
    } else {
      var fld = el('div', { class: 'field' });
      input = row.key === 'hero_titulo'
        ? el('input', { type: 'text', value: row.value || '' })
        : el('textarea', null);
      if (input.tagName === 'TEXTAREA') input.value = row.value || '';
      fld.appendChild(input);
      card.appendChild(fld);
      if (row.key === 'hero_titulo') {
        card.appendChild(el('p', { class: 'hint' }, 'Tip: poné una palabra entre *asteriscos* para que salga en itálica dorada. Ej: El último *ritual* masculino.'));
      }
      if (row.key === 'marquee_texto') {
        card.appendChild(el('p', { class: 'hint' }, 'Separá cada frase con una barra vertical | — se muestran en loop con puntos entre medio. Ideal para horarios, teléfono y servicios.'));
      }
    }

    var saveRow = el('div', { class: 'save-row' });
    var btn = el('button', { class: 'save-btn' }, 'Guardar');
    var msg = el('span', { class: 'saved-msg' }, '✓ Guardado');
    saveRow.appendChild(btn); saveRow.appendChild(msg);
    card.appendChild(saveRow);

    btn.addEventListener('click', function () {
      btn.disabled = true; btn.textContent = 'Guardando…';
      sb.from('site_content').update({ value: input.value, updated_at: new Date().toISOString() })
        .eq('key', row.key).then(function (res) {
          btn.disabled = false; btn.textContent = 'Guardar';
          if (res.error) { alert('Error al guardar: ' + res.error.message); return; }
          row.value = input.value;
          msg.classList.add('show'); setTimeout(function () { msg.classList.remove('show'); }, 1800);
        });
    });
    return card;
  }

  // ---------- SERVICIOS ----------
  var serviciosCache = [];
  function loadServicios() {
    var wrap = $('#serviciosForm');
    wrap.innerHTML = '<p class="hint">Cargando…</p>';
    sb.from('servicios').select('*').order('orden').then(function (res) {
      if (res.error) { wrap.innerHTML = '<p class="error">No se pudieron cargar los servicios.</p>'; return; }
      serviciosCache = res.data || [];
      wrap.innerHTML = '';
      serviciosCache.forEach(function (s) { wrap.appendChild(servicioCard(s)); });
      fillGcServicioSelect();
    });
  }

  function servicioCard(s) {
    var card = el('div', { class: 'card' });
    card.appendChild(el('p', { class: 'card-title' }, esc(s.nombre)));

    var fNombre = field('Nombre', 'text', s.nombre);
    var fDesc = el('div', { class: 'field' });
    fDesc.appendChild(el('label', null, 'Descripción'));
    var desc = el('textarea', null); desc.value = s.descripcion || '';
    fDesc.appendChild(desc);

    var row = el('div', { class: 'row' });
    var fPrecio = field('Precio normal ($)', 'number', s.precio);
    var fEfvo = field('Precio efectivo ($)', 'number', s.precio_efectivo);
    var fDur = field('Duración', 'text', s.duracion);
    row.appendChild(fPrecio.wrap); row.appendChild(fEfvo.wrap); row.appendChild(fDur.wrap);

    var togWrap = el('div', { class: 'field' });
    var tog = el('label', { class: 'toggle' });
    var chk = el('input', { type: 'checkbox' }); if (s.activo) chk.checked = true;
    tog.appendChild(chk); tog.appendChild(el('span', { class: 'track' }));
    tog.appendChild(el('span', null, 'Visible en la web'));
    togWrap.appendChild(tog);

    card.appendChild(fNombre.wrap); card.appendChild(fDesc);
    card.appendChild(row); card.appendChild(togWrap);

    var saveRow = el('div', { class: 'save-row' });
    var btn = el('button', { class: 'save-btn' }, 'Guardar');
    var msg = el('span', { class: 'saved-msg' }, '✓ Guardado');
    saveRow.appendChild(btn); saveRow.appendChild(msg);
    card.appendChild(saveRow);

    btn.addEventListener('click', function () {
      btn.disabled = true; btn.textContent = 'Guardando…';
      sb.from('servicios').update({
        nombre: fNombre.input.value,
        descripcion: desc.value,
        precio: Number(fPrecio.input.value) || 0,
        precio_efectivo: fEfvo.input.value === '' ? null : Number(fEfvo.input.value),
        duracion: fDur.input.value,
        activo: chk.checked,
        updated_at: new Date().toISOString()
      }).eq('id', s.id).then(function (res) {
        btn.disabled = false; btn.textContent = 'Guardar';
        if (res.error) { alert('Error al guardar: ' + res.error.message); return; }
        msg.classList.add('show'); setTimeout(function () { msg.classList.remove('show'); }, 1800);
      });
    });
    return card;
  }

  function field(label, type, value) {
    var wrap = el('div', { class: 'field' });
    wrap.appendChild(el('label', null, esc(label)));
    var input = el('input', { type: type });
    input.value = value == null ? '' : value;
    wrap.appendChild(input);
    return { wrap: wrap, input: input };
  }

  // ---------- EQUIPO (barberos) ----------
  var barberosCache = [];
  function loadBarberos() {
    var wrap = $('#barberosForm');
    if (!wrap) return;
    wrap.innerHTML = '<p class="hint">Cargando…</p>';
    sb.from('barberos').select('*').order('orden').order('id').then(function (res) {
      if (res.error) {
        wrap.innerHTML = '<p class="error">No se pudo cargar el equipo. ¿Corriste el SQL de la tabla "barberos"? (supabase-barberos.sql)</p>';
        return;
      }
      barberosCache = res.data || [];
      wrap.innerHTML = barberosCache.length ? '' : '<div class="empty">Todavía no hay barberos cargados.</div>';
      barberosCache.forEach(function (b) { wrap.appendChild(barberoCard(b)); });
    });
  }

  function barberoCard(b) {
    var card = el('div', { class: 'card' });
    card.appendChild(el('p', { class: 'card-title' }, esc(b.nombre) + (b.activo ? '' : ' <small style="color:var(--ink-dim)">(oculto)</small>')));

    var box = el('div', { class: 'img-edit' });
    var prev = el('img', { class: 'img-preview', src: b.foto_url || '', alt: '' });
    var grow = el('div', { class: 'grow' });

    var fNombre = field('Nombre', 'text', b.nombre);
    var fRol = field('Rol', 'text', b.rol);
    var fOrden = field('Orden', 'number', b.orden);
    var row = el('div', { class: 'row' });
    row.appendChild(fNombre.wrap); row.appendChild(fRol.wrap); row.appendChild(fOrden.wrap);

    var fEsp = field('Especialidad (ej: Fades y diseños)', 'text', b.especialidad);
    var fBio = el('div', { class: 'field' });
    fBio.appendChild(el('label', null, 'Descripción (se ve en el pop-up al tocar al barbero)'));
    var bio = el('textarea', null); bio.value = b.bio || '';
    fBio.appendChild(bio);

    var fUrl = el('div', { class: 'field' });
    fUrl.appendChild(el('label', null, 'URL de la foto'));
    var url = el('input', { type: 'text', value: b.foto_url || '' });
    fUrl.appendChild(url);
    url.addEventListener('input', function () { prev.src = url.value; });

    var fFile = el('div', { class: 'field' });
    fFile.appendChild(el('label', null, '…o subí una foto nueva'));
    var file = el('input', { type: 'file', accept: 'image/*' });
    fFile.appendChild(file);
    file.addEventListener('change', function () {
      if (!file.files[0]) return;
      url.value = 'Subiendo…';
      uploadImage(file.files[0]).then(function (u) { url.value = u; prev.src = u; })
        .catch(function (err) {
          url.value = b.foto_url || '';
          alert('No se pudo subir la foto: ' + (err.message || ''));
        });
    });

    grow.appendChild(row); grow.appendChild(fEsp.wrap); grow.appendChild(fBio); grow.appendChild(fUrl); grow.appendChild(fFile);
    box.appendChild(prev); box.appendChild(grow);
    card.appendChild(box);

    var togWrap = el('div', { class: 'field' });
    var tog = el('label', { class: 'toggle' });
    var chk = el('input', { type: 'checkbox' }); if (b.activo) chk.checked = true;
    tog.appendChild(chk); tog.appendChild(el('span', { class: 'track' }));
    tog.appendChild(el('span', null, 'Visible en la web'));
    togWrap.appendChild(tog);
    card.appendChild(togWrap);

    var saveRow = el('div', { class: 'save-row' });
    var btn = el('button', { class: 'save-btn' }, 'Guardar');
    var msg = el('span', { class: 'saved-msg' }, '✓ Guardado');
    var del = el('button', { class: 'mini-btn', style: 'margin-left:auto' }, 'Eliminar');
    saveRow.appendChild(btn); saveRow.appendChild(msg); saveRow.appendChild(del);
    card.appendChild(saveRow);

    btn.addEventListener('click', function () {
      btn.disabled = true; btn.textContent = 'Guardando…';
      sb.from('barberos').update({
        nombre: fNombre.input.value.trim(),
        rol: fRol.input.value.trim() || 'Barbero',
        especialidad: fEsp.input.value.trim() || null,
        bio: bio.value.trim() || null,
        foto_url: url.value.trim() || null,
        orden: Number(fOrden.input.value) || 0,
        activo: chk.checked,
        updated_at: new Date().toISOString()
      }).eq('id', b.id).then(function (res) {
        btn.disabled = false; btn.textContent = 'Guardar';
        if (res.error) { alert('Error al guardar: ' + res.error.message); return; }
        msg.classList.add('show'); setTimeout(function () { msg.classList.remove('show'); }, 1800);
      });
    });

    del.addEventListener('click', function () {
      if (!confirm('¿Eliminar a ' + b.nombre + ' del equipo? Esta acción no se puede deshacer.\n\nTip: si es algo temporal, destildá "Visible en la web" en vez de eliminar.')) return;
      del.disabled = true; del.textContent = 'Eliminando…';
      sb.from('barberos').delete().eq('id', b.id).then(function (res) {
        if (res.error) { del.disabled = false; del.textContent = 'Eliminar'; alert('Error: ' + res.error.message); return; }
        loadBarberos();
      });
    });

    return card;
  }

  var newBarberoBtn = $('#newBarberoCreate');
  if (newBarberoBtn) newBarberoBtn.addEventListener('click', function () {
    var nombre = ($('#newBarberoNombre').value || '').trim();
    if (!nombre) { alert('Poné el nombre del barbero.'); return; }
    var ok = $('#newBarberoOk');
    var fileInput = $('#newBarberoFoto');
    newBarberoBtn.disabled = true; newBarberoBtn.textContent = 'Agregando…';

    var fotoPromise = (fileInput.files && fileInput.files[0])
      ? uploadImage(fileInput.files[0])
      : Promise.resolve(null);

    fotoPromise.then(function (fotoUrl) {
      var maxOrden = barberosCache.reduce(function (m, x) { return Math.max(m, x.orden || 0); }, 0);
      return sb.from('barberos').insert({
        nombre: nombre,
        rol: ($('#newBarberoRol').value || '').trim() || 'Barbero',
        especialidad: (($('#newBarberoEsp') || {}).value || '').trim() || null,
        bio: (($('#newBarberoBio') || {}).value || '').trim() || null,
        foto_url: fotoUrl,
        orden: maxOrden + 1,
        activo: true
      });
    }).then(function (res) {
      newBarberoBtn.disabled = false; newBarberoBtn.textContent = 'Agregar barbero';
      if (res.error) { alert('Error al agregar: ' + res.error.message + '\n\n¿Corriste el SQL de la tabla "barberos"?'); return; }
      ok.textContent = '✓ ' + nombre + ' agregado';
      ok.classList.add('show'); setTimeout(function () { ok.classList.remove('show'); }, 4000);
      $('#newBarberoNombre').value = ''; $('#newBarberoRol').value = 'Barbero'; fileInput.value = '';
      loadBarberos();
    }).catch(function (err) {
      newBarberoBtn.disabled = false; newBarberoBtn.textContent = 'Agregar barbero';
      alert('No se pudo subir la foto: ' + (err.message || ''));
    });
  });

  // ---------- PRENSA ----------
  var prensaCache = [];
  function loadPrensa() {
    var wrap = $('#prensaForm');
    if (!wrap) return;
    wrap.innerHTML = '<p class="hint">Cargando…</p>';
    sb.from('prensa').select('*').order('orden').order('id').then(function (res) {
      if (res.error) {
        wrap.innerHTML = '<p class="error">No se pudo cargar la prensa. ¿Corriste el SQL de la tabla "prensa"? (supabase-prensa.sql)</p>';
        return;
      }
      prensaCache = res.data || [];
      wrap.innerHTML = prensaCache.length ? '' : '<div class="empty">Todavía no hay notas cargadas.</div>';
      prensaCache.forEach(function (p) { wrap.appendChild(prensaCard(p)); });
    });
  }

  function prensaCard(p) {
    var card = el('div', { class: 'card' });
    card.appendChild(el('p', { class: 'card-title' }, esc(p.titulo || 'Nota') + (p.activo ? '' : ' <small style="color:var(--ink-dim)">(oculta)</small>')));

    var box = el('div', { class: 'img-edit' });
    var prev = el('img', { class: 'img-preview', src: p.imagen_url || '', alt: '' });
    var grow = el('div', { class: 'grow' });

    var row = el('div', { class: 'row' });
    var fTitulo = field('Medio', 'text', p.titulo);
    var fOrden = field('Orden', 'number', p.orden);
    row.appendChild(fTitulo.wrap); row.appendChild(fOrden.wrap);

    var fLink = field('Link a la nota', 'text', p.link);

    var fUrl = el('div', { class: 'field' });
    fUrl.appendChild(el('label', null, 'URL de la imagen'));
    var url = el('input', { type: 'text', value: p.imagen_url || '' });
    fUrl.appendChild(url);
    url.addEventListener('input', function () { prev.src = url.value; });

    var fFile = el('div', { class: 'field' });
    fFile.appendChild(el('label', null, '…o subí una imagen nueva'));
    var file = el('input', { type: 'file', accept: 'image/*' });
    fFile.appendChild(file);
    file.addEventListener('change', function () {
      if (!file.files[0]) return;
      url.value = 'Subiendo…';
      uploadImage(file.files[0]).then(function (u) { url.value = u; prev.src = u; })
        .catch(function (err) {
          url.value = p.imagen_url || '';
          alert('No se pudo subir la imagen: ' + (err.message || ''));
        });
    });

    grow.appendChild(row); grow.appendChild(fLink.wrap); grow.appendChild(fUrl); grow.appendChild(fFile);
    box.appendChild(prev); box.appendChild(grow);
    card.appendChild(box);

    var togWrap = el('div', { class: 'field' });
    var tog = el('label', { class: 'toggle' });
    var chk = el('input', { type: 'checkbox' }); if (p.activo) chk.checked = true;
    tog.appendChild(chk); tog.appendChild(el('span', { class: 'track' }));
    tog.appendChild(el('span', null, 'Visible en la web'));
    togWrap.appendChild(tog);
    card.appendChild(togWrap);

    var saveRow = el('div', { class: 'save-row' });
    var btn = el('button', { class: 'save-btn' }, 'Guardar');
    var msg = el('span', { class: 'saved-msg' }, '✓ Guardado');
    var del = el('button', { class: 'mini-btn', style: 'margin-left:auto' }, 'Eliminar');
    saveRow.appendChild(btn); saveRow.appendChild(msg); saveRow.appendChild(del);
    card.appendChild(saveRow);

    btn.addEventListener('click', function () {
      var img = url.value.trim();
      if (!img || img === 'Subiendo…') { alert('Falta la imagen de la nota.'); return; }
      btn.disabled = true; btn.textContent = 'Guardando…';
      sb.from('prensa').update({
        titulo: fTitulo.input.value.trim() || null,
        link: fLink.input.value.trim() || null,
        imagen_url: img,
        orden: Number(fOrden.input.value) || 0,
        activo: chk.checked,
        updated_at: new Date().toISOString()
      }).eq('id', p.id).then(function (res) {
        btn.disabled = false; btn.textContent = 'Guardar';
        if (res.error) { alert('Error al guardar: ' + res.error.message); return; }
        msg.classList.add('show'); setTimeout(function () { msg.classList.remove('show'); }, 1800);
      });
    });

    del.addEventListener('click', function () {
      if (!confirm('¿Eliminar esta nota de prensa? Esta acción no se puede deshacer.\n\nTip: si es algo temporal, destildá "Visible en la web" en vez de eliminar.')) return;
      del.disabled = true; del.textContent = 'Eliminando…';
      sb.from('prensa').delete().eq('id', p.id).then(function (res) {
        if (res.error) { del.disabled = false; del.textContent = 'Eliminar'; alert('Error: ' + res.error.message); return; }
        loadPrensa();
      });
    });

    return card;
  }

  var newPrensaBtn = $('#newPrensaCreate');
  if (newPrensaBtn) newPrensaBtn.addEventListener('click', function () {
    var fileInput = $('#newPrensaFoto');
    if (!fileInput.files || !fileInput.files[0]) { alert('Elegí la imagen de la nota.'); return; }
    var ok = $('#newPrensaOk');
    newPrensaBtn.disabled = true; newPrensaBtn.textContent = 'Agregando…';

    uploadImage(fileInput.files[0]).then(function (imgUrl) {
      var maxOrden = prensaCache.reduce(function (m, x) { return Math.max(m, x.orden || 0); }, 0);
      return sb.from('prensa').insert({
        titulo: ($('#newPrensaTitulo').value || '').trim() || null,
        link: ($('#newPrensaLink').value || '').trim() || null,
        imagen_url: imgUrl,
        orden: maxOrden + 1,
        activo: true
      });
    }).then(function (res) {
      newPrensaBtn.disabled = false; newPrensaBtn.textContent = 'Agregar nota';
      if (res.error) { alert('Error al agregar: ' + res.error.message + '\n\n¿Corriste el SQL de la tabla "prensa"? (supabase-prensa.sql)'); return; }
      ok.textContent = '✓ Nota agregada';
      ok.classList.add('show'); setTimeout(function () { ok.classList.remove('show'); }, 4000);
      $('#newPrensaTitulo').value = ''; $('#newPrensaLink').value = ''; fileInput.value = '';
      loadPrensa();
    }).catch(function (err) {
      newPrensaBtn.disabled = false; newPrensaBtn.textContent = 'Agregar nota';
      alert('No se pudo subir la imagen: ' + (err.message || ''));
    });
  });

  // ---------- CREAR GIFT CARD (cortesía / gratis) ----------
  function fillGcServicioSelect() {
    var sel = $('#newGcServicio');
    if (!sel) return;
    sel.innerHTML = '';
    serviciosCache.forEach(function (s) {
      var opt = el('option', { value: s.id }, esc(s.nombre) + ' — ' + fmtPrecio(s.precio));
      sel.appendChild(opt);
    });
    syncGcMonto();
  }
  function syncGcMonto() {
    var sel = $('#newGcServicio');
    var s = serviciosCache.filter(function (x) { return String(x.id) === sel.value; })[0];
    if (s) $('#newGcMonto').value = s.precio;
  }

  function genCode() {
    var ab = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789', p = function () {
      var s = ''; for (var i = 0; i < 4; i++) s += ab[Math.floor(Math.random() * ab.length)]; return s;
    };
    return 'BAB-' + p() + '-' + p();
  }

  // Código correlativo corto (00023). Si la secuencia no existe todavía,
  // cae al formato viejo BAB-XXXX-XXXX.
  function nextCode() {
    return sb.rpc('next_gift_code').then(function (res) {
      return (!res.error && res.data) ? res.data : genCode();
    }).catch(function () { return genCode(); });
  }

  function createGiftCard(retries) {
    var sel = $('#newGcServicio');
    var s = serviciosCache.filter(function (x) { return String(x.id) === sel.value; })[0];
    if (!s) { alert('Elegí un servicio.'); return; }
    var btn = $('#newGcCreate'), ok = $('#newGcOk');
    btn.disabled = true; btn.textContent = 'Creando…';
    nextCode().then(function (code) { createGiftCardWithCode(code, s, retries); });
  }

  function createGiftCardWithCode(code, s, retries) {
    var btn = $('#newGcCreate'), ok = $('#newGcOk');
    var dias = Number(($('#newGcVigencia') || {}).value) || 90;
    var venc = new Date();
    venc.setDate(venc.getDate() + dias);
    var payload = {
      order_id: null,                       // cortesía: sin compra
      servicio_id: s.id,
      code: code,
      expires_at: venc.toISOString(),
      servicio_nombre: s.nombre,
      monto: Number($('#newGcMonto').value) || 0,
      status: 'active',
      recipient_name: $('#newGcName').value || null,
      recipient_email: $('#newGcEmail').value || null,
      mensaje: $('#newGcMsg').value || null
    };
    sb.from('gift_cards').insert(payload).select().then(function (res) {
      if (res.error) {
        // 23505 = código duplicado -> reintentar con otro
        if ((res.error.code === '23505' || /duplicate/i.test(res.error.message)) && (retries || 0) < 5) {
          btn.disabled = false; return createGiftCard((retries || 0) + 1);
        }
        btn.disabled = false; btn.textContent = 'Crear gift card';
        alert('Error al crear: ' + res.error.message + '\n\n¿Corriste el SQL del permiso de creación?');
        return;
      }
      btn.disabled = false; btn.textContent = 'Crear gift card';
      ok.textContent = '✓ Creada: ' + payload.code;
      ok.classList.add('show');
      loadGiftCards();
      // Mandar el mail al destinatario (si cargaste un email)
      if (payload.recipient_email) {
        ok.textContent = '✓ Creada: ' + payload.code + ' · enviando mail…';
        sendGiftCardEmail(payload).then(function (r) {
          ok.textContent = r.ok
            ? '✓ Creada y enviada a ' + payload.recipient_email
            : '✓ Creada (' + payload.code + ') · ⚠ mail no enviado: ' + r.error;
        });
      }
      $('#newGcName').value = ''; $('#newGcEmail').value = ''; $('#newGcMsg').value = '';
      setTimeout(function () { ok.classList.remove('show'); }, 9000);
    });
  }

  // Llama a la Netlify Function que manda el mail. Pasa el token de sesión
  // para que el servidor verifique que es el dueño quien lo dispara.
  function sendGiftCardEmail(payload) {
    return sb.auth.getSession().then(function (res) {
      var token = res.data.session && res.data.session.access_token;
      return fetch('/.netlify/functions/enviar-giftcard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
        body: JSON.stringify(payload)
      });
    }).then(function (r) {
      return r.json().then(function (d) { return { ok: r.ok, error: d && d.message }; });
    }).catch(function (e) {
      return { ok: false, error: 'no se pudo contactar el servidor de mail (¿estás en Netlify?)' };
    });
  }

  document.addEventListener('change', function (e) {
    if (e.target && e.target.id === 'newGcServicio') syncGcMonto();
  });
  var createBtn = $('#newGcCreate');
  if (createBtn) createBtn.addEventListener('click', function () { createGiftCard(0); });

  // ---------- GIFT CARDS ----------
  var gcAll = [];
  function loadGiftCards() {
    var wrap = $('#gcTableWrap');
    wrap.innerHTML = '<p class="hint">Cargando…</p>';
    sb.from('gift_cards').select('*').order('created_at', { ascending: false }).then(function (res) {
      if (res.error) { wrap.innerHTML = '<p class="error">No se pudieron cargar las gift cards.</p>'; return; }
      gcAll = res.data || [];
      renderGiftCards();
    });
  }

  function renderGiftCards() {
    var wrap = $('#gcTableWrap');
    var q = ($('#gcSearch').value || '').toLowerCase();
    var filter = $('#gcFilter').value;
    var rows = gcAll.filter(function (g) {
      if (filter && g.status !== filter) return false;
      if (!q) return true;
      return [g.code, g.recipient_name, g.recipient_email, g.servicio_nombre]
        .some(function (v) { return (v || '').toLowerCase().indexOf(q) >= 0; });
    });
    if (!rows.length) {
      wrap.innerHTML = '<div class="empty">No hay gift cards' + (gcAll.length ? ' que coincidan.' : ' todavía.<br>Aparecerán acá cuando alguien compre una.') + '</div>';
      return;
    }
    var html = '<table><thead><tr>' +
      '<th>Código</th><th>Servicio</th><th>Monto</th><th>Destinatario</th>' +
      '<th>Estado</th><th>Origen</th><th>Fecha</th><th>Vence</th><th></th></tr></thead><tbody>';
    rows.forEach(function (g) {
      if (isVencida(g)) marcarVencida(g);
      var origen = g.mp_payment_id
        ? '<span class="badge active" style="font-size:11px">💳 Pago MP</span>'
        : '<span class="badge" style="font-size:11px;background:var(--ink-dim,#888);color:#fff">🎁 Panel</span>';
      var acciones = '';
      if (g.status === 'active') {
        acciones += '<button class="mini-btn" data-redeem="' + esc(g.id) + '">Marcar canjeada</button> ';
      }
      acciones += '<button class="mini-btn" style="background:#c0392b;color:#fff" data-delete="' + esc(g.id) + '" data-code="' + esc(g.code) + '">Eliminar</button>';
      html += '<tr>' +
        '<td><span class="code">' + esc(g.code) + '</span></td>' +
        '<td>' + esc(g.servicio_nombre) + '</td>' +
        '<td>' + fmtPrecio(g.monto) + '</td>' +
        '<td>' + esc(g.recipient_name || '—') + (g.recipient_email ? '<br><small style="color:var(--ink-dim)">' + esc(g.recipient_email) + '</small>' : '') + '</td>' +
        '<td>' + statusBadge(g.status) + '</td>' +
        '<td>' + origen + '</td>' +
        '<td>' + fmtFecha(g.created_at) + '</td>' +
        '<td>' + fmtFecha(g.expires_at) + '</td>' +
        '<td style="white-space:nowrap">' + acciones + '</td>' +
        '</tr>';
    });
    html += '</tbody></table>';
    wrap.innerHTML = html;
    wrap.querySelectorAll('[data-redeem]').forEach(function (b) {
      b.addEventListener('click', function () {
        if (!confirm('¿Marcar esta gift card como canjeada? No se puede deshacer fácilmente.')) return;
        redeem(b.dataset.redeem, function () { loadGiftCards(); });
      });
    });
    wrap.querySelectorAll('[data-delete]').forEach(function (b) {
      b.addEventListener('click', function () {
        if (!confirm('¿Eliminar la gift card ' + b.dataset.code + '? Esta acción no se puede deshacer.')) return;
        deleteGiftCard(b.dataset.delete);
      });
    });
  }

  function statusBadge(s) {
    var map = { active: 'Activa', redeemed: 'Canjeada', pending: 'Pendiente de pago', expired: 'Vencida' };
    return '<span class="badge ' + s + '">' + (map[s] || s) + '</span>';
  }

  // Una gift card activa cuya fecha de vencimiento ya pasó se trata como vencida
  function isVencida(g) {
    return g.status === 'active' && g.expires_at && new Date(g.expires_at) < new Date();
  }
  function marcarVencida(g) {
    sb.from('gift_cards').update({ status: 'expired' }).eq('id', g.id).then(function () {});
    g.status = 'expired';
  }

  function redeem(id, done) {
    sb.from('gift_cards').update({ status: 'redeemed', redeemed_at: new Date().toISOString() })
      .eq('id', id).then(function (res) {
        if (res.error) { alert('Error: ' + res.error.message); return; }
        if (done) done();
      });
  }

  function deleteGiftCard(id) {
    sb.from('gift_cards').delete().eq('id', id).then(function (res) {
      if (res.error) { alert('Error al eliminar: ' + res.error.message); return; }
      loadGiftCards();
    });
  }

  function exportGiftCards() {
    var q = ($('#gcSearch').value || '').toLowerCase();
    var filter = $('#gcFilter').value;
    var rows = gcAll.filter(function (g) {
      if (filter && g.status !== filter) return false;
      if (!q) return true;
      return [g.code, g.recipient_name, g.recipient_email, g.servicio_nombre]
        .some(function (v) { return (v || '').toLowerCase().indexOf(q) >= 0; });
    });
    var statusMap = { active: 'Activa', redeemed: 'Canjeada', pending: 'Pendiente de pago', expired: 'Vencida' };
    var cols = ['Código', 'Servicio', 'Monto', 'Destinatario', 'Email destinatario', 'Estado', 'Origen', 'Fecha creación', 'Vencimiento', 'ID pago MP'];
    var csv = cols.join(';') + '\n';
    rows.forEach(function (g) {
      csv += [
        g.code || '',
        g.servicio_nombre || '',
        g.monto || '',
        g.recipient_name || '',
        g.recipient_email || '',
        statusMap[g.status] || g.status || '',
        g.mp_payment_id ? 'Pago MP' : 'Panel (cortesía)',
        g.created_at ? g.created_at.slice(0, 10) : '',
        g.expires_at ? g.expires_at.slice(0, 10) : '',
        g.mp_payment_id || ''
      ].map(function (v) { return '"' + String(v).replace(/"/g, '""') + '"'; }).join(';') + '\n';
    });
    var bom = '﻿';
    var blob = new Blob([bom + csv], { type: 'text/csv;charset=utf-8;' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url; a.download = 'giftcards-' + new Date().toISOString().slice(0, 10) + '.csv';
    document.body.appendChild(a); a.click();
    document.body.removeChild(a); URL.revokeObjectURL(url);
  }

  $('#gcSearch').addEventListener('input', renderGiftCards);
  $('#gcFilter').addEventListener('change', renderGiftCards);
  $('#gcReload').addEventListener('click', loadGiftCards);
  $('#gcExport').addEventListener('click', exportGiftCards);

  // ---------- VALIDAR CÓDIGO ----------
  $('#validarForm').addEventListener('submit', function (e) {
    e.preventDefault();
    var code = ($('#codeInput').value || '').trim().toUpperCase();
    // Si el cliente dice "23", se busca "00023"
    if (/^\d{1,5}$/.test(code)) code = code.padStart(5, '0');
    var out = $('#validarResult');
    if (!code) return;
    out.innerHTML = '<p class="hint">Buscando…</p>';
    sb.from('gift_cards').select('*').eq('code', code).maybeSingle().then(function (res) {
      if (res.error) { out.innerHTML = '<p class="error">Error al buscar.</p>'; return; }
      var g = res.data;
      if (!g) { out.innerHTML = '<div class="gc-result"><p class="error">No existe ninguna gift card con ese código.</p></div>'; return; }
      renderValidar(g);
    });
  });

  function renderValidar(g) {
    if (isVencida(g)) marcarVencida(g);
    var out = $('#validarResult');
    var cls = g.status === 'active' ? 'ok' : 'used';
    var box = el('div', { class: 'gc-result ' + cls });
    box.innerHTML =
      '<h3>' + esc(g.servicio_nombre) + '</h3>' +
      '<p class="gc-meta">Código: <span class="code">' + esc(g.code) + '</span></p>' +
      '<p class="gc-meta">Valor: ' + fmtPrecio(g.monto) + '</p>' +
      '<p class="gc-meta">Para: ' + esc(g.recipient_name || '—') + '</p>' +
      (g.expires_at ? '<p class="gc-meta">Vence: ' + fmtFecha(g.expires_at) + '</p>' : '') +
      '<p class="gc-big">Estado: ' + statusBadge(g.status) +
        (g.status === 'redeemed' ? ' <small style="color:var(--ink-dim)">el ' + fmtFecha(g.redeemed_at) + '</small>' : '') +
      '</p>';
    if (g.status === 'active') {
      var btn = el('button', { class: 'save-btn' }, 'Marcar como canjeada');
      btn.addEventListener('click', function () {
        btn.disabled = true; btn.textContent = 'Procesando…';
        redeem(g.id, function () {
          g.status = 'redeemed'; g.redeemed_at = new Date().toISOString();
          renderValidar(g); loadGiftCards();
        });
      });
      box.appendChild(btn);
    } else if (g.status === 'pending') {
      box.appendChild(el('p', { class: 'notice' }, '⏳ Pago no confirmado todavía. Esta gift card aún no es válida.'));
    } else if (g.status === 'expired') {
      box.appendChild(el('p', { class: 'notice' }, '⚠ Esta gift card venció' + (g.expires_at ? ' el ' + fmtFecha(g.expires_at) : '') + '.'));
    } else {
      box.appendChild(el('p', { class: 'notice' }, '⚠ Esta gift card ya fue utilizada.'));
    }
    out.innerHTML = '';
    out.appendChild(box);
  }

  // ---------- INIT ----------
  sb.auth.getSession().then(function (res) {
    if (res.data.session) showApp(res.data.session);
    else showLogin();
  });
})();
