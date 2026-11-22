import{a as C,b as M}from"./chunks/chunk-RJLEZ6RY.js";import{g}from"./chunks/chunk-4RCFITCI.js";import{a as l,b as A,f as v,g as b,h as D,j as R,k as V}from"./chunks/chunk-NBDGZCLN.js";import"./chunks/chunk-FV2YYIUL.js";import"./chunks/chunk-MDHP6J5K.js";import{j as E,r as k,v as p,w as T,x,y as S}from"./chunks/chunk-COUUK5KH.js";/* ===== mej · cotización real =====
   La cotización viene de /api/precios/ (función de servidor que consulta GoldAPI con la clave guardada en Vercel).
   La página NUNCA espera a esta consulta: se pinta entera y el precio llega aparte, en una respuesta mínima que sirve la red de Vercel.
   Mientras la pestaña está a la vista se vuelve a pedir al ritmo que marca el servidor (cada minuto con el mercado abierto);
   con la pestaña oculta no se pide nada, y si falla se espacian los reintentos (1, 2, 4… hasta 10 min).
   Sin cotización real y reciente no se enseña ninguna cifra: «Estamos actualizando la cotización» / «No podemos consultarla».
   En la vista previa (artefacto, sin servidor) se usa un precio de muestra y se dice que lo es. */
const AGQ = (() => {
  const KEY = 'ag-cotizacion', PREVIEW = false /*@@PREVIEW@@*/, MAX_AGE = 90 * 60e3, URL_ = '/api/precios/';
  const ok = s => s && s.gold && s.gold.spot > 0 && s.silver && s.silver.spot > 0 && !isNaN(Date.parse(s.updated));
  const age = () => (q ? Date.now() - Date.parse(q.updated) : Infinity);
  const fresh = () => age() < MAX_AGE;   // una cotización de hace más de hora y media ya no se enseña como precio
  let q = null, failed = false, busy = null;
  try { const s = JSON.parse(localStorage.getItem(KEY) || 'null'); if (ok(s)) q = s; } catch { /* sin almacenamiento */ }
  const shape = s => ({ gold: { spot: s.gold.spot, change: s.gold.change || 0 }, silver: { spot: s.silver.spot, change: s.silver.change || 0 }, updated: new Date(s.updated) });
  const hm = new Intl.DateTimeFormat('es-ES', { hour: '2-digit', minute: '2-digit' }), dm = new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'numeric' });
  globalThis.__agCuando = d => { const n = new Date(); return d.toDateString() === n.toDateString() ? 'Actualizado a las ' + hm.format(d) : 'Actualizado el ' + dm.format(d) + ' a las ' + hm.format(d); };
  const api = {
    preview: PREVIEW,
    get: sim => (fresh() ? shape(q) : PREVIEW ? { ...sim(), sample: true } : null),
    status: () => (fresh() || PREVIEW ? 'valid' : failed ? 'unavailable' : 'stale'),
    age,
    reset() { failed = false; },
    // Devuelve true si hay algo nuevo que pintar (cotización distinta, o un fallo que cambia el estado).
    load() {
      if (PREVIEW) return Promise.resolve(false);
      const antes = api.status();
      return busy || (busy = fetch(URL_, { headers: { accept: 'application/json' } })
        .then(r => { if (!r.ok) throw new Error(r.status); return r.json(); })
        .then(s => { if (!ok(s)) throw new Error('forma'); const nuevo = !q || s.updated !== q.updated; q = s; failed = false; try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* sin almacenamiento */ } return nuevo || api.status() !== antes; })
        .catch(() => { failed = true; return api.status() !== antes; })
        .finally(() => { busy = null; }));
    },
    // Refresco automático: solo con la pestaña a la vista, al ritmo del servidor, y espaciando si falla.
    auto(render) {
      if (PREVIEW) return;
      let timer = 0, wait = 60e3, last = 0;
      const tick = () => {
        clearTimeout(timer);
        if (document.hidden) return;
        last = Date.now();
        api.load().then(ch => {
          wait = failed ? Math.min(wait * 2, 600e3) : Math.max(30e3, Math.min(q && q.ttl > 0 ? q.ttl : 60, 300) * 1e3);
          if (ch) render();
          clearTimeout(timer); timer = setTimeout(tick, wait);
        });
      };
      // al volver a la pestaña se pide enseguida, salvo que se acabe de pedir (otros scripts lanzan este mismo aviso)
      document.addEventListener('visibilitychange', () => { if (document.hidden) clearTimeout(timer); else if (Date.now() - last > 15e3) tick(); else if (!timer) timer = setTimeout(tick, wait); });
      tick();
    },
  };
  return api;
})();

