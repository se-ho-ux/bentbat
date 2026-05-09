(() => {
  'use strict';

  // ── Header scroll (transparent → solid) ───────────────────────────────────
  const header = document.getElementById('header');
  if (header) {
    const isSolid = header.classList.contains('solid');
    const onScroll = () => header.classList.toggle('solid', window.scrollY > 60);
    window.addEventListener('scroll', onScroll, { passive: true });
    if (!isSolid) onScroll();
  }

  // ── Mobile menu ────────────────────────────────────────────────────────────
  const hamburger   = document.getElementById('hamburger');
  const mobileMenu  = document.getElementById('mobileMenu');
  const mobileClose = document.getElementById('mobileClose');

  const openMenu = () => {
    mobileMenu?.classList.add('open');
    document.body.style.overflow = 'hidden';
    hamburger?.setAttribute('aria-expanded', 'true');
  };
  const closeMenu = () => {
    mobileMenu?.classList.remove('open');
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
      // Replace setTimeout with fetch() to a real endpoint
      setTimeout(() => {
        form.style.display = 'none';
        success.style.display = 'block';
      }, 1500);
    });
  }
})();
