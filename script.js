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

  // ----- three.js scenes -----
  initHeroScene();
  initQuoteScene();
});

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

/* =========================================================
   THREE.JS — Hero: gold particles + slow rotating dust
   ========================================================= */
function initHeroScene() {
  const canvas = document.getElementById('heroCanvas');
  if (!canvas || !window.THREE) return;

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x0a0908, 0.02);

  const camera = new THREE.PerspectiveCamera(60, canvas.clientWidth / canvas.clientHeight, 0.1, 1000);
  camera.position.z = 50;

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(canvas.clientWidth, canvas.clientHeight, false);

  // -- Gold dust particle field
  const particleCount = 1400;
  const positions = new Float32Array(particleCount * 3);
  const sizes = new Float32Array(particleCount);
  for (let i = 0; i < particleCount; i++) {
    positions[i * 3]     = (Math.random() - 0.5) * 140;
    positions[i * 3 + 1] = (Math.random() - 0.5) * 80;
    positions[i * 3 + 2] = (Math.random() - 0.5) * 80;
    sizes[i] = Math.random() * 1.4 + 0.2;
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

  // Custom soft glowing particle material
  const tex = makeParticleTexture();
  const material = new THREE.PointsMaterial({
    color: 0xc9a96a,
    size: 0.6,
    map: tex,
    transparent: true,
    opacity: 0.7,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    sizeAttenuation: true
  });

  const particles = new THREE.Points(geometry, material);
  scene.add(particles);

  // -- Wireframe ring (subtle, behind text)
  const ringGeom = new THREE.TorusGeometry(22, 0.08, 16, 200);
  const ringMat = new THREE.MeshBasicMaterial({
    color: 0xc9a96a, transparent: true, opacity: 0.18, wireframe: true
  });
  const ring = new THREE.Mesh(ringGeom, ringMat);
  ring.position.z = -10;
  scene.add(ring);

  const ring2Geom = new THREE.TorusGeometry(30, 0.04, 12, 200);
  const ring2 = new THREE.Mesh(ring2Geom, ringMat.clone());
  ring2.material.opacity = 0.08;
  ring2.position.z = -15;
  ring2.rotation.x = Math.PI / 2.4;
  scene.add(ring2);

  // -- Mouse parallax
  const mouse = { x: 0, y: 0, tx: 0, ty: 0 };
  window.addEventListener('mousemove', e => {
    mouse.tx = (e.clientX / window.innerWidth - 0.5) * 2;
    mouse.ty = (e.clientY / window.innerHeight - 0.5) * 2;
  });

  // -- Scroll-driven camera zoom-out
  if (window.ScrollTrigger) {
    ScrollTrigger.create({
      trigger: '.hero',
      start: 'top top',
      end: 'bottom top',
      scrub: true,
      onUpdate: self => {
        camera.position.z = 50 + self.progress * 40;
        particles.material.opacity = 0.7 - self.progress * 0.6;
      }
    });
  }

  // -- Resize
  function onResize() {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  window.addEventListener('resize', onResize);
  onResize();

  // -- Animate
  const clock = new THREE.Clock();
  function tick() {
    const t = clock.getElapsedTime();
    mouse.x += (mouse.tx - mouse.x) * 0.04;
    mouse.y += (mouse.ty - mouse.y) * 0.04;

    particles.rotation.y = t * 0.04 + mouse.x * 0.2;
    particles.rotation.x = mouse.y * 0.15;

    ring.rotation.x = t * 0.1;
    ring.rotation.y = t * 0.06;
    ring2.rotation.z = -t * 0.05;

    renderer.render(scene, camera);
    requestAnimationFrame(tick);
  }
  tick();
}

/* =========================================================
   THREE.JS — Pullquote: floating dark waves
   ========================================================= */
function initQuoteScene() {
  const canvas = document.getElementById('quoteCanvas');
  if (!canvas || !window.THREE) return;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(60, canvas.clientWidth / canvas.clientHeight, 0.1, 1000);
  camera.position.set(0, 8, 25);
  camera.lookAt(0, 0, 0);

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(canvas.clientWidth, canvas.clientHeight, false);

  // Wireframe wave plane
  const planeGeom = new THREE.PlaneGeometry(60, 60, 60, 60);
  const planeMat = new THREE.MeshBasicMaterial({
    color: 0xc9a96a, wireframe: true, transparent: true, opacity: 0.18
  });
  const plane = new THREE.Mesh(planeGeom, planeMat);
  plane.rotation.x = -Math.PI / 2.2;
  plane.position.y = -6;
  scene.add(plane);

  const posAttr = planeGeom.attributes.position;
  const originalZ = new Float32Array(posAttr.count);
  for (let i = 0; i < posAttr.count; i++) originalZ[i] = posAttr.getZ(i);

  function onResize() {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  window.addEventListener('resize', onResize);
  onResize();

  const clock = new THREE.Clock();
  function tick() {
    const t = clock.getElapsedTime();
    for (let i = 0; i < posAttr.count; i++) {
      const x = posAttr.getX(i);
      const y = posAttr.getY(i);
      const wave = Math.sin(x * 0.25 + t) * 0.8 + Math.cos(y * 0.25 + t * 0.8) * 0.8;
      posAttr.setZ(i, originalZ[i] + wave);
    }
    posAttr.needsUpdate = true;
    plane.rotation.z = t * 0.02;
    renderer.render(scene, camera);
    requestAnimationFrame(tick);
  }
  tick();
}

/* ---------- Particle texture helper ---------- */
function makeParticleTexture() {
  const size = 64;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');
  const grad = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  grad.addColorStop(0, 'rgba(255, 220, 150, 1)');
  grad.addColorStop(0.3, 'rgba(201, 169, 106, 0.6)');
  grad.addColorStop(1, 'rgba(201, 169, 106, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  return tex;
}
