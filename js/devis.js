/* Estimation indicative du budget — formulaire de devis (contact.html)
   Les prix viennent de js/tarifs-data.js, généré depuis tarifs.html :
   après toute modification de la grille, lancer python3 scripts/sync_tarifs.py */
(function () {
  'use strict';

  var form = document.getElementById('contactForm');
  var box = document.getElementById('devisEstimator');
  if (!form || !box) return;

  // Unités : libellé du champ de quantité et valeur par défaut (null = à saisir)
  var UNITES = {
    'm²':        { label: 'Surface en m²',            def: null },
    'm² façade': { label: 'Surface de façade en m²',  def: null },
    'ml':        { label: 'Longueur en mètres',       def: null },
    'unité':     { label: 'Quantité',                 def: 1 },
    'point':     { label: 'Nombre de points',         def: null },
    'heure':     { label: "Nombre d'heures",          def: null },
    'forfait':   { label: null,                       def: 1 }
  };

  var DATA = window.BENBAT_TARIFS;
  if (!DATA) return;
  var TARIFS = DATA.tarifs, COEFS = DATA.coefs;

  var eur = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 });
  var fmt = function (n) { return eur.format(n).replace(/ /g, ' ') + ' €'; };
  var step = function (n) { return n < 1000 ? 10 : n < 10000 ? 50 : 100; };
  var floorTo = function (n) { var s = step(n); return Math.floor(n / s) * s; };
  var ceilTo = function (n) { var s = step(n); return Math.ceil(n / s) * s; };

  var el = function (tag, attrs, html) {
    var n = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (k) { n.setAttribute(k, attrs[k]); });
    if (html != null) n.innerHTML = html;
    return n;
  };

  // ── Construction de l'interface ─────────────────────────────────────────
  var list = box.querySelector('[data-devis-list]');
  var coefList = box.querySelector('[data-devis-coefs]');
  var out = box.querySelector('[data-devis-result]');
  var hid = {
    fourchette: form.elements.estimation_fourchette_ht,
    detail: form.elements.estimation_detail,
    coefs: form.elements.estimation_coefficients,
    service: form.elements.service_principal
  };

  TARIFS.forEach(function (cat) {
    var d = el('details', { class: 'est-cat', 'data-cat': cat.id });
    d.appendChild(el('summary', {}, '<span class="est-cat-name">' + cat.nom + '</span><span class="est-cat-count" aria-live="polite"></span>'));
    var body = el('div', { class: 'est-cat-body' });
    if (cat.hint) body.appendChild(el('p', { class: 'est-hint' }, cat.hint));
    cat.items.forEach(function (it, i) {
      var key = cat.id + '-' + i;
      var u = UNITES[it[1]];
      var row = el('div', { class: 'est-item', 'data-key': key });
      var range = fmt(it[2]) + ' – ' + fmt(it[3]) + (it[1] === 'forfait' ? '' : ' / ' + it[1]);
      row.appendChild(el('label', { class: 'est-check', for: 'est-' + key },
        '<input type="checkbox" id="est-' + key + '"><span class="est-label">' + it[0] +
        '</span><span class="est-range">' + range + '</span>'));
      if (u.label) {
        var q = el('div', { class: 'est-qty', hidden: '' });
        q.appendChild(el('label', { for: 'qty-' + key }, u.label));
        q.appendChild(el('input', { type: 'number', id: 'qty-' + key, min: '0', step: it[1] === 'unité' || it[1] === 'point' || it[1] === 'heure' ? '1' : 'any', inputmode: 'decimal', placeholder: it[1] === 'unité' ? '1' : 'ex. 25', value: u.def == null ? '' : String(u.def) }));
        row.appendChild(q);
      }
      body.appendChild(row);
    });
    d.appendChild(body);
    list.appendChild(d);
  });

  COEFS.forEach(function (c) {
    coefList.appendChild(el('label', { class: 'est-coef', for: 'coef-' + c.id },
      '<input type="checkbox" id="coef-' + c.id + '" data-pct="' + c.pct + '"><span>' + c.nom + '</span><b>+&nbsp;' + c.pct + '&nbsp;%</b>'));
  });

  // ── Calcul ──────────────────────────────────────────────────────────────
  var calc = function () {
    var lines = [], pending = [], min = 0, max = 0, cats = {};
    TARIFS.forEach(function (cat) {
      var n = 0;
      cat.items.forEach(function (it, i) {
        var key = cat.id + '-' + i;
        var cb = document.getElementById('est-' + key);
        var qEl = document.getElementById('qty-' + key);
        var q = qEl ? qEl.closest('.est-qty') : null;
        if (q) q.hidden = !cb.checked;
        if (!cb.checked) return;
        n++; cats[cat.id] = true;
        var qty = qEl ? parseFloat(String(qEl.value).replace(',', '.')) : 1;
        if (!(qty > 0)) { pending.push(it[0]); return; }
        var lo = qty * it[2], hi = qty * it[3];
        min += lo; max += hi;
        var qtxt = it[1] === 'forfait' ? 'forfait' : eur.format(qty) + ' ' + it[1];
        lines.push({ nom: it[0], qtxt: qtxt, lo: lo, hi: hi });
      });
      var badge = box.querySelector('[data-cat="' + cat.id + '"] .est-cat-count');
      badge.textContent = n ? n + (n > 1 ? ' choisies' : ' choisie') : '';
    });

    var pct = 0, coefNames = [];
    COEFS.forEach(function (c) {
      if (document.getElementById('coef-' + c.id).checked) { pct += c.pct; coefNames.push(c.nom + ' (+' + c.pct + ' %)'); }
    });

    var ids = Object.keys(cats);
    hid.service.value = ids.length === 0 ? '' : ids.length === 1 ? ids[0] : 'multi';
    hid.coefs.value = coefNames.join(', ');

    if (!lines.length) {
      hid.fourchette.value = '';
      hid.detail.value = pending.length ? 'À préciser : ' + pending.join(', ') : '';
      out.innerHTML = '<p class="est-empty">' + (pending.length
        ? 'Indiquez la quantité pour : ' + pending.join(', ') + '.'
        : 'Cochez une ou plusieurs prestations pour obtenir une première fourchette de prix.') + '</p>';
      return;
    }

    var k = 1 + pct / 100;
    var lo = floorTo(min * k), hi = ceilTo(max * k);
    var range = fmt(lo) + ' – ' + fmt(hi) + ' HT';
    hid.fourchette.value = range;
    hid.detail.value = lines.map(function (l) {
      return l.nom + ' · ' + l.qtxt + ' · ' + fmt(floorTo(l.lo)) + ' – ' + fmt(ceilTo(l.hi));
    }).join('\n') + (pending.length ? '\nÀ préciser : ' + pending.join(', ') : '');

    out.innerHTML =
      '<p class="est-total-label">Estimation indicative</p>' +
      '<p class="est-total">' + range + '</p>' +
      '<ul class="est-lines">' + lines.map(function (l) {
        return '<li><span>' + l.nom + ' <small>' + l.qtxt + '</small></span><span>' + fmt(floorTo(l.lo)) + ' – ' + fmt(ceilTo(l.hi)) + '</span></li>';
      }).join('') + '</ul>' +
      (pct ? '<p class="est-note">Majorations incluses : ' + coefNames.join(', ') + '.</p>' : '') +
      (pending.length ? '<p class="est-note">Quantité manquante, non comptée : ' + pending.join(', ') + '.</p>' : '') +
      (hi / lo >= 2 ? '<p class="est-note">L’écart est large car il dépend de l’état des supports, de l’accès et du niveau de finition : la visite technique le réduira.</p>' : '') +
      (lo >= 15000 ? '<p class="est-note">Pour un projet de cette ampleur, une visite sur place est indispensable avant tout chiffrage.</p>' : '') +
      '<p class="est-note">Fourchette hors taxes, non contractuelle. Le prix définitif est arrêté après une visite technique et un devis gratuit.</p>';
  };

  box.addEventListener('input', calc);
  box.addEventListener('change', calc);

  // ── Affichage selon le type de demande ──────────────────────────────────
  var typeSel = form.elements.type;
  var serviceGroup = document.getElementById('serviceGroup');
  var sync = function () {
    var on = typeSel.value === 'devis';
    box.hidden = !on;
    serviceGroup.hidden = on;
    form.elements.service.disabled = on;
    Array.prototype.forEach.call(box.querySelectorAll('input[type="hidden"]'), function (h) { h.disabled = !on; });
    if (on) calc();
  };
  typeSel.addEventListener('change', sync);

  // Lien depuis la page Tarifs : contact?devis=<catégorie>#estimateur
  var wanted = new URLSearchParams(location.search).get('devis');
  if (wanted !== null) {
    typeSel.value = 'devis';
    var cat = wanted ? box.querySelector('.est-cat[data-cat="' + wanted.replace(/[^a-z\-]/g, '') + '"]') : null;
    if (cat) cat.open = true;
    sync();
    window.addEventListener('load', function () {
      box.scrollIntoView({ block: 'start' });
      var target = cat ? cat.querySelector('summary') : box.querySelector('summary');
      if (target) target.focus({ preventScroll: true });
    });
  } else {
    sync();
  }
  calc();
})();
