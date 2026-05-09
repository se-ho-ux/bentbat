(() => {
  'use strict';

  // ── Header scroll — glass effect on home, stays solid on inner pages ──────
  const header = document.getElementById('header');
  if (header) {
    const initSolid = header.classList.contains('solid');
    if (!initSolid) {
      // Home page: transparent → light frosted glass on scroll
      const onScroll = () => header.classList.toggle('scrolled', window.scrollY > 60);
      window.addEventListener('scroll', onScroll, { passive: true });
      onScroll(); // apply immediately if page loads already scrolled
    }
    // Inner pages keep their .solid (dark glass) class untouched
  }

  // ── Mobile menu ────────────────────────────────────────────────────────────
  const hamburger   = document.getElementById('hamburger');
  const mobileMenu  = document.getElementById('mobileMenu');
  const mobileClose = document.getElementById('mobileClose');

  if (mobileMenu) mobileMenu.setAttribute('aria-hidden', 'true');

  const openMenu = () => {
    mobileMenu?.classList.add('open');
    mobileMenu?.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    hamburger?.setAttribute('aria-expanded', 'true');
  };
  const closeMenu = () => {
    mobileMenu?.classList.remove('open');
    mobileMenu?.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    hamburger?.setAttribute('aria-expanded', 'false');
  };

  hamburger?.addEventListener('click', openMenu);
  mobileClose?.addEventListener('click', closeMenu);
  mobileMenu?.querySelectorAll('a').forEach(a => a.addEventListener('click', closeMenu));

  // ── Smooth scroll ──────────────────────────────────────────────────────────
  document.querySelectorAll('a[href^="#"]').forEach(a => {
    a.addEventListener('click', e => {
      const id = a.getAttribute('href');
      if (id === '#') return;
      const target = document.querySelector(id);
      if (!target) return;
      e.preventDefault();
      window.scrollTo({ top: target.getBoundingClientRect().top + window.scrollY - 80, behavior: 'smooth' });
    });
  });

  // ── Scroll reveal ──────────────────────────────────────────────────────────
  const revealObs = new IntersectionObserver(entries => {
    entries.forEach((entry, i) => {
      if (!entry.isIntersecting) return;
      const el = entry.target;
      const delay = (parseInt(el.dataset.delay ?? 0)) + (Array.from(el.parentElement?.querySelectorAll('.reveal') ?? []).indexOf(el) % 3) * 80;
      setTimeout(() => el.classList.add('visible'), delay);
      revealObs.unobserve(el);
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });

  document.querySelectorAll('.reveal').forEach(el => revealObs.observe(el));

  // ── Stats counter ──────────────────────────────────────────────────────────
  const animateCount = el => {
    const target = parseInt(el.dataset.target, 10);
    const dur = 1200;
    const step = target / (dur / 16);
    let cur = 0;
    const tick = () => {
      cur = Math.min(cur + step, target);
      el.textContent = Math.floor(cur);
      if (cur < target) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  };

  const statsObs = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      entry.target.querySelectorAll('.counter').forEach(animateCount);
      statsObs.unobserve(entry.target);
    });
  }, { threshold: 0.3 });

  document.querySelector('.stats-section')?.let?.(el => statsObs.observe(el));
  // fallback for environments without .let
  const statsSec = document.querySelector('.stats-section');
  if (statsSec) statsObs.observe(statsSec);

  // ── Contact form ───────────────────────────────────────────────────────────
  const form    = document.getElementById('contactForm');
  const success = document.getElementById('formSuccess');

  if (form && success) {
    const required = form.querySelectorAll('[required]');

    const validate = () => {
      let ok = true;
      required.forEach(f => {
        const valid = f.value.trim() !== '';
        f.classList.toggle('err', !valid);
        if (!valid) ok = false;
      });
      return ok;
    };

    required.forEach(f => f.addEventListener('input', () => f.classList.remove('err')));

    form.addEventListener('submit', e => {
      e.preventDefault();
      if (!validate()) return;
      const btn = form.querySelector('.form-submit');
      btn.disabled = true;
      btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>&nbsp; Envoi en cours…';
      // Formspree endpoint — remplacez YOUR_FORM_ID par l'ID obtenu sur formspree.io
      fetch('https://formspree.io/f/YOUR_FORM_ID', {
        method: 'POST',
        body: new FormData(form),
        headers: { 'Accept': 'application/json' }
      })
      .then(res => {
        if (res.ok) {
          form.style.display = 'none';
          success.style.display = 'block';
        } else {
          throw new Error('server');
        }
      })
      .catch(() => {
        btn.disabled = false;
        btn.innerHTML = 'Envoyer ma demande &nbsp;<i class="fas fa-paper-plane"></i>';
        let errEl = form.querySelector('.form-send-error');
        if (!errEl) {
          errEl = document.createElement('p');
          errEl.className = 'form-send-error';
          errEl.style.cssText = 'color:#dc2626;margin-top:12px;font-size:.9rem;text-align:center;';
          form.querySelector('.form-note').before(errEl);
        }
        errEl.textContent = "Une erreur s'est produite. Veuillez réessayer ou nous appeler directement.";
      });
    });
  }
})();
