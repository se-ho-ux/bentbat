#!/usr/bin/env python3
"""Génère les pages de services et de spécialités à partir de content/services/*.json.

  python3 scripts/build_services.py          écrit <slug>.html à la racine
  python3 scripts/build_services.py --check  échoue si une page est obsolète

Les prix viennent de js/tarifs-data.js (lui-même généré depuis tarifs.html) :
ils ne sont jamais recopiés dans le contenu. Les blocs communs (head, en-tête,
pied de page) sont ensuite synchronisés par scripts/build.py, lancé à la fin.

Mini-balisage dans les textes : [libellé](slug-ou-url) crée un lien interne.
Un « | » dans un h1 devient un retour à la ligne.
"""
import html as H, json, pathlib, re, subprocess, sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
CONTENT = ROOT / 'content' / 'services'
SITE = 'https://benbat.fr'

TARIFS = json.loads(re.search(r'=\s*(\{.*\});', (ROOT / 'js' / 'tarifs-data.js').read_text(encoding='utf-8'), re.S).group(1))
CATS = {c['id']: c for c in TARIFS['tarifs']}

# Photos réelles du site (réalisations). Clé = nom de fichier sans extension.
IMG_W = {0: 1183, 1: 1183, 2: 911, 3: 903, 7: 960, 8: 1200, 9: 960, 10: 1200, 12: 1024, 13: 1200, 14: 1200, 15: 1408}


def esc(s):
    return H.escape(s, quote=False)


def attr(s):
    return H.escape(s, quote=True)


def tokens(s):
    """{prix:catégorie:n} -> fourchette de la n-ième prestation ; {coef:id} -> majoration."""
    def prix(m):
        nom, unit, lo, hi = CATS[m.group(1)]['items'][int(m.group(2))]
        return f'{eur(lo)} – {eur(hi)}' + ('' if unit == 'forfait' else f' / {unit}')
    def coef(m):
        c = next(x for x in TARIFS['coefs'] if x['id'] == m.group(1))
        return f'+\u00a0{c["pct"]}\u00a0%'
    s = re.sub(r'\{prix:([\w-]+):(\d+)\}', prix, s)
    return re.sub(r'\{coef:(\w+)\}', coef, s)


def rich(s):
    s = esc(tokens(s))
    def link(m):
        t = m.group(2)
        href = t if re.match(r'(https?:|/|#|mailto:|tel:)', t) else t
        return f'<a href="{href}">{m.group(1)}</a>'
    return re.sub(r'\[([^\]]+)\]\(([^)]+)\)', link, s)


def plain(s):
    s = tokens(s)
    return re.sub(r'\[([^\]]+)\]\([^)]+\)', r'\1', s)


def eur(n):
    return f'{n:,}'.replace(',', ' ') + ' €'


def img_tag(name, alt, sizes, lazy=True):
    n = int(name.replace('image', ''))
    w = IMG_W[n]
    srcs = [f'images/{name}-480.webp 480w', f'images/{name}-640.webp 640w', f'images/{name}-900.webp 900w']
    srcs.append(f'images/{name}.webp {w}w') if w > 900 else None
    return (f'<img src="images/{name}-640.webp" srcset="{", ".join(srcs)}" sizes="{sizes}" '
            f'alt="{attr(alt)}" loading="{"lazy" if lazy else "eager"}" decoding="async">')


def price_rows(cat, only=None):
    rows = []
    for nom, unit, lo, hi in cat['items']:
        if only and nom not in only:
            continue
        u = '' if unit == 'forfait' else f'/ {unit}'
        ulabel = 'forfait' if unit == 'forfait' else u
        rows.append(f'<tr><td>{esc(nom)}<span class="price-unit">{esc(ulabel)}</span></td>'
                    f'<td class="price-range">{eur(lo)} – {eur(hi)}</td></tr>')
    return '\n'.join(rows)


def facts(c):
    cells = []
    for label, val in c['bref']:
        cells.append(f'<div><dt>{esc(label)}</dt><dd>{rich(val)}</dd></div>')
    return '\n          '.join(cells)


