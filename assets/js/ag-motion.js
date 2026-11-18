/* ALTER GOLD · movimiento
   Módulo independiente del resto del sitio: si falla o no carga, la página se ve
   completa (el script en línea del <head> retira la clase ag-anim a los 3 s).

   Qué hace
     1. Parte los titulares en palabras para que suban desde su línea.
     2. Revela bloques e imágenes cuando entran en pantalla, escalonados.
     3. Coordina la entrada de la portada y de las cabeceras de página.
     4. Paralaje suave de la foto de cabecera.
   Las listas de selectores (.eyebrow:not(.kicker),.section-heading>p,.section-heading>.text-link,.section-heading>.home-stores-actions,.home-shop-intro,.hero-tasks a,.product-card,.trust-groups>section,.trust-proofs,.service-row>li,.store-panel,.facts-grid li,.faq-layout .accordion,.split-copy>p,.split-copy .steps,.split-copy .actions,.process-item,.service-link,.pillar,.trust-item,.page-intro>p,.home-pieces-more,.cta-band p,.cta-band .actions,.footer-contact-intro p,.footer-contact-ways>*,.plp-hero-line,.statement blockquote,.statement-lead,.pieces-all,.lq-card,.sv-lead,.sv-actions,.sv-ficha,.sv-about-copy>p,.sv-group,.sv-head>p,.sv-head>.text-link,.sv-steps li,.sv-panel,.sv-know li,.sv-faq-list .accordion,.sv-store,.sv-card,.sv-buy-lead,.sv-buy-list li,.sv-buy-note,.sv-prep-list li,.sv-marks,.sv-away,.sv-visit-lead, .split-media,.trust-proof-media,.category-card,.store-visual,.sv-media,.sv-buy-photo,.sv-visit-photo) las rellena apply.py desde
   patches.py, que es donde se mantienen junto con las del CSS. */
const root = document.documentElement;
const anim = root.classList.contains('ag-anim');
window.__agMotion = true;

const UP = '.eyebrow:not(.kicker),.section-heading>p,.section-heading>.text-link,.section-heading>.home-stores-actions,.home-shop-intro,.hero-tasks a,.product-card,.trust-groups>section,.trust-proofs,.service-row>li,.store-panel,.facts-grid li,.faq-layout .accordion,.split-copy>p,.split-copy .steps,.split-copy .actions,.process-item,.service-link,.pillar,.trust-item,.page-intro>p,.home-pieces-more,.cta-band p,.cta-band .actions,.footer-contact-intro p,.footer-contact-ways>*,.plp-hero-line,.statement blockquote,.statement-lead,.pieces-all,.lq-card,.sv-lead,.sv-actions,.sv-ficha,.sv-about-copy>p,.sv-group,.sv-head>p,.sv-head>.text-link,.sv-steps li,.sv-panel,.sv-know li,.sv-faq-list .accordion,.sv-store,.sv-card,.sv-buy-lead,.sv-buy-list li,.sv-buy-note,.sv-prep-list li,.sv-marks,.sv-away,.sv-visit-lead';
const CLIP = '.split-media,.trust-proof-media,.category-card,.store-visual,.sv-media,.sv-buy-photo,.sv-visit-photo';
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
  const start = () => {
    if (document.fonts?.ready) {
      /* Espera a la tipografía (máx. 600 ms) para que el titular no salte al entrar. */
      Promise.race([document.fonts.ready, new Promise(r => setTimeout(r, 600))]).then(() => requestAnimationFrame(() => requestAnimationFrame(go)));
    } else requestAnimationFrame(() => requestAnimationFrame(go));
  };
  /* v16 · Una página precargada (ver 17) espera a mostrarse para hacer su entrada. */
  if (document.prerendering) document.addEventListener('prerenderingchange', start, { once: true });
  else start();
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
  for (const el of document.querySelectorAll('.store-visual img,.split-media img')) pio.observe(el);
  addEventListener('scroll', tick, { passive: true });
  addEventListener('resize', tick, { passive: true });
}

