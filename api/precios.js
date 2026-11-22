// /api/precios · cotización del oro y la plata para la web de ALTER GOLD (función de Vercel, Node 18+, CommonJS: no necesita package.json).
//
// La clave de GoldAPI NO va en el código ni llega nunca al navegador: se lee de la variable de entorno GOLDAPI_KEY
// (Vercel → Project → Settings → Environment Variables). La web solo conoce esta dirección, /api/precios/.
//
// POR QUÉ NO SATURA NADA
//   · Los visitantes no preguntan a GoldAPI: preguntan aquí, y la respuesta se guarda en la red de Vercel. Con 1 visita o con
//     100.000, a GoldAPI le llega UNA consulta por intervalo (2 peticiones: oro y plata).
//   · Cuando el intervalo vence, quien entra recibe al instante la última cotización y la nueva se pide por detrás
//     (stale-while-revalidate): nadie espera a GoldAPI.
//   · Si llegan muchas visitas a la vez justo al vencer, comparten una sola consulta (inflight).
//   · Si GoldAPI falla, se sigue sirviendo la última cotización buena con su hora real; la web deja de enseñarla cuando es vieja.
//
// CADA CUÁNTO (plan Pro de GoldAPI, peticiones ilimitadas)
//   · Mercado abierto: cada PRECIOS_TTL_S segundos (por defecto 60).  ≈ 2 × 1.440 = 2.880 peticiones al día como máximo.
//   · Mercado cerrado (fin de semana): cada PRECIOS_TTL_CERRADO_S (por defecto 1.800 = 30 min): el precio no se mueve.
//
// Respuesta: { gold: { spot, change }, silver: { spot, change }, updated, ttl, source }
//   spot = €/g de metal puro (precio por onza troy ÷ 31,1034768) · change = % respecto al cierre anterior (campo «chp»)
//   updated = momento (ISO) en que se consultó a GoldAPI · ttl = segundos hasta la siguiente consulta (la web se acompasa a él)

const OZ = 31.1034768;
const TTL_OPEN = Math.max(15, Number(process.env.PRECIOS_TTL_S) || 60);
const TTL_CLOSED = Math.max(TTL_OPEN, Number(process.env.PRECIOS_TTL_CERRADO_S) || 1800);
const BASE = process.env.GOLDAPI_URL || 'https://www.goldapi.io/api';

// El oro cotiza de domingo por la noche a viernes por la noche (hora de Nueva York). Con margen para el cambio de hora:
// cerrado desde el viernes a las 22:30 UTC hasta el domingo a las 21:30 UTC.
function cerrado(d) {
  const day = d.getUTCDay(), h = d.getUTCHours() + d.getUTCMinutes() / 60;
  return day === 6 || (day === 5 && h >= 22.5) || (day === 0 && h < 21.5);
}

let memo = null;       // última cotización buena de esta instancia: { t, body }
let inflight = null;   // consulta en curso, compartida por las visitas que coinciden

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

async function refresh(key) {
  const [gold, silver] = await Promise.all([metal('XAU', key), metal('XAG', key)]);
  const now = Date.now();
  memo = { t: now, body: { gold, silver, updated: new Date(now).toISOString(), source: 'goldapi.io' } };
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
  const ttl = cerrado(new Date(now)) ? TTL_CLOSED : TTL_OPEN;
  if (!memo || now - memo.t >= ttl * 1000) {
    try {
      inflight = inflight || refresh(key).finally(() => { inflight = null; });
      await inflight;
    } catch (e) {
      console.error('[precios]', e && e.message);
      if (!memo) {   // sin ninguna cotización buena: error breve (30 s en caché, para no insistir a GoldAPI en cada visita)
        res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=30');
        return res.status(502).end(JSON.stringify({ error: 'sin-cotizacion' }));
      }
      // con una cotización anterior, se sirve esa: lleva su hora real y la web decide si aún vale
    }
  }
  res.setHeader('Cache-Control', `public, max-age=${Math.min(30, Math.round(ttl / 2))}, s-maxage=${ttl}, stale-while-revalidate=${ttl * 2}, stale-if-error=${Math.max(600, ttl * 2)}`);
  return res.status(200).end(JSON.stringify({ ...memo.body, ttl }));
};
