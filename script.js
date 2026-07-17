/* =========================================================
   Buenos Aires Barbershop — Interactions + three.js
   ========================================================= */

document.addEventListener('DOMContentLoaded', () => {
  // ----- Loader -----
  window.addEventListener('load', () => {
    setTimeout(() => {
      document.getElementById('loader').classList.add('gone');
      runHeroIntro();
    }, 900);
  });

  // ----- Year in footer -----
  document.getElementById('year').textContent = new Date().getFullYear();

  // ----- Nav scroll state -----
  const nav = document.getElementById('nav');
  window.addEventListener('scroll', () => {
    if (window.scrollY > 60) nav.classList.add('scrolled');
    else nav.classList.remove('scrolled');
  }, { passive: true });

  // ----- Mobile menu -----
  const burger = document.getElementById('navBurger');
  const mobileMenu = document.getElementById('mobileMenu');
  burger.addEventListener('click', () => {
    burger.classList.toggle('open');
    mobileMenu.classList.toggle('open');
    document.body.style.overflow = mobileMenu.classList.contains('open') ? 'hidden' : '';
  });
  mobileMenu.querySelectorAll('a').forEach(a => a.addEventListener('click', () => {
    burger.classList.remove('open');
    mobileMenu.classList.remove('open');
    document.body.style.overflow = '';
  }));

  // ----- GSAP + ScrollTrigger -----
  if (window.gsap && window.ScrollTrigger) {
    gsap.registerPlugin(ScrollTrigger);
    setupReveals();
    setupParallax();
    setupCounters();
    setupImageMasks();
  }

  // ----- Neon glow + lightbox + image fallbacks -----
  setupNeonGlow();
  setupClientesFeed();
  setupLightbox();
  setupImageFallbacks();

  // ----- Recalcular posiciones de ScrollTrigger cuando el layout se asienta.
  // Las fuentes autohosteadas y las imágenes cargan después de DOMContentLoaded;
  // sin este refresh, el pin del feed queda corrido y "persigue" al usuario.
  if (window.ScrollTrigger) {
    window.addEventListener('load', () => ScrollTrigger.refresh());
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(() => ScrollTrigger.refresh());
    }
  }

});

/* ---------- Ambient neon glow behind imagery ---------- */
function setupNeonGlow() {
  document.querySelectorAll('.barber, .collection').forEach(card => {
    const img = card.querySelector('img');
    if (!img) return;
    card.classList.add('neon-host');
    const glow = document.createElement('span');
    glow.className = 'neon-glow';
    const apply = () => { glow.style.backgroundImage = `url("${img.currentSrc || img.src}")`; };
    if (img.complete && img.naturalWidth) apply();
    else img.addEventListener('load', apply, { once: true });
    card.insertBefore(glow, card.firstChild);
  });
}

/* ---------- Clientes: vertical Instagram scroll feed ---------- */
function setupClientesFeed() {
  const section = document.getElementById('clientesFeed');
  const pin = document.getElementById('cfPin');
  const media = document.getElementById('cfMedia');
  if (!section || !pin || !media) return;

  const photos = [...media.querySelectorAll('.cf-photo')];
  const dots = [...document.querySelectorAll('#cfProgress .cf-dot')];
  const numEl = document.getElementById('cfNum');
  const glow = document.getElementById('cfGlow');
  const n = photos.length;
  if (!n) return;

  function setActive(idx) {
    dots.forEach((d, i) => d.classList.toggle('is-active', i === idx));
    if (numEl) numEl.textContent = String(idx + 1).padStart(2, '0');
    const ph = photos[idx];
    const src = ph && (ph.currentSrc || ph.src);
    if (glow && src) glow.style.backgroundImage = `url("${src}")`;
  }

  // initial stacked state
  photos.forEach((ph, i) => {
    ph.style.opacity = i === 0 ? '1' : '0';
    ph.style.transform = `translateY(${i === 0 ? 0 : 8}%) scale(${i === 0 ? 1 : 0.96})`;
    ph.style.zIndex = String(n - i);
  });
  setActive(0);

  if (!window.gsap || !window.ScrollTrigger) return;

  let lastActive = 0;
  ScrollTrigger.create({
    trigger: section,
    start: 'top top',
    end: () => '+=' + (window.innerHeight * n),
    pin: pin,
    pinSpacing: true,
    scrub: true,
    anticipatePin: 1,
    fastScrollEnd: true,
    invalidateOnRefresh: true,
    onUpdate: self => {
      const p = self.progress * (n - 1); // 0 .. n-1
      photos.forEach((ph, i) => {
        const d = i - p;
        const ad = Math.min(Math.abs(d), 1);
        ph.style.opacity = String(1 - ad);
        ph.style.transform = `translateY(${d * 10}%) scale(${1 - ad * 0.05})`;
        ph.style.zIndex = String(100 - Math.round(Math.abs(d) * 10));
      });
      const active = Math.max(0, Math.min(n - 1, Math.round(p)));
      if (active !== lastActive) { lastActive = active; setActive(active); }
    }
  });
}