/* 7. El botón flotante de WhatsApp se aparta mientras la cabecera de portada o la
      barra de accesos están en pantalla: ahí tapaba la cotización y los controles. */
const wa = document.querySelector('.wa-float');
const cover = [...document.querySelectorAll('.hero--home, .hero-tasks, .sv-open-in')];
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

/* 8. Ficha de precios junto a la calculadora ---------------------------------
   Mantiene al día la fila «Precio de compra · oro de 18 k» con la pureza y el
   tramo que haya elegidos en la calculadora. El dato sale de la propia
   calculadora (#price-line); si este módulo no carga, queda el valor que trae
   la página. No depende de que el movimiento esté activo. */
{
  const buy = document.querySelector('[data-buy]');
  const card = document.querySelector('.calc-card');
  if (buy && card) {
    const kind = buy.querySelector('[data-buy-kind]');
    const what = buy.querySelector('[data-buy-what]');
    const rate = buy.querySelector('[data-buy-rate]');
    const nb = s => s.replace(/ /g, '\u00a0');
    const sync = () => {
      const line = document.getElementById('price-line');
      if (!line) return;
      const full = (line.querySelector('.price-line-label')?.textContent || '').trim();
      const label = full.split('·').pop().trim();
      const value = (line.querySelector('.tier.active strong')?.textContent || '').trim();
      // En «Empeñar» la calculadora habla de valor de tasación, no de precio de compra.
      const k = full.startsWith('Precio') ? 'Precio de compra' : 'Valor por gramo';
      if (kind && full && kind.textContent !== k) kind.textContent = k;
      if (label && what.textContent !== nb(label)) what.textContent = nb(label);
      if (value && rate.textContent !== nb(value)) rate.textContent = nb(value);
    };
    sync();
    new MutationObserver(sync).observe(card, { childList: true, subtree: true, characterData: true });
    document.addEventListener('quote:update', sync);
  }
}

/* 9. Calculadora: el aviso de peso no válido, también junto al campo ----------
   El sitio lo escribe solo en el panel de resultado, lejos del campo, y no marca
   el campo como erróneo. Aquí se copia a #weight-error (ya enlazado con
   aria-describedby) y se pone aria-invalid. No se anuncia dos veces: de eso se
   encarga #calc-status. Si este módulo no carga, el aviso sigue en el panel. */
{
  const widget = document.getElementById('calculator-widget');
  if (widget) {
    const mirror = () => {
      const out = document.getElementById('calculation-output');
      const box = document.getElementById('weight-error');
      const input = document.getElementById('weight');
      if (!out || !box || !input) return;
      const res = out.querySelector('.calculation-result');
      const head = res && res.querySelector('.result-empty');
      const sub = res && res.querySelector('.result-sub');
      const invalid = !!(head && sub && head.textContent.trim() === 'Indica el peso');
      const own = box.querySelector('.field-error');
      let live = box.querySelector('.field-error-live');
      if (invalid) {
        const msg = sub.textContent.trim();
        if (own) { if (live) live.remove(); }
        else if (!live) { live = document.createElement('p'); live.className = 'field-error-live'; live.textContent = msg; box.append(live); }
        else if (live.textContent !== msg) live.textContent = msg;
        if (input.getAttribute('aria-invalid') !== 'true') input.setAttribute('aria-invalid', 'true');
        if (!res.classList.contains('is-mirrored')) res.classList.add('is-mirrored');
      } else {
        if (live) live.remove();
        if (!own && input.hasAttribute('aria-invalid')) input.removeAttribute('aria-invalid');
      }
    };
    mirror();
    // El sitio sustituye el widget entero al cambiar de metal o de modo: se observa la sección, que no cambia.
    new MutationObserver(mirror).observe(widget.closest('section') || widget.parentElement, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ['aria-invalid'] });
  }
}