def build(c):
    slug = c['slug']
    url = f'{SITE}/{slug}'
    estim = c.get('estimateur') or (c['tarifs']['cats'][0] if c.get('tarifs') else '')
    estim_href = f'contact?devis={estim}#devisEstimator' if estim else 'contact'
    h1 = esc(c['h1']).replace('|', '<br>')
    kind = c.get('kind', 'service')  # service | pilier
    crumb = [('Accueil', '/'), ('Services', 'services')]

    # ── JSON-LD ───────────────────────────────────────────────────────
    graph = [
        {'@type': 'Service', '@id': f'{url}#service', 'name': c['nom_schema'], 'serviceType': c['service_type'],
         'description': plain(c['description']), 'url': url, 'provider': {'@id': f'{SITE}/#entreprise'},
         'areaServed': [{'@type': 'Country', 'name': 'France'}, {'@type': 'Country', 'name': 'Belgique'}],
         'image': [f'{SITE}/images/{p["img"]}.webp' for p in c.get('photos', [])]},
        {'@type': 'BreadcrumbList', 'itemListElement': [
            {'@type': 'ListItem', 'position': 1, 'name': 'Accueil', 'item': SITE + '/'},
            {'@type': 'ListItem', 'position': 2, 'name': 'Services', 'item': SITE + '/services'},
            {'@type': 'ListItem', 'position': 3, 'name': c['nom'], 'item': url}]},
        {'@type': 'FAQPage', 'mainEntity': [
            {'@type': 'Question', 'name': q['q'], 'acceptedAnswer': {'@type': 'Answer', 'text': plain(q['r'])}} for q in c['faq']]},
    ]
    for p in c.get('photos', []):
        graph.append({'@type': 'ImageObject', 'contentUrl': f'{SITE}/images/{p["img"]}.webp',
                      'url': f'{SITE}/images/{p["img"]}.webp', 'caption': p['alt'], 'name': p['legende'],
                      'creator': {'@id': f'{SITE}/#entreprise'}})
    ld = json.dumps({'@context': 'https://schema.org', '@graph': graph}, ensure_ascii=False, indent=2)

    # ── Sections ──────────────────────────────────────────────────────
    cards = ''.join(
        f'''
        <div class="service-page-card">
          <div class="service-icon"><i class="fas fa-{k["icon"]}"></i></div>
          <h3>{esc(k["titre"])}</h3>
          <p>{rich(k["texte"])}</p>
          <ul class="service-list">
{"".join(f"            <li>{rich(li)}</li>" + chr(10) for li in k["liste"])}          </ul>
        </div>''' for k in c['cartes'])

    steps = ''.join(
        f'''
        <div class="list-row">
          <span class="sr-num">{i:02d}</span>
          <span class="sr-icon"><i class="fas fa-{e["icon"]}"></i></span>
          <div class="sr-body">
            <h3>{esc(e["titre"])}</h3>
            <p>{rich(e["texte"])}</p>
          </div>
        </div>''' for i, e in enumerate(c['etapes'], 1))

    t = c.get('tarifs')
    tarif_html = ''
    if t:
        tables = ''
        for cid in t['cats']:
            cat = CATS[cid]
            tables += f'''
        <div class="price-cat svc-price-cat">
          <div class="price-cat-head"><h3>{esc(cat["nom"])}</h3></div>
          <table class="price-table">
            <thead><tr><th>Prestation</th><th>Fourchette HT</th></tr></thead>
            <tbody>
{price_rows(cat, t.get("only"))}
            </tbody>
          </table>
        </div>'''
        facteurs = ''.join(f'<li><strong>{rich(f["titre"])}</strong> {rich(f["texte"])}</li>' for f in t['facteurs'])
        tarif_html = f'''
  <!-- ══════════ PRIX ══════════ -->
  <section class="section" id="prix">
    <div class="container">
      <div class="section-head">
        <div>
          <span class="eyebrow">Prix indicatifs</span>
          <h2>{esc(t["h2"]).replace("|", "<br>")}</h2>
        </div>
        <p>{rich(t["intro"])}</p>
      </div>
      <div class="svc-price-layout">
        <div class="svc-price-tables">{tables}
        </div>
        <aside class="svc-price-side">
          <h3>Ce qui fait varier le prix</h3>
          <ul class="svc-factors">{facteurs}</ul>
          <p class="svc-price-note">Fourchettes hors taxes, issues de notre <a href="tarifs">grille tarifaire</a>. Le prix définitif est arrêté après une visite technique.</p>
          <a href="{estim_href}" class="btn btn-primary">Estimer mon projet <i class="fas fa-arrow-right"></i></a>
        </aside>
      </div>
    </div>
  </section>
'''

    cv = c['conseils']
    conseils = ''.join(
        f'''
        <div class="svc-tip">
          <h3>{esc(x["titre"])}</h3>
          <p>{rich(x["texte"])}</p>
        </div>''' for x in cv['items'])

    photos = ''
    if c.get('photos'):
        figs = ''.join(
            f'''
        <figure class="svc-photo">
          <a href="{p["lien"]}">{img_tag(p["img"], p["alt"], "(max-width: 700px) 92vw, 46vw")}</a>
          <figcaption>{esc(p["legende"])} <a href="{p["lien"]}">Voir la réalisation</a></figcaption>
        </figure>''' for p in c['photos'])
        photos = f'''
  <!-- ══════════ RÉALISATIONS ══════════ -->
  <section class="section" id="realisations-liees" style="background: var(--bg-alt);">
    <div class="container">
      <div class="section-head">
        <div>
          <span class="eyebrow">Sur nos chantiers</span>
          <h2>{esc(c["photos_h2"]).replace("|", "<br>")}</h2>
        </div>
        <p>{rich(c["photos_texte"])}</p>
      </div>
      <div class="svc-photos">{figs}
      </div>
    </div>
  </section>
'''

    faq = ''.join(
        f'''
        <div class="faq-item">
          <button class="faq-q" aria-expanded="false">
            {esc(q["q"])}
            <i class="fas fa-plus"></i>
          </button>
          <div class="faq-a">{rich(q["r"])}</div>
        </div>''' for q in c['faq'])

    related = ''.join(
        f'''
        <a href="{r["slug"]}" class="related-card">
          <h3>{esc(r["label"])}</h3>
          <p>{esc(r["texte"])}</p>
          <span>Voir la page <i class="fas fa-arrow-right"></i></span>
        </a>''' for r in c['voir_aussi'])

    hero_kicker = f'<span class="eyebrow">{esc(c["kicker"])}</span>' if c.get('kicker') else ''
    intro = c['intro']
    paras = ''.join(f'\n          <p>{rich(p)}</p>' for p in intro['p'])
    conseils_p = f'<p>{rich(cv["intro"])}</p>'
    cta = c['cta']

    return f'''<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <!-- @shared:head-meta -->
  <!-- @end:head-meta -->
  <link rel="canonical" href="{url}">
  <title>{esc(c["title"])}</title>
  <meta name="description" content="{attr(c["description_meta"])}">
  <meta property="og:title" content="{attr(c["title"])}">
  <meta property="og:description" content="{attr(c["description_meta"])}">
  <meta property="og:type" content="website">
  <meta property="og:url" content="{url}">
  <meta property="og:image" content="{SITE}/images/og-image.jpg">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta name="twitter:card" content="summary_large_image">
  <!-- @shared:head-assets -->
  <!-- @end:head-assets -->
  <!-- @shared:schema-business -->
  <!-- @end:schema-business -->
  <script type="application/ld+json">
{ld}
  </script>
</head>
<body>

  <a href="#main-content" class="skip-link">Passer au contenu principal</a>

  <!-- @shared:header active=services -->
  <!-- @end:header -->

  <!-- ══════════ HERO ══════════ -->
  <section class="page-hero" id="main-content">
    <div class="container">
      <div class="page-hero-inner">
        <div class="breadcrumb">
          <a href="/">Accueil</a><span class="sep">/</span><a href="services">Services</a><span class="sep">/</span><span class="cur">{esc(c["nom"])}</span>
        </div>
        <h1>{h1}</h1>
        <p>{rich(c["lede"])}</p>
        <div class="svc-hero-cta">
          <a href="{estim_href}" class="btn btn-primary">Estimer mon budget <i class="fas fa-arrow-right"></i></a>
          <a href="contact" class="btn btn-ghost-dark">Devis gratuit</a>
        </div>
        <span id="heroDevis" aria-hidden="true" style="display:block;height:0;"></span>
      </div>
    </div>
  </section>

  <!-- ══════════ EN BREF ══════════ -->
  <section class="section-sm svc-facts-band">
    <div class="container">
      <dl class="svc-facts">
          {facts(c)}
      </dl>
    </div>
  </section>

  <!-- ══════════ INTRO ══════════ -->
  <section class="section">
    <div class="container">
      <div class="section-head section-head--prose">
        <div>
          {hero_kicker}
          <h2>{esc(intro["h2"]).replace("|", "<br>")}</h2>
        </div>
        <div class="svc-prose">{paras}
        </div>
      </div>
      <div class="services-page-grid">{cards}
      </div>
    </div>
  </section>

  <!-- ══════════ DÉROULÉ ══════════ -->
  <section class="section section-dark" id="deroule">
    <div class="container">
      <div class="section-head">
        <div>
          <span class="eyebrow">Déroulé d'intervention</span>
          <h2>{esc(c["deroule_h2"]).replace("|", "<br>")}</h2>
        </div>
        <p>{rich(c["deroule_intro"])}</p>
      </div>
      <div class="services-list">{steps}
      </div>
    </div>
  </section>
{tarif_html}
  <!-- ══════════ CONSEILS ══════════ -->
  <section class="section" id="conseils">
    <div class="container">
      <div class="section-head">
        <div>
          <span class="eyebrow">{esc(cv["eyebrow"])}</span>
          <h2>{esc(cv["h2"]).replace("|", "<br>")}</h2>
        </div>
        {conseils_p}
      </div>
      <div class="svc-tips">{conseils}
      </div>
    </div>
  </section>
{photos}
  <!-- ══════════ FAQ ══════════ -->
  <section class="section" id="faq">
    <div class="container">
      <div class="section-head">
        <div>
          <span class="eyebrow">Questions fréquentes</span>
          <h2>{esc(c["faq_h2"]).replace("|", "<br>")}</h2>
        </div>
        <p>{rich(c["faq_intro"])}</p>
      </div>
      <div class="faq-list">{faq}
      </div>
    </div>
  </section>

  <!-- ══════════ À VOIR AUSSI ══════════ -->
  <section class="section-sm" id="voir-aussi">
    <div class="container">
      <h2 class="svc-related-title">À voir aussi</h2>
      <div class="related-grid">{related}
        <a href="tarifs" class="related-card">
          <h3>Grille tarifaire complète</h3>
          <p>Toutes nos prestations, avec fourchettes de prix et majorations.</p>
          <span>Voir les tarifs <i class="fas fa-arrow-right"></i></span>
        </a>
        <a href="garanties" class="related-card">
          <h3>Garanties et assurances</h3>
          <p>Décennale, responsabilité civile professionnelle, bilan à 30 jours.</p>
          <span>Voir les garanties <i class="fas fa-arrow-right"></i></span>
        </a>
      </div>
    </div>
  </section>

  <!-- ══════════ CTA ══════════ -->
  <section class="section cta-section" id="ctaSection">
    <div class="container">
      <div class="cta-inner">
        <div>
          <h2>{esc(cta["h2"]).replace("|", "<br>")}</h2>
          <p>{esc(cta["p"])}</p>
        </div>
        <div class="cta-btns">
          <a href="{estim_href}" class="btn btn-primary">Estimer mon budget <i class="fas fa-arrow-right"></i></a>
          <a href="tel:+33658594147" class="btn btn-ghost"><i class="fas fa-phone"></i> Nous appeler</a>
        </div>
      </div>
    </div>
  </section>

  <!-- @shared:footer -->
  <!-- @end:footer -->
  <!-- @shared:sticky -->
  <!-- @end:sticky -->

  <!-- @shared:scripts -->
  <!-- @end:scripts -->
</body>
</html>
'''


def main():
    check = '--check' in sys.argv
    stale = []
    for f in sorted(CONTENT.glob('*.json')):
        c = json.loads(f.read_text(encoding='utf-8'))
        out = ROOT / f'{c["slug"]}.html'
        old = out.read_text(encoding='utf-8') if out.exists() else ''
        # on compare hors blocs partagés (régénérés par build.py)
        strip = lambda s: re.sub(r'<!-- @shared:([\w-]+)[^>]*-->.*?<!-- @end:\1 -->', r'@\1', s, flags=re.S)
        new = build(c)
        if strip(old) != strip(new):
            stale.append(out.name)
            if not check:
                out.write_text(new, encoding='utf-8')
    if not check:
        subprocess.run([sys.executable, str(ROOT / 'scripts' / 'build.py')], check=True)
        print('Pages générées/mises à jour : ' + (', '.join(stale) if stale else 'aucune'))
        return
    print('OK : pages de services à jour.' if not stale else 'Obsolètes : ' + ', '.join(stale) + ' (lancer python3 scripts/build_services.py)')
    sys.exit(1 if stale else 0)


if __name__ == '__main__':
    main()
