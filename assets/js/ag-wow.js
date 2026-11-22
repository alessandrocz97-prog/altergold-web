// ALTER GOLD · versión aparte («wow») · solo se carga en la portada de site-wow/
//  1 · Película de apertura: un vídeo corto, mudo y en bucle encima de la foto de entrada.
//  2 · «Así se tasa tu oro»: una secuencia de fotogramas que avanza con el desplazamiento.
// Nada de esto se activa con «reducir movimiento», con ahorro de datos o en conexiones 2G:
// ahí la portada se queda como está y la secuencia son cuatro pasos con su foto.
const d = document, root = d.documentElement;
window.__agWow = { v: 3 };
const rm = matchMedia('(prefers-reduced-motion: reduce)');
const conn = navigator.connection || {};
const lite = !!conn.saveData || /2g$/.test(conn.effectiveType || '');
const asset = name => new URL('../wow/' + name, import.meta.url).href;
// Cargada y a la vista: una página que el navegador prepara por adelantado no descarga nada hasta que se muestra.
const loaded = Promise.all([
  new Promise(r => (d.readyState === 'complete' ? r() : addEventListener('load', r, { once: true }))),
  new Promise(r => (d.prerendering ? d.addEventListener('prerenderingchange', r, { once: true }) : r())),
]);
const idle = fn => ('requestIdleCallback' in window ? requestIdleCallback(fn, { timeout: 2000 }) : setTimeout(fn, 400));
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

/* ---------- 0 · Portada en un móvil en vertical: cada diapositiva usa su foto vertical ---------- */
// La 1 ya tiene su película vertical. Se cambia la dirección antes de que el carrusel pida la foto.
if (matchMedia('(max-width: 767px) and (orientation: portrait)').matches) {
  for (const img of d.querySelectorAll('.hero--home img[data-src-p]')) {
    if (!img.dataset.src) continue;
    img.dataset.src = img.dataset.srcP;
    delete img.dataset.srcset;
    const media = img.closest('.hero-media');
    if (media && img.dataset.focusP) media.style.setProperty('--focus', img.dataset.focusP);
  }
}