/* 10. Buscador: el título de la pestaña dice qué se ha buscado ---------------- */
if (document.body.dataset.route === '/buscar') {
  const q = (new URLSearchParams(location.search).get('q') || '').trim();
  if (q) document.title = '«' + q.slice(0, 40) + '» · Buscar joyas · ALTER GOLD';
}

/* 11. Ficha en móvil: las miniaturas son la galería ---------------------------
   En pantallas estrechas la tira de fotos se desliza (v8.css §2.1). Aquí se
   cambia lo que hace cada foto al tocarla (ampliar, en vez de «poner en
   grande») y se mantiene el contador. En escritorio todo queda como estaba. */
{
  const strip = document.querySelector('.pdp .gallery-thumbnails');
  if (strip && window.matchMedia) {
    const mq = matchMedia('(max-width: 899px)');
    const slides = [...strip.querySelectorAll('button')];
    const count = document.createElement('p');
    count.className = 'gallery-count';
    count.setAttribute('aria-hidden', 'true');
    strip.after(count);
    const show = i => { count.textContent = (i + 1) + ' / ' + slides.length; };
    const apply = () => {
      slides.forEach((b, i) => {
        if (mq.matches) {
          b.dataset.action = 'zoom';
          b.setAttribute('aria-label', 'Ampliar fotografía ' + (i + 1) + ' de ' + slides.length);
          b.removeAttribute('aria-pressed');
        } else {
          b.dataset.action = 'gallery';
          b.setAttribute('aria-label', 'Ver fotografía ' + (i + 1));
          b.setAttribute('aria-pressed', String(b.classList.contains('active')));
        }
      });
    };
    apply();
    mq.addEventListener('change', apply);
    show(0);
    if ('IntersectionObserver' in window) {
      // Se anota qué fotos están a la vista y se muestra la primera: así el contador
      // no se queda en la última si al cargar todavía cabían todas.
      const seen = new Set();
      const io = new IntersectionObserver(es => {
        for (const e of es) e.isIntersecting ? seen.add(slides.indexOf(e.target)) : seen.delete(slides.indexOf(e.target));
        if (seen.size) show(Math.min(...seen));
      }, { root: strip, threshold: 0.6 });
      slides.forEach(sl => io.observe(sl));
    }
  }
}

/* 12. Compra en móvil: el resumen va plegado -----------------------------------
   El sitio pinta el resumen («Tu selección») antes del formulario. Aquí se
   añade un botón que lo abre y lo cierra, con el importe a la vista. Si este
   módulo no carga, el resumen sigue visible como antes. */
if (document.body.dataset.route === '/checkout') {
  const main = document.getElementById('main');
  const attach = () => {
    const sum = document.getElementById('checkout-summary');
    if (!sum) return;
    let btn = document.getElementById('summary-toggle');
    if (!btn) {
      btn = document.createElement('button');
      btn.type = 'button';
      btn.id = 'summary-toggle';
      btn.className = 'summary-toggle';
      btn.setAttribute('aria-controls', 'checkout-summary');
      btn.setAttribute('aria-expanded', 'false');
      const label = document.createElement('span');
      label.className = 'summary-toggle-label';
      label.textContent = 'Ver tu selección';
      const total = document.createElement('strong');
      total.className = 'summary-toggle-total';
      btn.append(label, total);
      sum.before(btn);
      sum.setAttribute('data-collapsed', '');
      btn.addEventListener('click', () => {
        const open = btn.getAttribute('aria-expanded') !== 'true';
        btn.setAttribute('aria-expanded', String(open));
        sum.toggleAttribute('data-collapsed', !open);
        label.textContent = open ? 'Ocultar tu selección' : 'Ver tu selección';
      });
    }
    const value = sum.querySelector('.data-row span:last-child');
    const out = btn.querySelector('.summary-toggle-total');
    if (value && out.textContent !== value.textContent) out.textContent = value.textContent;
  };
  if (main) {
    attach();
    new MutationObserver(attach).observe(main, { childList: true, subtree: true });
  }
}

