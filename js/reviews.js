/* Avis Google (Places API New) : affichage des avis réels de la fiche Ben&Bat.
 *
 * Les avis ne sont ni copiés ni stockés dans le dépôt : ils sont lus à l'affichage de la section,
 * via le relais décrit dans docs/avis-google.md (la clé API reste côté serveur).
 * Tant que ENDPOINT est vide, la page garde son contenu statique.
 * Quand ENDPOINT est renseigné et que Google ne répond pas, la section affiche un lien
 * vers la fiche Google, jamais de témoignage de remplacement. */
(function () {
  'use strict';

  var ENDPOINT = '';
  var FICHE = 'https://www.google.com/maps/search/?api=1&query=Ben%26bat%20Paris';
  var CLAMP = 280; // au-delà, texte replié avec bouton « Lire l'avis complet »

  var grids = ['reviews-grid-home', 'reviews-grid-apropos']
    .map(function (id) { return document.getElementById(id); })
    .filter(Boolean);
  if (!ENDPOINT || !grids.length) return;

  var el = function (tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  };
  var safeUrl = function (u) { return /^https:\/\//.test(u || '') ? u : null; };
  var fr = new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric' });
  var langName = function (c) {
    try { return new Intl.DisplayNames(['fr'], { type: 'language' }).of(c); } catch (e) { return c; }
  };

  function stars(n) {
    var wrap = el('div', 't-stars');
    wrap.setAttribute('role', 'img');
    wrap.setAttribute('aria-label', 'Note : ' + n + ' sur 5');
    for (var i = 0; i < Math.min(Math.max(n, 0), 5); i++) {
      var s = el('i', 'fas fa-star'); s.setAttribute('aria-hidden', 'true'); wrap.appendChild(s);
    }
    return wrap;
  }

  function card(r) {
    var a = r.authorAttribution || {};
    var name = a.displayName || 'Client Google';
    var c = el('article', 'testimonial-card');
    c.appendChild(stars(r.rating || 0));

    var txt = (r.text && r.text.text) || '';
    var p = el('p', 't-text', '« ' + txt + ' »');
    if (txt.length > CLAMP) p.classList.add('t-clamped');
    c.appendChild(p);
    if (txt.length > CLAMP) {
      var b = el('button', 't-more', 'Lire l’avis complet');
      b.type = 'button'; b.setAttribute('aria-expanded', 'false');
      b.addEventListener('click', function () {
        var open = p.classList.toggle('t-clamped') === false;
        b.setAttribute('aria-expanded', String(open));
        b.textContent = open ? 'Réduire l’avis' : 'Lire l’avis complet';
      });
      c.appendChild(b);
    }

    var o = r.originalText;
    if (o && r.text && o.languageCode && r.text.languageCode && o.languageCode !== r.text.languageCode) {
      c.appendChild(el('p', 't-note', 'Traduit de l’' + langName(o.languageCode) + ' par Google.'));
    }

    var who = el('div', 't-author');
    var photo = safeUrl(a.photoUri);
    if (photo) {
      var img = el('img', 't-avatar t-avatar-img');
      img.src = photo; img.alt = ''; img.width = 42; img.height = 42;
      img.loading = 'lazy'; img.referrerPolicy = 'no-referrer';
      who.appendChild(img);
    } else {
      who.appendChild(el('div', 't-avatar', name.split(/\s+/).map(function (w) { return w[0]; }).slice(0, 2).join('').toUpperCase()));
    }
    var meta = document.createElement('div');
    var prof = safeUrl(a.uri);
    if (prof) {
      var l = el('a', 't-name', name);
      l.href = prof; l.target = '_blank'; l.rel = 'noopener nofollow';
      meta.appendChild(l);
    } else {
      meta.appendChild(el('div', 't-name', name));
    }
    var when = [];
    if (r.relativePublishTimeDescription) when.push(r.relativePublishTimeDescription);
    if (r.visitDate && r.visitDate.year && r.visitDate.month) {
      when.push('Visite : ' + fr.format(new Date(r.visitDate.year, r.visitDate.month - 1, 1)));
    }
    if (when.length) meta.appendChild(el('div', 't-location', when.join(' · ')));
    var src = safeUrl(r.googleMapsUri);
    if (src) {
      var s = el('a', 't-src', 'Voir l’avis sur Google');
      s.href = src; s.target = '_blank'; s.rel = 'noopener nofollow';
      meta.appendChild(s);
    }
    who.appendChild(meta);
    c.appendChild(who);
    return c;
  }

  function foot(uri, count) {
    var f = el('div', 'reviews-foot');
    f.appendChild(el('p', 'reviews-note',
      'Avis publiés sur Google, affichés tels quels. Google en sélectionne au maximum cinq, selon sa propre pertinence : ce ne sont pas forcément les plus récents.'));
    var link = el('a', 'btn btn-ghost-dark', 'Voir tous les avis sur Google' + (count ? ' (' + count + ')' : ''));
    link.href = safeUrl(uri) || FICHE; link.target = '_blank'; link.rel = 'noopener';
    f.appendChild(link);
    return f;
  }

  function neutral(grid) {
    grid.replaceChildren();
    grid.classList.add('reviews-empty-grid');
    var box = el('div', 'reviews-empty');
    box.appendChild(el('p', null, 'Les avis de nos clients sont publiés sur notre fiche Google.'));
    var link = el('a', 'btn btn-ghost-dark', 'Voir les avis sur Google');
    link.href = FICHE; link.target = '_blank'; link.rel = 'noopener';
    box.appendChild(link);
    grid.appendChild(box);
  }

  function badge(d) {
    document.querySelectorAll('.google-badge-score').forEach(function (n) {
      n.textContent = d.rating.toFixed(1).replace('.', ',');
    });
    document.querySelectorAll('.google-badge-stars').forEach(function (n) {
      var full = Math.round(d.rating);
      n.textContent = '★★★★★'.slice(0, full) + '☆☆☆☆☆'.slice(0, 5 - full);
      n.setAttribute('aria-label', 'Note moyenne Google : ' + d.rating.toFixed(1).replace('.', ',') + ' sur 5');
    });
    document.querySelectorAll('.google-badge-label').forEach(function (n) {
      n.textContent = d.userRatingCount + ' avis Google';
    });
  }

  var done = false;
  function load() {
    if (done) return; done = true;
    fetch(ENDPOINT, { cache: 'no-store' })
      .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then(function (d) {
        var list = (d.reviews || []).filter(function (r) { return r.text && r.text.text && r.text.text.trim(); });
        if (!list.length || typeof d.rating !== 'number') throw new Error('vide');
        badge(d);
        grids.forEach(function (g) {
          g.replaceChildren.apply(g, list.slice(0, g.id === 'reviews-grid-home' ? 3 : 5).map(card));
          if (!g.nextElementSibling || !g.nextElementSibling.classList.contains('reviews-foot')) {
            g.after(foot(d.googleMapsUri, d.userRatingCount));
          }
        });
      })
      .catch(function () { grids.forEach(neutral); });
  }

  // Un appel n'est déclenché que si le visiteur atteint la section (aucun appel sinon)
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (e) {
      if (e.some(function (x) { return x.isIntersecting; })) { io.disconnect(); load(); }
    }, { rootMargin: '200px' });
    grids.forEach(function (g) { io.observe(g); });
  } else {
    load();
  }
})();