/* ---------- Stateful collections lightbox ---------- */
function setupLightbox() {
  const box = document.getElementById('lightbox');
  if (!box) return;
  const imgEl = document.getElementById('lightboxImg');
  const glowEl = document.getElementById('lightboxGlow');
  const titleEl = document.getElementById('lightboxTitle');
  const indexEl = document.getElementById('lightboxIndex');
  const items = [...document.querySelectorAll('.collections-grid .collection')].map((el, i) => {
    const img = el.querySelector('img');
    const h3 = el.querySelector('h3');
    return { src: img ? (img.currentSrc || img.src) : '', title: h3 ? h3.textContent.trim() : '', n: String(i + 1).padStart(2, '0') };
  });
  let current = 0;

  function render() {
    const it = items[current];
    if (!it) return;
    imgEl.src = it.src;
    imgEl.alt = it.title;
    glowEl.style.backgroundImage = `url("${it.src}")`;
    titleEl.textContent = it.title;
    indexEl.textContent = it.n;
  }
  function open(i) {
    current = i;
    render();
    box.classList.add('open');
    box.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  }
  function close() {
    box.classList.remove('open');
    box.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }
  function step(dir) {
    current = (current + dir + items.length) % items.length;
    render();
    if (window.gsap) gsap.fromTo(imgEl, { opacity: 0.3, scale: 0.98 }, { opacity: 1, scale: 1, duration: 0.5, ease: 'power2.out' });
  }

  document.querySelectorAll('.collections-grid .collection').forEach((el, i) => {
    el.addEventListener('click', e => { e.preventDefault(); open(i); });
  });
  document.getElementById('lightboxClose').addEventListener('click', close);
  document.getElementById('lightboxPrev').addEventListener('click', () => step(-1));
  document.getElementById('lightboxNext').addEventListener('click', () => step(1));
  box.addEventListener('click', e => { if (e.target === box) close(); });
  document.addEventListener('keydown', e => {
    if (!box.classList.contains('open')) return;
    if (e.key === 'Escape') close();
    else if (e.key === 'ArrowRight') step(1);
    else if (e.key === 'ArrowLeft') step(-1);
  });
}

/* ---------- Neon placeholder when a photo fails ---------- */
function setupImageFallbacks() {
  const mark = img => {
    const wrap = img.closest('.collection-img, .barber-img, .reveal-image, .contacto-map, .prensa-card') || img.parentElement;
    if (wrap) wrap.classList.add('img-failed');
  };
  document.querySelectorAll('img').forEach(img => {
    if (img.complete && img.naturalWidth === 0) mark(img);
    img.addEventListener('error', () => mark(img));
  });
}

/* ---------- Hero intro animation ---------- */
function runHeroIntro() {
  if (!window.gsap) return;
  const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
  tl.to('.hero-title .word', {
    y: '0%', opacity: 1, duration: 1.1, stagger: 0.08
  })
  .to('.hero-sub', { opacity: 1, y: 0, duration: 0.8 }, '-=0.4')
  .to('.hero-actions', { opacity: 1, y: 0, duration: 0.8 }, '-=0.5');
}