/* 13. v9 · Escritorio: tabla de precios plegada -------------------------------
   En la portada la tabla va plegada bajo la calculadora (v9.css). Su botón solo
   se ve a partir de 900 px. */
document.addEventListener('click', e => {
  const price = e.target.closest?.('[data-action="v9-prices"]');
  if (price) {
    const panel = document.getElementById('price-panel');
    if (!panel) return;
    const open = !panel.classList.contains('is-open');
    panel.classList.toggle('is-open', open);
    price.setAttribute('aria-expanded', String(open));
    const label = price.querySelector('.toggle-label');
    if (label) label.textContent = open ? 'Ocultar tabla de precios' : 'Ver tabla de precios';
    return;
  }
});

/* 14. v9 · Botón flotante de WhatsApp en escritorio ---------------------------
   Es un icono. Se retira cuando hay otro acceso a WhatsApp en pantalla (no hacen
   falta dos) y cuando caería sobre un texto. Sobre botones y enlaces ya lo
   retiraba la propia web (is-tucked). En móvil no cambia nada. */
const waBtn = document.querySelector('.wa-float');
if (waBtn && 'IntersectionObserver' in window && typeof document.elementsFromPoint === 'function') {
  const desk = matchMedia('(min-width:900px)');
  const seen = new Set();
  const range = document.createRange();
  const overText = () => {
    const r = waBtn.getBoundingClientRect();
    if (!r.width) return false;
    const done = new Set();
    for (const fx of [0.08, 0.5, 0.92]) {
      for (const fy of [0.1, 0.5, 0.9]) {
        const el = document.elementsFromPoint(r.left + r.width * fx, r.top + r.height * fy).find(n => !waBtn.contains(n));
        if (!el || done.has(el)) continue;
        done.add(el);
        if (el.closest('button,input,select,textarea,summary,a.button,a.text-link')) return true;
        for (const n of el.childNodes) {
          if (n.nodeType !== 3 || n.nodeValue.trim().length < 2) continue;
          range.selectNodeContents(n);
          for (const q of range.getClientRects()) {
            if (q.left < r.right && q.right > r.left && q.top < r.bottom && q.bottom > r.top) return true;
          }
        }
      }
    }
    return false;
  };
  let queued = 0;
  const check = () => {
    queued = 0;
    waBtn.classList.toggle('is-off', desk.matches && (seen.size > 0 || overText()));
  };
  const ask = () => { if (!queued) queued = requestAnimationFrame(check); };
  const io = new IntersectionObserver(entries => {
    for (const e of entries) e.isIntersecting ? seen.add(e.target) : seen.delete(e.target);
    ask();
  });
  const watch = () => {
    for (const a of document.querySelectorAll('a[href*="wa.me"]')) if (a !== waBtn && !a.dataset.waSeen) { a.dataset.waSeen = '1'; io.observe(a); }
  };
  watch();
  const main = document.getElementById('main');
  if (main) new MutationObserver(() => { watch(); ask(); }).observe(main, { childList: true, subtree: true });
  // Los bloques entran con una animación: se vuelve a mirar cuando terminan de colocarse.
  let later = 0;
  const settle = () => { ask(); clearTimeout(later); later = setTimeout(ask, 1100); };
  addEventListener('scroll', settle, { passive: true });
  addEventListener('resize', settle, { passive: true });
  document.addEventListener('animationend', ask, true);
  document.addEventListener('transitionend', ask, true);
  desk.addEventListener?.('change', ask);
  settle();
}

