#!/usr/bin/env python3
"""Génère sitemap.xml à partir des pages du dépôt.
  python3 scripts/build_sitemap.py          écrit sitemap.xml
  python3 scripts/build_sitemap.py --check  vérifie que l'ensemble des URL est à jour (dates ignorées)
lastmod = date du dernier commit touchant la page (aujourd'hui si elle est modifiée ou pas encore commitée)."""
import datetime, pathlib, re, subprocess, sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
EXCLUDE = {'404.html', 'plaquette.html'}
# (changefreq, priority) ; défaut selon le type de page
FIXED = {'index': ('weekly', '1.0'), 'services': ('monthly', '0.9'), 'tarifs': ('monthly', '0.9'), 'realisations': ('monthly', '0.8'),
         'contact': ('yearly', '0.8'), 'a-propos': ('yearly', '0.6'), 'garanties': ('yearly', '0.6'), 'mentions-legales': ('yearly', '0.2')}
DEFAULT = ('monthly', '0.8')
ORDER = ['index', 'services', 'tarifs', 'realisations']


def lastmod(p):
    today = datetime.date.today().isoformat()
    try:
        if subprocess.run(['git', 'status', '--porcelain', '--', p.name], cwd=ROOT, capture_output=True, text=True).stdout.strip():
            return today  # modifiée et pas encore commitée
        out = subprocess.run(['git', 'log', '-1', '--format=%cs', '--', p.name], cwd=ROOT, capture_output=True, text=True).stdout.strip()
    except Exception:
        out = ''
    return out or today


def build():
    pages = [p for p in ROOT.glob('*.html') if not p.name.startswith('google') and p.name not in EXCLUDE]
    pages.sort(key=lambda p: (ORDER.index(p.stem) if p.stem in ORDER else 99, p.stem))
    rows = []
    for p in pages:
        loc = 'https://benbat.fr/' + ('' if p.stem == 'index' else p.stem)
        cf, pr = FIXED.get(p.stem, DEFAULT)
        rows.append(f'  <url>\n    <loc>{loc}</loc>\n    <lastmod>{lastmod(p)}</lastmod>\n    <changefreq>{cf}</changefreq>\n    <priority>{pr}</priority>\n  </url>\n')
    return '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n\n' + '\n'.join(rows) + '\n</urlset>\n'


if __name__ == '__main__':
    new = build(); out = ROOT / 'sitemap.xml'
    if '--check' in sys.argv:
        locs = lambda s: sorted(re.findall(r'<loc>(.*?)</loc>', s))
        ok = out.exists() and locs(out.read_text(encoding='utf-8')) == locs(new)
        print('OK : sitemap à jour.' if ok else 'sitemap.xml obsolète : lancer python3 scripts/build_sitemap.py')
        sys.exit(0 if ok else 1)
    out.write_text(new, encoding='utf-8'); print('sitemap.xml écrit (%d URL).' % new.count('<url>'))
