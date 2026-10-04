# bentbat
Société de BTP w/ Rafik

## Grille tarifaire

Source unique : `tarifs.html`. Après toute modification de prix, lancer `python3 scripts/sync_tarifs.py` (régénère `js/tarifs-data.js`, utilisé par l'estimateur du formulaire de devis), puis commiter les deux fichiers. `--check` vérifie que les données sont à jour.

## Gabarit partagé (en-tête, pied de page, `<head>`)

Les blocs communs sont dans `src/partials/` et repris dans chaque page entre des marqueurs `<!-- @shared:… -->` / `<!-- @end:… -->`. Ne jamais modifier à la main le contenu entre ces marqueurs : modifier le partial, puis lancer `python3 scripts/build.py`. Les numéros de version des CSS/JS (`?v=`) se changent dans `VERSIONS` en tête de `scripts/build.py`. Les liens des colonnes Services/Spécialités du pied de page viennent de `src/data/services.json`.
