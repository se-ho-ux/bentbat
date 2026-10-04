#!/usr/bin/env python3
"""Gabarit partagé du site (HTML statique, aucun framework).

Les blocs communs à toutes les pages vivent dans src/partials/ :
  head-meta      CSP, referrer, viewport, normalisation d'URL
  head-assets    consentement GA4, polices, CSS, icônes
  schema-business  JSON-LD de l'entreprise (identique partout)
  header         en-tête + menu mobile (lien actif : paramètre active=<page>)
  footer         pied de page + bandeau d'appel mobile
  scripts        scripts de fin de page (paramètre reviews pour js/reviews.js)

Chaque page les appelle avec des marqueurs :
    <!-- @shared:header active=tarifs -->
    ...contenu régénéré, ne pas modifier à la main...
    <!-- @end:header -->

  python3 scripts/build.py          régénère les blocs dans toutes les pages
  python3 scripts/build.py --check  échoue si une page est désynchronisée

Versions de cache (?v=) : modifier VERSIONS ci-dessous, puis relancer le script.
"""
import glob, json, pathlib, re, sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
PARTIALS = ROOT / 'src' / 'partials'
SKIP = {'plaquette.html'}  # document autonome, hors gabarit

VERSIONS = {'css': 18, 'main': 10, 'consent': 3, 'reviews': 3}

MARK = re.compile(r'([ \t]*)<!-- @shared:([\w-]+)([^>]*?)-->\n(.*?)\1<!-- @end:\2 -->', re.S)


def pages():
    return [p for p in sorted(ROOT.glob('*.html'))
            if not p.name.startswith('google') and p.name not in SKIP]


def params(raw):
    out = {}
    for tok in raw.split():
        k, _, v = tok.partition('=')
        out[k] = v or True
    return out


def absolute(html):
    """404 : servie à n'importe quelle profondeur, donc chemins absolus."""
    return re.sub(r'(href|src)="(?!/|#|https?:|mailto:|tel:|data:)([^"]+)"', r'\1="/\2"', html)


def services_cols():
    """Colonnes « Services » / « Spécialités » du pied de page. Une page absente
    est omise, ou remplacée par son ancre de repli (champ fallback)."""
    reg = json.loads((ROOT / 'src' / 'data' / 'services.json').read_text(encoding='utf-8'))
    cols = []
    for group in reg['footer']:
        items = []
        for s in group['items']:
            href = s['href'] if (ROOT / (s['slug'] + '.html')).exists() else s.get('fallback')
            if href:
                items.append(f'    <li><a href="{href}">{s["label"]}</a></li>')
        if items:
            cols.append('<div class="footer-col">\n  <h5>%s</h5>\n  <ul class="footer-links">\n%s\n  </ul>\n</div>'
                        % (group['title'], '\n'.join(items)))
    return '\n'.join(cols)


def render(name, p):
    html = (PARTIALS / f'{name}.html').read_text(encoding='utf-8').rstrip('\n')
    active = p.get('active')
    html = re.sub(r'\{\{a:([\w-]+)\}\}', lambda m: ' class="active"' if m.group(1) == active else '', html)
    html = html.replace('{{services_cols}}', services_cols())
    html = html.replace('{{v:css}}', str(VERSIONS['css']))
    for k in ('main', 'consent', 'reviews'):
        html = html.replace('{{v:%s}}' % k, str(VERSIONS[k]))
    if name == 'scripts' and not p.get('reviews'):
        html = '\n'.join(l for l in html.split('\n') if 'reviews.js' not in l)
    if p.get('abs'):
        html = absolute(html)
    return html


def sync(text):
    def repl(m):
        indent, name, raw, _ = m.groups()
        body = render(name, params(raw))
        body = '\n'.join((indent + l if l.strip() else l) for l in body.split('\n'))
        return f'{indent}<!-- @shared:{name}{raw}-->\n{body}\n{indent}<!-- @end:{name} -->'
    return MARK.sub(repl, text)


if __name__ == '__main__':
    check = '--check' in sys.argv
    stale = []
    for page in pages():
        old = page.read_text(encoding='utf-8')
        new = sync(old)
        if new != old:
            stale.append(page.name)
            if not check:
                page.write_text(new, encoding='utf-8')
    if check:
        print('OK : blocs partagés à jour.' if not stale else 'Désynchronisées : ' + ', '.join(stale) + ' (lancer python3 scripts/build.py)')
        sys.exit(1 if stale else 0)
    print('Mis à jour : ' + (', '.join(stale) if stale else 'rien (déjà à jour)'))
