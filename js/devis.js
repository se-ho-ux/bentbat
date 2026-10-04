/* Estimation indicative du budget — formulaire de devis (contact.html)
   Source des prix : tarifs.html. Après toute modification de la grille,
   mettre à jour TARIFS ci-dessous puis lancer : python3 scripts/check_tarifs.py */
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

  var TARIFS = [
    { id: 'premium', nom: 'Prestations premium', items: [
      ['Béton ciré', 'm²', 120, 250],
      ['Mobilier sur mesure', 'm² façade', 900, 2500],
      ['Vasque sur mesure', 'unité', 700, 2500]
    ]},
    { id: 'renovation', nom: 'Rénovation', hint: 'La rénovation complète inclut déjà les corps de métier : inutile de les ajouter en plus.', items: [
      ['Rénovation complète', 'm²', 700, 1800],
      ['Coordination de chantier', 'forfait', 800, 6000]
    ]},
    { id: 'peinture', nom: 'Peinture', items: [
      ['Peinture murs / plafonds', 'm²', 22, 55],
      ['Préparation des supports', 'm²', 15, 40],
      ['Enduits décoratifs', 'm²', 70, 180],
      ['Finitions', 'ml', 12, 60]
    ]},
    { id: 'revetements', nom: 'Revêtements de sol & mur', items: [
      ['Carrelage', 'm²', 45, 95],
      ['Faïence', 'm²', 45, 110],
      ['Stratifié', 'm²', 35, 70],
      ['Parquet', 'm²', 60, 220],
      ['Résine / béton ciré', 'm²', 90, 250],
      ['Sol souple', 'm²', 30, 120]
    ]},
    { id: 'placo', nom: 'Placo & isolation', items: [
      ['Cloisons', 'm²', 45, 80],
      ['Doublage isolé', 'm²', 55, 120],
      ['Faux plafond', 'm²', 45, 95]
    ]},
    { id: 'electricite', nom: 'Électricité', items: [
      ['Rénovation électrique', 'm²', 70, 150],
      ['Tableau électrique', 'unité', 900, 3000],
      ['Point électrique', 'unité', 70, 220],
      ['Domotique', 'point', 120, 450]
    ]},
    { id: 'plomberie', nom: 'Plomberie', items: [
      ['Réseau de plomberie', 'ml', 35, 80],
      ['Installation sanitaire', 'unité', 250, 1500],
      ['Chauffe-eau', 'unité', 900, 4500],
      ['Dépannage', 'heure', 70, 120]
    ]},
    { id: 'cuisine', nom: 'Cuisine', hint: 'La cuisine complète inclut déjà la pose, le plan de travail et l’îlot : ne cochez qu’une des deux options.', items: [
      ['Pose de cuisine', 'ml', 350, 900],
      ['Plan de travail', 'ml', 120, 1500],
      ['Îlot', 'unité', 1800, 7000],
      ['Cuisine complète', 'm²', 900, 2500]
    ]},
    { id: 'salle-de-bain', nom: 'Salle de bain', hint: 'La salle de bain complète inclut déjà douche, baignoire et meuble : ne cochez qu’une des deux options.', items: [
      ['Douche italienne', 'unité', 2500, 6500],
      ['Baignoire', 'unité', 700, 2000],
      ['Meuble vasque', 'unité', 500, 2500],
      ['Salle de bain complète', 'm²', 1200, 3500]
    ]},
    { id: 'maconnerie', nom: 'Maçonnerie', items: [
      ['Petite maçonnerie', 'm²', 80, 180],
      ['Dalle béton', 'm²', 80, 180],
      ['Ouverture de mur porteur', 'unité', 2000, 8000],
      ['Reprise de structure', 'forfait', 600, 5000]
    ]},
    { id: 'nettoyage', nom: 'Nettoyage', items: [
      ['Nettoyage de fin de chantier', 'm²', 5, 15],
      ['Nettoyage de façade', 'm²', 8, 25]
    ]}
  ];

  var COEFS = [
    { id: 'depose',  nom: "Dépose de l'existant", pct: 15 },
    { id: 'acces',   nom: 'Accès difficile',      pct: 10 },
    { id: 'support', nom: 'Support dégradé',      pct: 20 },
    { id: 'premium', nom: 'Finition premium',     pct: 30 }
  ];

  // Exposé pour scripts/check_tarifs.py et les tests
  window.BENBAT_TARIFS = { tarifs: TARIFS, coefs: COEFS };

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
  sync();
  calc();
})();
