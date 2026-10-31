/* Relais des avis Google (Cloudflare Worker) : la clé API reste ici, jamais dans le site.
 *
 * - Appelle Places API (New) « Place Details » à chaque visite qui affiche la section Avis.
 * - Aucune mise en cache ni stockage du contenu Google (interdit par les règles Places) :
 *   la réponse est transmise telle quelle, avec Cache-Control: no-store.
 * - Plafond d'appels par jour (MAX_CALLS_PER_DAY) : au-delà, le relais répond 429 sans appeler
 *   Google, donc sans coût ; le site affiche alors le lien vers la fiche Google.
 * - Origine autorisée uniquement (ALLOWED_ORIGINS).
 *
 * Secret  : GOOGLE_PLACES_API_KEY
 * Variables : PLACE_ID, ALLOWED_ORIGINS, MAX_CALLS_PER_DAY
 * KV      : BUDGET (compteur journalier, ne contient aucune donnée Google)
 */
const FIELDS = [
  'id', 'displayName', 'rating', 'userRatingCount', 'googleMapsUri',
  'reviews.name', 'reviews.rating', 'reviews.text', 'reviews.originalText',
  'reviews.relativePublishTimeDescription', 'reviews.publishTime',
  'reviews.authorAttribution', 'reviews.googleMapsUri', 'reviews.visitDate'
].join(',');

const json = (body, status, origin, extra = {}) => new Response(JSON.stringify(body), {
  status,
  headers: {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    ...(origin ? { 'Access-Control-Allow-Origin': origin, 'Vary': 'Origin' } : {}),
    ...extra
  }
});

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') || '';
    const allowed = (env.ALLOWED_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean);
    const ok = allowed.includes(origin);

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: ok ? 204 : 403, headers: ok ? {
        'Access-Control-Allow-Origin': origin, 'Access-Control-Allow-Methods': 'GET', 'Vary': 'Origin'
      } : {} });
    }
    if (request.method !== 'GET') return json({ error: 'method' }, 405, null);
    if (!ok) return json({ error: 'origin' }, 403, null);
    if (!env.GOOGLE_PLACES_API_KEY || !env.PLACE_ID) return json({ error: 'config' }, 503, origin);

    // Plafond journalier : protège la facture même si l'URL du relais est appelée en boucle
    const max = parseInt(env.MAX_CALLS_PER_DAY || '30', 10);
    const key = new Date().toISOString().slice(0, 10);
    const used = parseInt((await env.BUDGET.get(key)) || '0', 10);
    if (used >= max) return json({ error: 'quota' }, 429, origin);
    await env.BUDGET.put(key, String(used + 1), { expirationTtl: 172800 });

    let res;
    try {
      res = await fetch(`https://places.googleapis.com/v1/places/${encodeURIComponent(env.PLACE_ID)}?languageCode=fr`, {
        headers: { 'X-Goog-Api-Key': env.GOOGLE_PLACES_API_KEY, 'X-Goog-FieldMask': FIELDS }
      });
    } catch (e) {
      return json({ error: 'upstream' }, 502, origin);
    }
    if (!res.ok) return json({ error: 'upstream', status: res.status }, 502, origin);
    return new Response(res.body, {
      status: 200,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'no-store',
        'Access-Control-Allow-Origin': origin,
        'Vary': 'Origin'
      }
    });
  }
};
