/* ═══════════════════════════════════════════════════════════════════════════
   Bandeau de consentement cookies — Ben&Bat
   ───────────────────────────────────────────────────────────────────────────
   Aucun script Google n'est chargé tant que le visiteur n'a pas accepté :
   c'est l'amorce en <head> qui décide, à partir de la valeur stockée ici.
   Le refus est aussi accessible que l'acceptation (exigence CNIL), et le
   choix reste révocable à tout moment via « Gérer les cookies » en pied de page.
   ═══════════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  var KEY = 'benbat-consent';

  function readChoice() {
    try { return localStorage.getItem(KEY); } catch (e) { return null; }
  }

  function saveChoice(value) {
    try { localStorage.setItem(KEY, value); } catch (e) {}
  }

  // Retrait du consentement : on coupe la collecte et on efface les cookies
  // déjà déposés par Google Analytics sur ce domaine.
  function revoke() {
    if (typeof window.gtag === 'function') {
      window.gtag('consent', 'update', { analytics_storage: 'denied' });
    }
    var host = location.hostname;
    var domains = ['', host, '.' + host];
    var parts = host.split('.');
    if (parts.length > 2) domains.push('.' + parts.slice(-2).join('.'));

    document.cookie.split(';').forEach(function (raw) {
      var name = raw.split('=')[0].trim();
      if (!/^_ga|^_gid$|^_gat/.test(name)) return;
      domains.forEach(function (d) {
        document.cookie = name + '=; Max-Age=0; path=/' + (d ? '; domain=' + d : '');
      });
    });
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
          '<strong>Cookies de mesure d’audience</strong>' +
          '<p>Nous aimerions mesurer la fréquentation du site avec Google Analytics. ' +
          'Rien n’est déposé sans votre accord, et refuser ne change rien à votre navigation. ' +
          '<a href="mentions-legales#cookies">En savoir plus</a></p>' +
        '</div>' +
        '<div class="cookie-banner-actions">' +
          '<button type="button" class="btn btn-ghost" data-consent="denied">Refuser</button>' +
          '<button type="button" class="btn btn-primary" data-consent="granted">Accepter</button>' +
        '</div>' +
      '</div>';
    return el;
  }

  function open() {
    if (!banner) {
      banner = build();
      document.body.appendChild(banner);

      banner.addEventListener('click', function (e) {
        var btn = e.target.closest('[data-consent]');
        if (!btn) return;
        var choice = btn.getAttribute('data-consent');
        saveChoice(choice);
        if (choice === 'granted') {
          if (typeof window.benbatLoadGA === 'function') window.benbatLoadGA();
        } else {
          revoke();
        }
        close();
      });
    }
    // Un reflow forcé suffit à déclencher la transition CSS. On évite
    // requestAnimationFrame, suspendu quand l'onglet est en arrière-plan :
    // le bandeau resterait alors invisible.
    void banner.offsetHeight;
    banner.classList.add('is-open');
  }

  function close() {
    if (banner) banner.classList.remove('is-open');
  }

  // Premier passage : aucun choix enregistré
  var choice = readChoice();
  if (choice !== 'granted' && choice !== 'denied') open();

  // « Gérer les cookies » : rouvre le bandeau pour revenir sur son choix
  document.querySelectorAll('[data-cookie-settings]').forEach(function (link) {
    link.addEventListener('click', function (e) {
      e.preventDefault();
      open();
    });
  });
})();
