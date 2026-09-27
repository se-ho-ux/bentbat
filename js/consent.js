/* ═══════════════════════════════════════════════════════════════════════════
   Bandeau de consentement cookies — Ben&Bat
   ───────────────────────────────────────────────────────────────────────────
   Deux finalités distinctes, chacune soumise à un choix séparé (CNIL) :
   - mesure d'audience (Google Analytics 4) ;
   - publicité (mesure de l'efficacité des annonces Google Ads).
   Aucun script Google n'est chargé tant que la mesure d'audience n'est pas
   acceptée : c'est l'amorce en <head> (benbatApplyConsent) qui décide, à
   partir du choix stocké ici. « Tout refuser » est aussi accessible que
   « Tout accepter », et le choix reste révocable via « Gérer les cookies ».
   ═══════════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  var KEY = 'benbat-consent-v2';
  var MAX_AGE = 3.4e10; // ≈ 13 mois (395 jours), durée de validité du choix

  function readChoice() {
    try {
      var c = JSON.parse(localStorage.getItem(KEY));
      return c && Date.now() - c.ts < MAX_AGE ? c : null;
    } catch (e) { return null; }
  }

  function saveChoice(c) {
    c.ts = Date.now();
    try {
      localStorage.setItem(KEY, JSON.stringify(c));
      localStorage.removeItem('benbat-consent'); // ancien format, une seule finalité
    } catch (e) {}
  }

  // Efface les cookies dont le nom correspond au motif, sur toutes les
  // variantes de domaine où Google a pu les déposer.
  function deleteCookies(pattern) {
    var host = location.hostname;
    var domains = ['', host, '.' + host];
    var parts = host.split('.');
    if (parts.length > 2) domains.push('.' + parts.slice(-2).join('.'));

    document.cookie.split(';').forEach(function (raw) {
      var name = raw.split('=')[0].trim();
      if (!pattern.test(name)) return;
      domains.forEach(function (d) {
        document.cookie = name + '=; Max-Age=0; path=/' + (d ? '; domain=' + d : '');
      });
    });
  }

  function apply(c) {
    if (typeof window.benbatApplyConsent === 'function') window.benbatApplyConsent(c);
    if (!c.analytics && typeof window.gtag === 'function') {
      window.gtag('consent', 'update', { analytics_storage: 'denied' });
    }
    if (!c.analytics) deleteCookies(/^_ga|^_gid$|^_gat/);
    if (!c.ads) deleteCookies(/^_gcl_/);
  }

  var banner = null;

  function build() {
    var el = document.createElement('div');
    el.className = 'cookie-banner';
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-label', 'Consentement aux cookies');
    el.innerHTML =
      '<div class="cookie-banner-inner">' +
        '<div class="cookie-banner-text">' +
          '<strong>Cookies de mesure et de publicité</strong>' +
          '<p>Avec votre accord, nous mesurons la fréquentation du site (Google Analytics) ' +
          'et l’efficacité de nos annonces Google Ads. Rien n’est déposé sans votre accord, ' +
          'et refuser ne change rien à votre navigation. ' +
          '<a href="mentions-legales#cookies">En savoir plus</a></p>' +
        '</div>' +
        '<div class="cookie-banner-actions">' +
          '<button type="button" class="btn btn-ghost" data-consent="none">Tout refuser</button>' +
          '<button type="button" class="btn btn-ghost" data-consent="custom" aria-expanded="false" aria-controls="cookiePrefs">Personnaliser</button>' +
          '<button type="button" class="btn btn-primary" data-consent="all">Tout accepter</button>' +
        '</div>' +
      '</div>' +
      '<div class="cookie-prefs" id="cookiePrefs" hidden>' +
        '<label class="cookie-pref">' +
          '<input type="checkbox" name="analytics">' +
          '<span><strong>Mesure d’audience</strong>' +
          'Statistiques de fréquentation des pages (Google Analytics 4).</span>' +
        '</label>' +
        '<label class="cookie-pref">' +
          '<input type="checkbox" name="ads">' +
          '<span><strong>Publicité</strong>' +
          'Savoir quelles annonces Google Ads mènent à une demande de devis. ' +
          'Nécessite la mesure d’audience.</span>' +
        '</label>' +
        '<button type="button" class="btn btn-primary" data-consent="save">Enregistrer mes choix</button>' +
      '</div>';
    return el;
  }

  function open() {
    if (!banner) {
      banner = build();
      document.body.appendChild(banner);

      var prefs = banner.querySelector('.cookie-prefs');
      var boxA = banner.querySelector('input[name="analytics"]');
      var boxB = banner.querySelector('input[name="ads"]');

      banner.addEventListener('click', function (e) {
        var btn = e.target.closest('[data-consent]');
        if (!btn) return;
        var action = btn.getAttribute('data-consent');
        var c;
        if (action === 'custom') {
          prefs.hidden = !prefs.hidden;
          btn.setAttribute('aria-expanded', String(!prefs.hidden));
          return;
        }
        if (action === 'all') c = { analytics: true, ads: true };
        else if (action === 'none') c = { analytics: false, ads: false };
        else c = { analytics: boxA.checked, ads: boxA.checked && boxB.checked };
        saveChoice(c);
        apply(c);
        close();
      });
    }

    // Les cases reflètent le choix en cours à chaque réouverture
    var current = readChoice() || {};
    banner.querySelector('input[name="analytics"]').checked = !!current.analytics;
    banner.querySelector('input[name="ads"]').checked = !!current.ads;

    // Un reflow forcé suffit à déclencher la transition CSS. On évite
    // requestAnimationFrame, suspendu quand l'onglet est en arrière-plan :
    // le bandeau resterait alors invisible.
    void banner.offsetHeight;
    banner.classList.add('is-open');
  }

  function close() {
    if (banner) banner.classList.remove('is-open');
  }

  // Premier passage, ou choix fait avant l'ajout de la finalité « publicité »
  if (!readChoice()) open();

  // « Gérer les cookies » : rouvre le bandeau pour revenir sur son choix
  document.querySelectorAll('[data-cookie-settings]').forEach(function (link) {
    link.addEventListener('click', function (e) {
      e.preventDefault();
      open();
    });
  });
})();
