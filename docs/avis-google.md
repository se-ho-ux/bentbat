# Avis Google sur le site

## Principe retenu

- **Source** : Google Places API (New), `GET places/{PLACE_ID}` (SKU « Place Details Enterprise + Atmosphere »). Google renvoie au plus **5 avis**, choisis par sa pertinence : ils ne sont pas forcément les plus récents, et la page l'indique.
- **Aucune copie** : les règles Places interdisent de pré-charger, mettre en cache ou stocker le contenu (seul le Place ID peut être conservé). L'ancien mécanisme (workflow quotidien qui écrivait `reviews.json` dans le dépôt public) a donc été supprimé.
- **Lecture à l'affichage** : `js/reviews.js` appelle un relais (`workers/avis-google/worker.js`, Cloudflare Worker) uniquement quand le visiteur atteint la section Avis. Le relais garde la clé API (jamais dans le site ni dans Git), vérifie l'origine, **plafonne le nombre d'appels par jour** et ne met rien en cache (`Cache-Control: no-store`).
- **Si Google ne répond pas** (quota, panne) : la section affiche un lien vers la fiche Google, jamais de témoignage de remplacement.
- **Affichage conforme** : avatar, nom et lien du profil de l'auteur, note, texte tel quel, mention « Traduit … par Google », date de publication et mois de visite (obligatoire pour la France), lien vers l'avis sur Google, lien « Voir tous les avis », mention de l'ordre de sélection.
- **Pas de balisage d'avis** : le `aggregateRating` écrit à la main dans le JSON-LD de l'entreprise a été retiré (avis auto-promotionnels non éligibles aux résultats enrichis, et chiffre figé).

## Coût

| Élément | Valeur |
|---|---|
| SKU | Places API Place Details Enterprise + Atmosphere |
| Tarif (grille Google, vérifié le 31/10/2026) | 25,00 $ / 1 000 appels, **1 000 appels gratuits par mois** |
| Plafond du relais | `MAX_CALLS_PER_DAY = 30` → 930 appels max par mois, donc **0 €** si le plafond tient |
| Hébergement du relais | Cloudflare Workers, offre gratuite (100 000 requêtes/jour) |

Un appel = une visite qui atteint la section Avis. Au-delà de 30 visites par jour, la section affiche le lien vers Google. Pour afficher davantage, augmenter `MAX_CALLS_PER_DAY` : chaque tranche de 1 000 appels au-delà du gratuit coûte environ 25 $.

**Quotas et alertes Google Cloud** : une alerte de budget ne bloque rien, elle prévient seulement. Le vrai plafond est le quota : *APIs et services → Places API (New) → Quotas → « Place Details Enterprise + Atmosphere requests per day »* : fixer 35.

## Mise en route (actions à faire par vous)

1. **Google Cloud** (projet `BenBat-Google-Reviews`) : activer *Places API (New)* ; rattacher un compte de facturation (obligatoire, carte bancaire) ; créer le budget et l'alerte (Facturation → Budgets et alertes, par exemple 5 €).
2. **Clé API** : *APIs et services → Identifiants → Créer → Clé API*. Restriction d'API : **Places API (New) uniquement**. Pas de restriction d'application (le relais n'a pas d'adresse IP fixe). Ne copiez jamais la clé dans une conversation ni dans Git.
3. **Place ID** : depuis votre terminal, sans coller la clé nulle part :
   ```
   export GOOGLE_PLACES_API_KEY='…'   # saisie locale, non enregistrée
   curl -s -X POST 'https://places.googleapis.com/v1/places:searchText' \
     -H 'Content-Type: application/json' -H "X-Goog-Api-Key: $GOOGLE_PLACES_API_KEY" \
     -H 'X-Goog-FieldMask: places.id,places.displayName,places.formattedAddress,places.websiteUri' \
     -d '{"textQuery":"Ben&Bat rénovation Paris","languageCode":"fr"}'
   ```
   Vérifier que le nom, l'adresse et le site (`benbat.fr`) correspondent. **La fiche est actuellement « Validation requise » : elle peut ne pas apparaître ou ne pas avoir d'avis publics tant qu'elle n'est pas validée.**
4. **Relais** (compte Cloudflare gratuit) : dans `workers/avis-google/`, `npx wrangler kv namespace create BUDGET` (reporter l'id dans `wrangler.toml`), renseigner `PLACE_ID`, `npx wrangler secret put GOOGLE_PLACES_API_KEY`, puis `npx wrangler deploy`. Noter l'adresse obtenue (`https://benbat-avis-google.<compte>.workers.dev`).
5. **Site** (à faire ensuite par Claude Code) : renseigner `ENDPOINT` dans `js/reviews.js`, ajouter l'adresse du relais à `connect-src` dans `src/partials/head-meta.html`, retirer du HTML les témoignages écrits à la main (voir ci-dessous), monter `VERSIONS['reviews']`, lancer `python3 scripts/build.py` et `scripts/qa.py`.

## Témoignages écrits à la main

`index.html` et `a-propos.html` contiennent trois témoignages statiques (Marie Rousseau, Thomas Mercier, Sophie Laurent), ainsi qu'une note « 4,9 · 11 avis ». Tant que le relais n'est pas branché, ils restent affichés. À la mise en service ils sont remplacés par les avis Google réels, ou par le lien vers la fiche si Google ne répond pas. S'ils ne correspondent pas à de vrais clients, les retirer plus tôt.

## Maintenance

- Fraîcheur : les avis sont lus à chaque affichage, il n'y a rien à actualiser.
- Surveiller dans Google Cloud (*APIs et services → Métriques*) le nombre d'appels Place Details.
- Rotation de la clé : créer une nouvelle clé, `wrangler secret put`, supprimer l'ancienne.
