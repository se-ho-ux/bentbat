# bentbat
Société de BTP w/ Rafik

## Grille tarifaire

Source unique : `tarifs.html`. Après toute modification de prix, lancer `python3 scripts/sync_tarifs.py` (régénère `js/tarifs-data.js`, utilisé par l'estimateur du formulaire de devis), puis commiter les deux fichiers. `--check` vérifie que les données sont à jour.

## Gabarit partagé (en-tête, pied de page, `<head>`)

Les blocs communs sont dans `src/partials/` et repris dans chaque page entre des marqueurs `<!-- @shared:… -->` / `<!-- @end:… -->`. Ne jamais modifier à la main le contenu entre ces marqueurs : modifier le partial, puis lancer `python3 scripts/build.py`. Les numéros de version des CSS/JS (`?v=`) se changent dans `VERSIONS` en tête de `scripts/build.py`. Les liens des colonnes Services/Spécialités du pied de page viennent de `src/data/services.json`.

## Pages de services et de spécialités

Les 14 pages (`renovation-complete`, `salle-de-bain`, `cuisine`, `peinture`, `plomberie`, `electricite`, `carrelage`, `placo-isolation`, `maconnerie`, `revetements-de-sol`, `beton-cire`, `mobilier-sur-mesure`, `vasques-sur-mesure`, `nettoyage-fin-de-chantier`) sont **générées** : ne pas modifier les `.html` à la main.
- Contenu : `content/services/<slug>.json` (textes, étapes, FAQ, photos, liens « voir aussi »).
- Les prix, fourchettes et majorations ne sont jamais écrits dans le contenu : ils viennent de `tarifs.html` via `js/tarifs-data.js` (jetons `{prix:catégorie:n}` et `{coef:id}`).
- Génération : `python3 scripts/build_services.py` (lance aussi `build.py`).
- Nouvelle page : créer le JSON, l'ajouter à `src/data/services.json` (pied de page), lancer `build_services.py` puis `build_sitemap.py`.

## Chaîne de génération (ordre à suivre après une modification)

1. `python3 scripts/sync_tarifs.py` (si la grille de `tarifs.html` change)
2. `python3 scripts/build_services.py` (si un contenu de service change)
3. `python3 scripts/build_sitemap.py` (si une page est ajoutée ou retirée)
4. `python3 scripts/qa.py` : audit SEO/technique (titres, descriptions, h1, liens, images, JSON-LD, sitemap)

Le workflow GitHub « Check Site » rejoue ces contrôles à chaque envoi qui touche ces fichiers.
