#!/usr/bin/env python3
"""Contrôle qualité SEO/technique de toutes les pages (aucune dépendance).
  python3 scripts/qa.py            affiche le rapport, code 1 s'il y a des erreurs
Vérifie : title (≤60) et description (≤155) uniques, un seul h1, canonical, liens internes
et ancres valides, images présentes avec alt, JSON-LD valide, présence au sitemap."""
import json, pathlib, re, sys, collections, html as H

ROOT = pathlib.Path(__file__).resolve().parent.parent
SKIP = {'plaquette.html', '404.html'}
pages = [p for p in sorted(ROOT.glob('*.html')) if not p.name.startswith(('google', '_'))]
err, warn = [], []
titles, descs = collections.defaultdict(list), collections.defaultdict(list)
inbound = collections.Counter()
ids_by_page = {}
for p in pages:
    ids_by_page[p.stem] = set(re.findall(r'\bid="([^"]+)"', p.read_text(encoding='utf-8')))
sitemap = (ROOT / 'sitemap.xml').read_text(encoding='utf-8')
words = {}
for p in pages:
    h = p.read_text(encoding='utf-8'); n = p.name
    t = re.search(r'<title>(.*?)</title>', h, re.S); d = re.search(r'<meta name="description" content="(.*?)"', h, re.S)
    t = H.unescape(t.group(1)).strip() if t else ''; d = H.unescape(d.group(1)).strip() if d else ''
    if n not in SKIP:
        titles[t].append(n); descs[d].append(n)
        if not t: err.append(f'{n}: title manquant')
        elif len(t) > 60: warn.append(f'{n}: title {len(t)} car. (>60)')
        if not d: err.append(f'{n}: description manquante')
        elif len(d) > 155: warn.append(f'{n}: description {len(d)} car. (>155)')
        elif len(d) < 110: warn.append(f'{n}: description courte ({len(d)})')
        if h.count('<h1') != 1: err.append(f'{n}: {h.count("<h1")} h1')
        if 'rel="canonical"' not in h: err.append(f'{n}: canonical manquant')
        if f'https://benbat.fr/{p.stem if n != "index.html" else ""}</loc>' not in sitemap: warn.append(f'{n}: absent du sitemap')
    for m in re.finditer(r'<script type="application/ld\+json">(.*?)</script>', h, re.S):
        try: json.loads(m.group(1))
        except Exception as e: err.append(f'{n}: JSON-LD invalide ({e})')
    body = h[h.find('<body'):]
    # images
    for m in re.finditer(r'<img\b[^>]*>', body):
        tag = m.group(0); src = re.search(r'\bsrc="([^"]*)"', tag)
        if 'alt=' not in tag: err.append(f'{n}: <img> sans alt ({src.group(1) if src else "?"})')
        if src and src.group(1) and not src.group(1).startswith(('http', 'data:', '/')) and not (ROOT / src.group(1)).exists():
            err.append(f'{n}: image introuvable {src.group(1)}')
        for ss in re.findall(r'images/[\w\-]+\.webp', tag):
            if not (ROOT / ss).exists(): err.append(f'{n}: image srcset introuvable {ss}')
    # liens internes
    for m in re.finditer(r'<a\b[^>]*\bhref="([^"]+)"', body):
        href = m.group(1)
        if href.startswith(('http', 'mailto:', 'tel:', '#', 'javascript')) or href == '/': 
            if href.startswith('#') and len(href) > 1 and href[1:] not in ids_by_page[p.stem]: err.append(f'{n}: ancre {href} introuvable')
            continue
        path, _, frag = href.partition('#'); path = path.split('?')[0].lstrip('/')
        target = path[:-5] if path.endswith('.html') else path
        if target and not (ROOT / f'{target}.html').exists() and not (ROOT / path).exists():
            err.append(f'{n}: lien cassé {href}')
        elif target and (ROOT / f'{target}.html').exists():
            inbound[target] += 1 if target != p.stem else 0
            if frag and frag not in ids_by_page.get(target, set()): err.append(f'{n}: ancre {href} introuvable')
    txt = re.sub(r'<script.*?</script>|<style.*?</style>|<[^>]+>', ' ', body[body.find('id="main-content"'):body.find('<footer')], flags=re.S)
    words[n] = len(txt.split())
for t, v in titles.items():
    if len(v) > 1: err.append(f'title en double : {v}')
for d, v in descs.items():
    if len(v) > 1: err.append(f'description en double : {v}')
for p in pages:
    if p.name not in SKIP and p.stem != 'index' and inbound[p.stem] == 0: warn.append(f'{p.name}: page orpheline (aucun lien interne entrant)')
print('Pages :', len(pages)); print('Mots (hors en-tête/pied) :', ', '.join(f'{k[:-5]}={v}' for k, v in sorted(words.items(), key=lambda x: x[1])))
print('Liens entrants :', ', '.join(f'{k}={v}' for k, v in sorted(inbound.items(), key=lambda x: x[1])[:8]), '…')
for w in warn: print('⚠ ', w)
for e in err: print('✗ ', e)
print(f'{len(err)} erreur(s), {len(warn)} avertissement(s)')
sys.exit(1 if err else 0)