/* ---------- 15 · Ficha del servicio: precio de compra de hoy ---------- */
/* La página trae la cifra ya escrita (tabla de precios del HTML). Cuando el sitio repinta la tabla con la
   cotización en vivo, la ficha copia el precio «hasta 200 g» de la pureza indicada en data-today (y del
   metal de data-metal; si no lo lleva, oro). */
{
  const out = document.querySelector('[data-today]');
  const tables = document.getElementById('price-tables');
  if (out && tables) {
    const sync = () => {
      const cell = tables.querySelector('tr[data-metal="' + (out.dataset.metal || 'gold') + '"][data-purity="' + out.dataset.today + '"] td:nth-child(2)');
      const v = cell ? cell.textContent.trim() : '';
      if (/^\d+(,\d+)?$/.test(v) && out.textContent !== v) out.textContent = v;
    };
    sync();
    new MutationObserver(sync).observe(tables, { childList: true, subtree: true, characterData: true });
  }
}

/* ---------- 16 · v16 · La foto de la pieza viaja de la tarjeta a su ficha ----------
   El navegador anima el paso entre dos páginas cuando en las dos hay un elemento con
   el mismo view-transition-name (v16.css: «ag-piece»). En la ficha lo lleva siempre el
   marco de la foto grande. En los listados, solo la tarjeta que se pulsa: aquí se
   marca. La vuelta (de la ficha a la tarjeta) la prepara el script en línea del <head>,
   que tiene que actuar antes del primer pintado. Sin soporte no pasa nada: la página
   cambia con el fundido de siempre. */
if (anim && window.CSS?.supports?.('view-transition-name', 'none')) {
  const slugOf = url => (/\/producto\/([\w-]+)/.exec(url || '') || [])[1];
  const visible = el => {
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.bottom > 0 && r.top < innerHeight && r.right > 0 && r.left < innerWidth;
  };
  const untag = () => { for (const el of document.querySelectorAll('.product-picture.ag-piece')) el.classList.remove('ag-piece'); };

  document.addEventListener('click', e => {
    if (e.defaultPrevented || e.button || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const a = e.target.closest?.('a[href]');
    if (!a || a.target === '_blank') return;
    untag();
    const pic = a.closest('.product-card')?.querySelector('.product-picture');
    if (!pic || !slugOf(a.href) || !visible(pic)) return;
    pic.classList.add('ag-piece');
    try { sessionStorage.setItem('ag-piece', a.href); } catch { /* sin almacenamiento: solo se pierde la vuelta */ }
  });

  /* Atrás/adelante y navegación sin clic, donde el navegador avisa del destino. */
  addEventListener('pageswap', e => {
    if (!e.viewTransition) return;
    const to = slugOf(e.activation?.entry?.url);
    if (to && !document.querySelector('.product-picture.ag-piece')) {
      const pic = [...document.querySelectorAll('.product-card .product-picture')].find(p => slugOf(p.href) === to && visible(p));
      if (pic) pic.classList.add('ag-piece');
    }
    /* La foto grande de la ficha solo viaja si está a la vista. */
    const big = [...document.querySelectorAll('.gallery-main,.gallery-thumbnails button:first-child')].find(el => el.offsetWidth);
    if (big && !visible(big)) root.classList.add('ag-piece-off');
  });
}

/* ---------- 17 · v16 · Estado al día en páginas precargadas o recuperadas ----------
   El sitio lee la bolsa y los favoritos una vez, al cargar. Una página que el
   navegador tenía preparada de antes (precarga al acercar el ratón, o la que guarda
   al ir atrás) conservaría la lista vieja y, al añadir otra pieza, la escribiría
   encima de la nueva. Si la lista cambió mientras la página esperaba, se recarga. */
{
  const read = () => { try { return ['ag-basket', 'ag-favorites'].map(k => localStorage.getItem(k) || '').join('\u0001'); } catch { return ''; } };
  let seen = read();
  const check = () => { if (read() !== seen) location.reload(); };
  if (document.prerendering) document.addEventListener('prerenderingchange', check, { once: true });
  addEventListener('pagehide', () => { seen = read(); });
  addEventListener('pageshow', e => { if (e.persisted) check(); });
}