/* ---------- 1 · Película de apertura ---------- */
function heroFilm() {
  const hero = d.querySelector('.hero--home');
  const slide = hero && hero.querySelector('.slide');
  const media = slide && slide.querySelector('.hero-media');
  const img = media && media.querySelector('img');
  if (!img) return;
  const tall = matchMedia('(max-width: 1023px) and (orientation: portrait)').matches;
  // Foto fija del final (el lingote terminado): lo que se ve sin película y lo que queda cuando la película acaba.
  const still = () => {
    const s = (tall && img.dataset.finalP) || img.dataset.final;
    if (!s || img.dataset.still) return Promise.resolve();
    img.dataset.still = '1';
    for (const x of media.querySelectorAll('source')) x.remove();
    img.removeAttribute('srcset'); img.removeAttribute('sizes');
    img.src = s.startsWith('data:') ? s : new URL('../' + s, import.meta.url).href;
    return img.decode ? img.decode().catch(() => {}) : Promise.resolve();
  };
  if (rm.matches || lite || !('IntersectionObserver' in window)) { still(); return; }
  let off = false;
  try { off = localStorage.getItem('ag-film') === 'off'; } catch { /* sin almacenamiento */ }
  if (off) still();   // quien la dejó pausada ve el lingote terminado y el botón de reproducir

  // En un móvil en vertical va un recorte vertical que sigue a la balanza; en el resto, el plano entero.
  const v = d.createElement('video');
  v.className = 'hero-film';
  v.muted = true; v.loop = false; v.playsInline = true;
  v.setAttribute('muted', ''); v.setAttribute('playsinline', ''); v.setAttribute('aria-hidden', 'true');
  v.preload = 'auto'; v.tabIndex = -1; v.disablePictureInPicture = true;
  const place = () => { v.style.objectPosition = getComputedStyle(img).objectPosition; };
  place();
  addEventListener('resize', place, { passive: true });
  // La película se enseña cuando su primer fotograma ya está pintado, y de golpe (mej.css): ese fotograma es la foto de entrada,
  // así que el movimiento continúa la foto sin fundido ni imagen doble. Solo si debajo está el lingote terminado
  // (volver a verla, o arrancar una película que estaba pausada) entra con un fundido corto.
  const show = () => { v.classList.toggle('is-fade', !!img.dataset.still); v.classList.add('is-on'); };
  const arm = () => { if (v.requestVideoFrameCallback) v.requestVideoFrameCallback(show); else v.addEventListener('playing', show, { once: true }); };
  arm();
  let done = false, dwellMs = 0;
  const HOLD = 2600;   // lo que el lingote terminado se queda a la vista antes de que el carrusel del móvil siga
  // En el móvil las diapositivas pasan solas: la primera espera a que la película termine (window.__agFilmMs lo lee el carrusel).
  const dwell = ms => {
    if (ms === dwellMs) return;
    dwellMs = ms; window.__agFilmMs = ms;
    if (slide.classList.contains('is-active')) d.dispatchEvent(new Event('visibilitychange'));
  };
  v.addEventListener('playing', () => { if (isFinite(v.duration)) dwell(Math.round((v.duration - v.currentTime) * 1000) + HOLD); });
  v.addEventListener('ended', () => {
    done = true; paint();
    // el último fotograma se queda: debajo entra esa misma imagen como foto (más nítida que el vídeo) y el vídeo se retira
    // (y sale de la página: el carrusel pone en marcha cualquier vídeo de la diapositiva activa, y esta película ya no se repite sola)
    still().then(() => { if (!done) return; v.classList.remove('is-on'); setTimeout(() => { if (done) v.remove(); }, 1600); });
  });
  media.append(v);

  // Un vídeo que arranca solo tiene que poder pararse (WCAG 2.2.2). La elección se recuerda.
  const ICON = {
    pause: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4 2.5h3v11H4zM9 2.5h3v11H9z"/></svg>',
    play: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4.5 2.2v11.6L13.5 8z"/></svg>',
  };
  const btn = d.createElement('button');
  btn.type = 'button';
  btn.className = 'film-toggle';
  const paint = () => {
    btn.innerHTML = off || done ? ICON.play : ICON.pause;
    btn.setAttribute('aria-label', done ? 'Ver el vídeo otra vez' : off ? 'Reproducir el vídeo de fondo' : 'Pausar el vídeo de fondo');
  };
  paint();
  hero.append(btn);

  let seen = false, started = false, pending = null;
  const sync = () => {
    const on = !off && !done && seen && !d.hidden && !rm.matches && slide.classList.contains('is-active');
    if (!on) {
      v.pause();
      if (off || done || rm.matches) dwell(0);
      return;
    }
    if (!started) {
      started = true;
      // AV1: misma imagen (o mejor) con un 40 % menos de peso. Solo donde el equipo lo descodifica con soltura y por hardware; si no, H.264.
      const base = tall ? 'colada-p' : 'colada-l';
      const av1 = () => { try { return navigator.mediaCapabilities.decodingInfo({ type: 'file', video: { contentType: 'video/mp4; codecs=\"av01.0.08M.08\"', width: tall ? 720 : 1600, height: tall ? 1558 : 900, bitrate: tall ? 4e5 : 9e5, framerate: 30 } }).then(r => !!(r.supported && r.smooth && r.powerEfficient), () => false); } catch { return Promise.resolve(false); } };
      pending = av1().then(ok => {
        pending = null;
        v.src = asset(base + (ok ? '.av1.mp4' : '.mp4'));
        if (ok) v.addEventListener('error', () => { if (v.currentSrc.includes('.av1.')) { v.src = asset(base + '.mp4'); sync(); } }, { once: true });
        sync();
      });
      return;
    }
    if (pending) return;
    const p = v.play();
    // si el navegador no deja arrancar sola la película (ahorro de batería), queda el lingote terminado y el botón de reproducir
    if (p) p.catch(e => { if (e && e.name === 'NotAllowedError' && !v.classList.contains('is-on')) { off = true; paint(); still(); dwell(0); } });
  };
  btn.addEventListener('click', () => {
    if (done) {   // verla otra vez, desde la colada
      done = false; off = false;
      if (!v.isConnected) media.append(v);
      try { v.currentTime = 0; } catch { /* aún sin datos */ }
      arm();
    } else off = !off;
    try { localStorage.setItem('ag-film', off ? 'off' : 'on'); } catch { /* sin almacenamiento */ }
    paint();
    sync();
  });
  new IntersectionObserver(e => { seen = e[e.length - 1].isIntersecting; sync(); }, { threshold: 0.15 }).observe(media);
  new MutationObserver(sync).observe(slide, { attributes: true, attributeFilter: ['class'] });
  d.addEventListener('visibilitychange', sync);
  rm.addEventListener('change', () => { if (rm.matches) { v.classList.remove('is-on'); still(); } sync(); });
}

loaded.then(() => idle(heroFilm));
