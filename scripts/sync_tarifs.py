#!/usr/bin/env python3
"""Source unique des prix : tarifs.html.
Génère js/tarifs-data.js (utilisé par l'estimateur du formulaire, js/devis.js).

  python3 scripts/sync_tarifs.py          régénère js/tarifs-data.js
  python3 scripts/sync_tarifs.py --check  vérifie qu'il est à jour (code 1 sinon)

À lancer après toute modification de la grille dans tarifs.html."""
import json, re, sys, pathlib

root = pathlib.Path(__file__).resolve().parent.parent
html = (root / 'tarifs.html').read_text(encoding='utf-8')
out = root / 'js' / 'tarifs-data.js'

# Avertissements affichés dans le formulaire (non présents dans la grille)
HINTS = {
    'renovation': "La rénovation complète inclut déjà les corps de métier : inutile de les ajouter en plus.",
    'cuisine': "La cuisine complète inclut déjà la pose, le plan de travail et l’îlot : ne cochez qu’une des deux options.",
    'salle-de-bain': "La salle de bain complète inclut déjà douche, baignoire et meuble : ne cochez qu’une des deux options.",
}

def clean(s): return s.replace('&amp;', '&').replace('&nbsp;', ' ').strip()
def euros(s): return [int(re.sub(r'\D', '', x)) for x in re.findall(r'[\d\s  ]+(?=\s*€)', s)]

cats = []
for cid, body in re.findall(r'<div class="price-cat[^"]*" id="([^"]+)">(.*?)</table>', html, flags=re.S):
    nom = clean(re.search(r'<h3>(.*?)</h3>', body).group(1))
    items = []
    for n, u, r in re.findall(r'<tr><td>(.*?)<span class="price-unit">(.*?)</span></td><td class="price-range">(.*?)</td></tr>', body):
        lo, hi = euros(r)
        u = clean(u); u = 'forfait' if u == 'forfait' else u.lstrip('/ ').strip()
        items.append([clean(n), u, lo, hi])
    cat = {'id': cid, 'nom': nom, 'items': items}
    if cid in HINTS: cat['hint'] = HINTS[cid]
    cats.append(cat)

coefs = [{'id': i, 'nom': clean(n), 'pct': int(p)} for i, (p, n) in zip(
    ['depose', 'acces', 'support', 'premium'],
    re.findall(r'<li><strong>\+&nbsp;(\d+)&nbsp;%</strong><span>(.*?)</span></li>', html))]

assert len(cats) == 11 and len(coefs) == 4, (len(cats), len(coefs))
text = ("/* GÉNÉRÉ depuis tarifs.html par scripts/sync_tarifs.py — ne pas modifier à la main. */\n"
        "window.BENBAT_TARIFS = " + json.dumps({'tarifs': cats, 'coefs': coefs}, ensure_ascii=False, indent=1) + ";\n")

if '--check' in sys.argv:
    ok = out.exists() and out.read_text(encoding='utf-8') == text
    print('OK : js/tarifs-data.js est à jour.' if ok else 'js/tarifs-data.js est obsolète : lancez python3 scripts/sync_tarifs.py')
    sys.exit(0 if ok else 1)
out.write_text(text, encoding='utf-8')
print('js/tarifs-data.js généré (%d catégories, %d prestations).' % (len(cats), sum(len(c['items']) for c in cats)))
