/* ALTER GOLD · movimiento
   Módulo independiente del resto del sitio: si falla o no carga, la página se ve
   completa (el script en línea del <head> retira la clase ag-anim a los 3 s).

   Qué hace
     1. Parte los titulares en palabras para que suban desde su línea.
     2. Revela bloques e imágenes cuando entran en pantalla, escalonados.
     3. Coordina la entrada de la portada y de las cabeceras de página.
     4. Paralaje suave de la foto de cabecera.
   Las listas de selectores (.eyebrow:not(.kicker),.section-heading>p,.section-heading>.text-link,.section-heading>.home-stores-actions,.home-shop-intro,.hero-tasks a,.product-card,.how,.trust-facts li,.trust-links,.service-row>li,.store-panel,.facts-grid li,.faq-layout .accordion,.split-copy>p,.split-copy .steps,.split-copy .actions,.process-item,.service-link,.pillar,.trust-item,.calc-card,.calc-aside,.calc-lead,.calc-ref,.price-intro>p,.price-board,.page-intro>p,.home-pieces-more,.cta-band p,.cta-band .actions,.footer-contact-intro p,.footer-contact-ways>*,.plp-hero-line,.statement blockquote,.sp-body,.pieces-all, .split-media,.trust-proof-media,.category-card,.store-visual,.sp-figure) las rellena apply.py desde
   patches.py, que es donde se mantienen junto con las del CSS. */
const root = document.documentElement;
const anim = root.classList.contains('ag-anim');
window.__agMotion = true;

const UP = '.eyebrow:not(.kicker),.section-heading>p,.section-heading>.text-link,.section-heading>.home-stores-actions,.home-shop-intro,.hero-tasks a,.product-card,.how,.trust-facts li,.trust-links,.service-row>li,.store-panel,.facts-grid li,.faq-layout .accordion,.split-copy>p,.split-copy .steps,.split-copy .actions,.process-item,.service-link,.pillar,.trust-item,.calc-card,.calc-aside,.calc-lead,.calc-ref,.price-intro>p,.price-board,.page-intro>p,.home-pieces-more,.cta-band p,.cta-band .actions,.footer-contact-intro p,.footer-contact-ways>*,.plp-hero-line,.statement blockquote,.sp-body,.pieces-all';
const CLIP = '.split-media,.trust-proof-media,.category-card,.store-visual,.sp-figure';
const NO_SPLIT = '#calculator-widget,.calculator,dialog,.reading,.price-panel,.product-card';

/* 1. Titulares ---------------------------------------------------------------- */
function splitWords(el) {
  let i = 0;
  const walk = node => {
    for (const child of [...node.childNodes]) {
      if (child.nodeType === 3) {
        const frag = document.createDocumentFragment();
        for (const part of child.textContent.split(/([ \n\t]+)/)) {
          if (!part) continue;
          if (/^[ \n\t]+$/.test(part)) { frag.append(' '); continue; }
          const w = document.createElement('span');
          const wi = document.createElement('span');
          w.className = 'w';
          wi.className = 'wi';
          wi.style.setProperty('--i', i++);
          wi.textContent = part;
          w.append(wi);
          frag.append(w);
        }
        child.replaceWith(frag);
      } else if (child.nodeType === 1 && !child.matches('.eyebrow,.visually-hidden,svg,br')) {
        walk(child);
      }
    }
  };
  walk(el);
}

function prepareHeading(h) {
  if (h.classList.contains('ag-words') || h.classList.contains('ag-skip')) return false;
  if (!anim || h.closest(NO_SPLIT) || h.classList.contains('visually-hidden') || !h.textContent.trim()) {
    h.classList.add('ag-skip');
    return false;
  }
  splitWords(h);
  h.classList.add('ag-words');
  return true;
}

/* 2. Revelados ---------------------------------------------------------------- */
const io = anim && 'IntersectionObserver' in window ? new IntersectionObserver(entries => {
  const perParent = new Map();
  for (const e of entries) {
    const el = e.target;
    if (!e.isIntersecting) {
      /* Lo que ya queda por encima de la pantalla se da por visto, sin animar. */
      if (e.boundingClientRect.bottom < 0) { el.classList.add('is-in'); io.unobserve(el); }
      continue;
    }
    const parent = el.parentElement;
    /* En un carrusel horizontal entran todos a la vez: los que quedan fuera por la
       derecha no los ve el observador hasta que se desliza. */
    const group = parent && parent.scrollWidth > parent.clientWidth + 8
      ? [...parent.children].filter(c => observed.has(c) && !c.classList.contains('is-in'))
      : [el];
    for (const item of group) {
      const n = perParent.get(parent) || 0;
      perParent.set(parent, n + 1);
      item.style.setProperty('--d', Math.min(n, 7) * 75 + 'ms');
      item.classList.add('is-in');
      io.unobserve(item);
    }
  }
}, { rootMargin: '0px 0px -6% 0px', threshold: 0.06 }) : null;

const observed = new WeakSet();
function observe(el) {
  if (!io || observed.has(el) || el.closest('.hero,.calculator,dialog')) return;
  observed.add(el);
  io.observe(el);
}

