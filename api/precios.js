// /api/precios · cotización del oro y la plata para la web de ALTER GOLD (función de Vercel, Node 18+, CommonJS: no necesita package.json).
//
// La clave de GoldAPI NO va en el código ni llega nunca al navegador: se lee de la variable de entorno GOLDAPI_KEY
// (Vercel → Project → Settings → Environment Variables). La web solo conoce esta dirección, /api/precios.
//
// Para no gastar la cuota de GoldAPI, la respuesta se guarda en la red de Vercel: por muchas visitas que haya,
// a GoldAPI solo se le pregunta una vez cada PRECIOS_TTL_S segundos (por defecto 900 = 15 min) y son 2 peticiones
// cada vez (oro y plata). Peticiones al mes ≈ 2 × 2.592.000 / PRECIOS_TTL_S  →  15 min: ~5.760 · 1 h: ~1.440 · 6 h: ~240.
//
// Respuesta: { gold: { spot, change }, silver: { spot, change }, updated, source }
//   spot   = €/g de metal puro (precio por onza troy ÷ 31,1034768)
//   change = variación en % respecto al cierre anterior (campo «chp» de GoldAPI)
//   updated = momento (ISO) en que se consultó a GoldAPI

const OZ = 31.1034768;
const TTL = Math.max(60, Number(process.env.PRECIOS_TTL_S) || 900);
const BASE = process.env.GOLDAPI_URL || 'https://www.goldapi.io/api';

let memo = null;   // última cotización buena de esta instancia: { t, body }

async function metal(symbol, key) {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), 8000);
  try {
    const r = await fetch(`${BASE}/${symbol}/EUR`, { headers: { 'x-access-token': key, 'Content-Type': 'application/json' }, signal: ctl.signal });
    if (!r.ok) throw new Error(`GoldAPI ${symbol}: HTTP ${r.status}`);
    const j = await r.json();
    const ounce = Number(j.price);
    if (!(ounce > 0)) throw new Error(`GoldAPI ${symbol}: respuesta sin precio`);
    const chp = Number(j.chp);
    return { spot: Math.round((ounce / OZ) * 1e4) / 1e4, change: Number.isFinite(chp) ? Math.round(chp * 100) / 100 : 0 };
  } finally {
    clearTimeout(timer);
  }
}

module.exports = async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('X-Robots-Tag', 'noindex');
  const key = process.env.GOLDAPI_KEY;
  if (!key) {
    res.setHeader('Cache-Control', 'no-store');
    return res.status(503).end(JSON.stringify({ error: 'sin-clave' }));
  }
  const now = Date.now();
  if (!memo || now - memo.t >= TTL * 1000) {
    try {
      const [gold, silver] = await Promise.all([metal('XAU', key), metal('XAG', key)]);
      memo = { t: now, body: { gold, silver, updated: new Date(now).toISOString(), source: 'goldapi.io' } };
    } catch (e) {
      console.error('[precios]', e && e.message);
      if (!memo) {   // sin ninguna cotización buena: error breve (1 min en caché, para no insistir a GoldAPI en cada visita)
        res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=60');
        return res.status(502).end(JSON.stringify({ error: 'sin-cotizacion' }));
      }
      // con una cotización anterior, se sirve esa: la web enseña su hora real
    }
  }
  res.setHeader('Cache-Control', `public, max-age=60, s-maxage=${TTL}, stale-while-revalidate=${TTL * 4}, stale-if-error=86400`);
  return res.status(200).end(JSON.stringify(memo.body));
};