const agLoad=()=>AGQ.load().then(ch=>{ch&&y()});
var O="a,button,input,select,textarea,summary,label,[role=button],.card-buy,dialog[open]",z=(t,o)=>!!(t&&t!==o&&t.matches?.('input,textarea,select,[contenteditable="true"]'));function P(t,o=0){let e=t?.closest?.(O);if(!e)return!1;if(o&&e.matches("a,[role=button]")&&!e.matches(".button,.cta,.text-link")&&!e.closest(".card-buy")){let r=e.getBoundingClientRect();if(r.width*r.height>4*o)return!1}return!0}function I(){let t=document.querySelector(".wa-float");if(!t||typeof document.elementsFromPoint!="function")return;let o=(n,u)=>{let d=Math.ceil((u-n)/12)+1;return Array.from({length:d},(h,m)=>n+(u-n)*m/(d-1))},e=()=>{let n=t.getBoundingClientRect();if(!n.width)return!1;let u=n.left+1,d=n.top+1,h=n.right-2,m=n.bottom-2,B=(u+h)/2,F=(d+m)/2,H=n.width*n.height;for(let[w,q]of[...o(u,h).flatMap(c=>[[c,d],[c,F],[c,m]]),...o(d,m).flatMap(c=>[[u,c],[B,c],[h,c]])])if(!(w<0||q<0||w>=innerWidth||q>=innerHeight)&&P(document.elementsFromPoint(w,q).find(c=>!t.contains(c)),H))return!0;return!1},r=()=>{i=!1,s=performance.now(),t.classList.toggle("is-tucked",document.activeElement!==t&&(z(document.activeElement,t)||e()))},i=!1,s=0,a=()=>{i||(i=!0,setTimeout(()=>requestAnimationFrame(r),Math.max(0,50-(performance.now()-s))))};for(let n of["scroll","resize"])addEventListener(n,a,{passive:!0});visualViewport?.addEventListener("resize",a),visualViewport?.addEventListener("scroll",a);for(let n of["focusin","focusout","toggle","click","input"])document.addEventListener(n,a,!0);new MutationObserver(a).observe(document.body,{childList:!0,subtree:!0,attributes:!0,attributeFilter:["hidden","open","class"]}),typeof ResizeObserver=="function"&&new ResizeObserver(a).observe(document.body),document.fonts?.ready?.then(a),addEventListener("load",a,{once:!0}),a()}var f=t=>document.querySelector(t),W=[()=>f("#calculator-widget,#rate-table,#price-panel")&&import("./chunks/calculator-BCCF6THV.js"),()=>f("[data-slider],[data-rotator],[data-shop-rail],.rail")&&import("./chunks/home-4PM2QX7R.js"),()=>f(".statement blockquote")&&import("./chunks/statements-5HQVMDHD.js"),()=>f("#contact-form")&&import("./chunks/forms-5E3HIUBD.js"),()=>f(".plp-layout")&&import("./chunks/shop-IFSPCIIJ.js"),()=>f(".pdp")&&import("./chunks/product-PNWEDOCX.js"),()=>["/carrito","/checkout","/favoritos","/buscar","/confirmacion","/propuesta"].includes(T().path)&&import("./chunks/pages-YJCCWCN7.js"),()=>(p.cart.length||p.favorites.length)&&import("./chunks/cart-XFV47MZT.js")];function y(){let agq=AGQ.get(E),agst=AGQ.status();p.quote=agq||{gold:{spot:0,change:0},silver:{spot:0,change:0},updated:new Date};(agst!=="valid"||p.calculator.status==="stale"||p.calculator.status==="unavailable")&&(p.calculator.status=agst);document.documentElement.classList.toggle("ag-q",agst!=="stale"),document.querySelectorAll("[data-quote]").forEach(t=>{t.outerHTML=C(t.dataset.quote,t.classList.contains("quote--panel")?"quote--panel":"")}),document.querySelectorAll(".ticker-time").forEach(t=>{t.outerHTML=M()}),document.dispatchEvent(new CustomEvent("quote:update"))}var _=()=>l("site-header")?.classList.toggle("is-scrolled",window.scrollY>24);async function $(t){let o=t.target.closest("[data-scroll]"),e=o&&l(o.dataset.scroll);if(e){t.preventDefault(),e.scrollIntoView({behavior:S()?"auto":"smooth"}),e.focus({preventScroll:!0});return}let r=t.target.closest("[data-action]");if(!r)return;let i=r.dataset.action;if(i==="close"&&b(),i==="menu"){let{menuDrawer:s}=await import("./chunks/parts-VB3BZV3F.js");v("Men\xFA",s(),"drawer left menu-dialog");let a=r.dataset.section&&l("overlay").querySelector(`[data-group="${r.dataset.section}"]`);a&&(a.open=!0)}if(i==="search"){let{searchDialog:s}=await import("./chunks/cart-XFV47MZT.js");s()}if(["bag","add","remove","favorite","clear-local"].includes(i)){let{handle:s}=await import("./chunks/cart-XFV47MZT.js");await s(i,r)}i==="forgot"&&v("Recupera tu acceso",`<div class="flow">${g("account")}<button class="button secondary full" data-action="close">Volver</button></div>`)}function Y(t){let o=t.target;if(["search-form","page-search","contact-form","account-form"].includes(o.id)){if(t.preventDefault(),!o.checkValidity()){o.reportValidity();return}if(o.id==="search-form"||o.id==="page-search"){let e=new FormData(o).get("q").trim();l("overlay").open&&b(),A("/buscar?q="+encodeURIComponent(e))}if(o.id==="contact-form"){let e=o.querySelector("[data-feedback]");e&&(e.innerHTML=g(o.dataset.kind==="cita"?"appointment":"message"))}o.id==="account-form"&&v("Acceso a tu cuenta",`<div class="flow">${g("account")}<a href="#/tienda" class="button secondary full">Comprar como invitado</a></div>`)}}function U(t){let o=t.currentTarget;if(t.target!==o)return;let e=o.getBoundingClientRect();(t.clientX<e.left||t.clientX>e.right||t.clientY<e.top||t.clientY>e.bottom)&&b()}var L;async function X(){if(location.hash.startsWith("#/")){location.replace(k(location.hash.slice(1)));return}x(location.pathname,location.search);let t=V.get("ag-calc-status");if(t&&(p.calculator.status=t),D(),R(),_(),I(),document.addEventListener("click",$),document.addEventListener("submit",Y),l("overlay")?.addEventListener("click",U),document.addEventListener("quote:refresh",y),document.addEventListener("quote:refresh",()=>{AGQ.preview||(AGQ.reset(),y(),agLoad())}),window.addEventListener("ag:analytics-consent",e=>{typeof e.detail?.send=="function"&&import("./chunks/analytics-DPRXZQ5D.js").then(r=>r.connect(e.detail.send))}),window.addEventListener("scroll",_,{passive:!0}),y(),AGQ.auto(y),clearTimeout(L),L=setTimeout(()=>{y(),setInterval(y,6e4).unref?.()},6e4-Date.now()%6e4),L.unref?.(),location.hash.length>1&&!location.hash.includes("="))try{l(decodeURIComponent(location.hash.slice(1)))?.scrollIntoView()}catch{}let o=await Promise.all(W.map(e=>e()||null));for(let e of o)await e?.init?.()}globalThis.__AG_TEST__||X();export{X as init,y as refreshLive};
