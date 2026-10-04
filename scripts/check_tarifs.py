#!/usr/bin/env python3
"""Vérifie que js/devis.js (estimateur du formulaire) reprend exactement la grille de tarifs.html.
Usage : python3 scripts/check_tarifs.py   (code de sortie 1 en cas d'écart)"""
import re, sys, pathlib

root = pathlib.Path(__file__).resolve().parent.parent
html = (root / 'tarifs.html').read_text(encoding='utf-8')
js = (root / 'js' / 'devis.js').read_text(encoding='utf-8')

def num(s): return int(re.sub(r'\D', '', s))
def unit(s):
    s = s.strip()
    return 'forfait' if s == 'forfait' else s.lstrip('/ ').strip()
def clean(s): return s.replace('&amp;', '&').replace('&nbsp;', ' ').strip()

page = {}
for blk in re.findall(r'<div class="price-cat[^"]*" id="([^"]+)">(.*?)</table>', html, flags=re.S):
    cid, body = blk
    rows = re.findall(r'<tr><td>(.*?)<span class="price-unit">(.*?)</span></td><td class="price-range">(.*?)</td></tr>', body)
    page[cid] = [(clean(n), unit(u), *map(num, re.findall(r'[\d\s  ]+(?=\s*€)', r))) for n, u, r in rows]

form = {}
for cid, body in re.findall(r"\{ id: '([a-z\-]+)', nom: '[^']*',(?: hint: '(?:[^'\\]|\\.)*',)? items: \[(.*?)\n    \]\}", js, flags=re.S):
    form[cid] = [(clean(n), u, int(a), int(b)) for n, u, a, b in re.findall(r"\['([^']+)', '([^']+)', (\d+), (\d+)\]", body)]

bad = 0
if set(page) != set(form):
    print('Catégories différentes :', sorted(set(page) ^ set(form))); bad += 1
for cid in page:
    if page[cid] != form.get(cid):
        print('Écart dans', cid); print('  page   :', page[cid]); print('  devis.js:', form.get(cid)); bad += 1
coef_page = [(n, int(p)) for p, n in re.findall(r'<li><strong>\+&nbsp;(\d+)&nbsp;%</strong><span>(.*?)</span></li>', html)]
coef_js = [(clean(n), int(p)) for n, p in re.findall(r"nom: ['\"](.*?)['\"],\s*pct: (\d+)", js)]
if [(clean(n), p) for n, p in coef_page] != coef_js:
    print('Coefficients différents :', coef_page, coef_js); bad += 1
print('OK : devis.js et tarifs.html concordent (%d catégories).' % len(page) if not bad else '%d écart(s).' % bad)
sys.exit(1 if bad else 0)