/* ---------- Reveal-on-scroll ---------- */
function setupReveals() {
  // Fade up reveals
  gsap.utils.toArray('.reveal').forEach(el => {
    gsap.fromTo(el,
      { opacity: 0, y: 24 },
      {
        opacity: 1, y: 0, duration: 1, ease: 'power2.out',
        scrollTrigger: { trigger: el, start: 'top 85%' }
      }
    );
  });

  gsap.utils.toArray('.reveal-up').forEach((el, i) => {
    gsap.fromTo(el,
      { opacity: 0, y: 50 },
      {
        opacity: 1, y: 0, duration: 1.1, ease: 'power3.out',
        delay: (i % 4) * 0.08,
        scrollTrigger: { trigger: el, start: 'top 88%' }
      }
    );
  });

  // Word-by-word title reveals
  gsap.utils.toArray('.reveal-text').forEach(el => {
    if (el.dataset.split) return;
    el.dataset.split = '1';
    const html = el.innerHTML;
    // Wrap words preserving inline tags
    const tempText = el.textContent;
    el.style.visibility = 'hidden';
    requestAnimationFrame(() => {
      el.style.visibility = '';
      gsap.fromTo(el,
        { opacity: 0, y: 30 },
        {
          opacity: 1, y: 0, duration: 1.2, ease: 'power3.out',
          scrollTrigger: { trigger: el, start: 'top 85%' }
        }
      );
    });
    el.innerHTML = html;
  });
}

/* ---------- Parallax images ---------- */
function setupParallax() {
  gsap.utils.toArray('.parallax-img').forEach(img => {
    const speed = parseFloat(img.dataset.speed) || 0.2;
    gsap.to(img, {
      yPercent: -speed * 100,
      ease: 'none',
      scrollTrigger: {
        trigger: img.closest('section') || img,
        start: 'top bottom',
        end: 'bottom top',
        scrub: true
      }
    });
  });
}

/* ---------- Counters ---------- */
function setupCounters() {
  gsap.utils.toArray('.num').forEach(el => {
    const target = parseFloat(el.dataset.target);
    const decimal = el.dataset.decimal;
    const obj = { val: 0 };
    ScrollTrigger.create({
      trigger: el,
      start: 'top 85%',
      once: true,
      onEnter: () => {
        gsap.to(obj, {
          val: target,
          duration: 2.2,
          ease: 'power2.out',
          onUpdate: () => {
            if (decimal) {
              el.textContent = obj.val.toFixed(1);
            } else if (target >= 1000) {
              el.textContent = Math.floor(obj.val).toLocaleString('es-AR') + '+';
            } else {
              el.textContent = Math.floor(obj.val);
            }
          }
        });
      }
    });
  });
}

/* ---------- Image mask reveals ---------- */
function setupImageMasks() {
  gsap.utils.toArray('.reveal-image').forEach(el => {
    const mask = el.querySelector('.image-mask');
    if (!mask) return;
    gsap.fromTo(mask,
      { scaleY: 1 },
      {
        scaleY: 0,
        duration: 1.6,
        ease: 'expo.inOut',
        scrollTrigger: { trigger: el, start: 'top 80%' }
      }
    );
  });
}
/* ---------- Reserva Booksy embebida (modal in-page, sin redirigir) ---------- */
(function () {
  const triggers = document.querySelectorAll('#reservaBooksy, [data-booksy]');
  if (!triggers.length) return;
  triggers.forEach(btn => {
    btn.addEventListener('click', (e) => {
      const widgetBtn = document.querySelector('.booksy-widget-button');
      if (widgetBtn) {
        e.preventDefault();
        widgetBtn.click();
      }
      // Si el widget de Booksy no cargó, el href abre Booksy en otra pestaña como fallback
    });
  });
})();