function scan(scope) {
  const all = (sel) => [...(scope.matches?.(sel) ? [scope] : []), ...scope.querySelectorAll(sel)];
  if (!anim) return;
  for (const h of all('main h1, main h2, .footer-contact-intro h2')) {
    if (prepareHeading(h) && !h.closest('.hero')) observe(h);
  }
  for (const el of all(UP)) if (el.closest('main,.site-footer')) observe(el);
  for (const el of all(CLIP)) if (el.closest('main')) observe(el);
}

scan(document);

/* Contenido que el sitio pinta después (rejilla de la tienda, bolsa, buscador…) */
new MutationObserver(records => {
  for (const r of records) for (const node of r.addedNodes) {
    if (node.nodeType !== 1 || node.closest('.ag-words,.calculator,dialog')) continue;
    if (anim) for (const h of [...(node.matches('h1,h2') ? [node] : []), ...node.querySelectorAll('h1,h2')]) {
      if (!h.classList.contains('ag-words')) h.classList.add('ag-skip');
    }
    scan(node);
  }
}).observe(document.querySelector('main') || document.body, { childList: true, subtree: true });

/* 3. Entrada de la cabecera de página ---------------------------------------- */
if (anim) {
  const go = () => root.classList.remove('ag-hold');
  if (document.fonts?.ready) {
    /* Espera a la tipografía (máx. 600 ms) para que el titular no salte al entrar. */
    Promise.race([document.fonts.ready, new Promise(r => setTimeout(r, 600))]).then(() => requestAnimationFrame(() => requestAnimationFrame(go)));
  } else requestAnimationFrame(() => requestAnimationFrame(go));
}

/* 4. Paralaje de la foto de cabecera ------------------------------------------ */
const heroMedia = anim ? [...document.querySelectorAll('.hero .hero-media')] : [];
const hero = document.querySelector('.hero');
if (hero && heroMedia.length) {
  let ticking = false;
  const onScroll = () => {
    ticking = false;
    const y = window.scrollY;
    if (y > hero.offsetHeight + 200) return;
    const shift = `translate3d(0,${(y * 0.14).toFixed(1)}px,0)`;
    for (const m of heroMedia) m.style.transform = shift;
  };
  addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });
  onScroll();
}

/* 5. Calculadora: al cambiar el importe, la cifra nueva entra con un leve ascenso */
const output = anim && document.getElementById('calculation-output');
if (output) {
  let last = '';
  new MutationObserver(() => {
    const amount = output.querySelector('.result-amount');
    const text = amount ? amount.textContent : '';
    if (amount && last && text !== last && amount.animate) {
      amount.animate([{ opacity: 0.35, transform: 'translateY(0.375rem)' }, { opacity: 1, transform: 'none' }], { duration: 320, easing: 'cubic-bezier(.23,1,.32,1)' });
    }
    last = text;
  }).observe(output, { childList: true, subtree: true, characterData: true });
}

/* 6. Fotos que se desplazan dentro de su marco: el marco queda quieto y la imagen,
      detrás, a otra distancia. Solo se calculan las que están en pantalla. */
if (anim && 'IntersectionObserver' in window) {
  const live = new Set();
  let queued = false;
  const update = () => {
    queued = false;
    const vh = innerHeight;
    for (const el of live) {
      const r = (el.parentElement || el).getBoundingClientRect();
      const p = Math.max(-1, Math.min(1, (r.top + r.height / 2 - vh / 2) / (vh / 2 + r.height / 2)));
      el.style.setProperty('--py', (p * -5.5).toFixed(2) + '%');
    }
  };
  const tick = () => { if (!queued) { queued = true; requestAnimationFrame(update); } };
  const pio = new IntersectionObserver(entries => {
    for (const e of entries) e.isIntersecting ? live.add(e.target) : live.delete(e.target);
    tick();
  }, { rootMargin: '12% 0px' });
  for (const el of document.querySelectorAll('.sp-media,.store-visual img,.split-media img')) pio.observe(el);
  addEventListener('scroll', tick, { passive: true });
  addEventListener('resize', tick, { passive: true });
}

/* 7. El botón flotante de WhatsApp se aparta mientras la cabecera de portada o la
      barra de accesos están en pantalla: ahí tapaba la cotización y los controles. */
const wa = document.querySelector('.wa-float');
const cover = [...document.querySelectorAll('.hero--home, .hero-tasks')];
if (wa && cover.length && 'IntersectionObserver' in window) {
  const inView = new Set();
  new IntersectionObserver(entries => {
    for (const e of entries) e.isIntersecting ? inView.add(e.target) : inView.delete(e.target);
    wa.classList.toggle('is-away', inView.size > 0);
  }).observe(cover[0]);
  if (cover[1]) {
    const io2 = new IntersectionObserver(entries => {
      for (const e of entries) e.isIntersecting ? inView.add(e.target) : inView.delete(e.target);
      wa.classList.toggle('is-away', inView.size > 0);
    });
    io2.observe(cover[1]);
  }
}
