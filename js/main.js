(() => {
  'use strict';

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ── Header scroll — glass effect ──────────────────────────────────────────
  const header = document.getElementById('header');
  if (header && !header.classList.contains('solid')) {
    const onScroll = () => header.classList.toggle('scrolled', window.scrollY > 60);
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  // ── Mobile menu — with focus trap, Escape, click-outside, focus return ────
  const hamburger   = document.getElementById('hamburger');
  const mobileMenu  = document.getElementById('mobileMenu');
  const mobileClose = document.getElementById('mobileClose');

  if (mobileMenu) mobileMenu.setAttribute('aria-hidden', 'true');

  const FOCUSABLE = 'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])';

  const openMenu = () => {
    mobileMenu?.classList.add('open');
    mobileMenu?.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    hamburger?.setAttribute('aria-expanded', 'true');
    // Move focus to close button
    setTimeout(() => mobileClose?.focus(), 50);
  };

  const closeMenu = () => {
    mobileMenu?.classList.remove('open');
    mobileMenu?.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    hamburger?.setAttribute('aria-expanded', 'false');
    // Return focus to trigger
    hamburger?.focus();
  };

  hamburger?.addEventListener('click', openMenu);
  mobileClose?.addEventListener('click', closeMenu);

  // Close on nav link click
  mobileMenu?.querySelectorAll('a').forEach(a => a.addEventListener('click', closeMenu));

  // Escape key closes menu
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && mobileMenu?.classList.contains('open')) closeMenu();
  });

  // Click outside closes menu
  mobileMenu?.addEventListener('click', e => {
    if (e.target === mobileMenu) closeMenu();
  });

  // Focus trap inside mobile menu
  mobileMenu?.addEventListener('keydown', e => {
    if (e.key !== 'Tab') return;
    const focusable = [...mobileMenu.querySelectorAll(FOCUSABLE)];
    if (!focusable.length) return;
    const first = focusable[0];
    const last  = focusable[focusable.length - 1];
    if (e.shiftKey) {
      if (document.activeElement === first) { e.preventDefault(); last.focus(); }
    } else {
      if (document.activeElement === last)  { e.preventDefault(); first.focus(); }
    }
  });

  // ── Smooth scroll ──────────────────────────────────────────────────────────
  document.querySelectorAll('a[href^="#"]').forEach(a => {
    a.addEventListener('click', e => {
      const id = a.getAttribute('href');
      if (id === '#') return;
      const target = document.querySelector(id);
      if (!target) return;
      e.preventDefault();
      target.scrollIntoView({ behavior: prefersReducedMotion ? 'auto' : 'smooth', block: 'start' });
    });
  });


  // ── Stats counter — respects prefers-reduced-motion ───────────────────────
  const animateCount = el => {
    if (prefersReducedMotion) {
      el.textContent = el.dataset.target;
      return;
    }
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

  const statsSec = document.querySelector('.stats-section');
  if (statsSec) statsObs.observe(statsSec);

  // ── Contact form — inline validation + aria-live errors ───────────────────
  const form    = document.getElementById('contactForm');
  const success = document.getElementById('formSuccess');

  if (form && success) {
    const required = form.querySelectorAll('[required]');

    const ERROR_MESSAGES = {
      nom:       'Veuillez indiquer votre nom.',
      prenom:    'Veuillez indiquer votre prénom.',
      email:     'Veuillez indiquer une adresse email valide.',
      telephone: 'Veuillez indiquer votre numéro de téléphone.',
      type:      'Veuillez sélectionner un type de demande.',
      message:   'Veuillez décrire votre projet.',
    };

    const getError = field => ERROR_MESSAGES[field.name] ?? 'Ce champ est requis.';

    const showError = field => {
      field.classList.add('err');
      field.setAttribute('aria-invalid', 'true');
      let errEl = field.parentElement.querySelector('.field-error');
      if (!errEl) {
        errEl = document.createElement('span');
        errEl.className = 'field-error';
        errEl.setAttribute('role', 'alert');
        field.after(errEl);
      }
      errEl.textContent = getError(field);
    };

    const clearError = field => {
      field.classList.remove('err');
      field.removeAttribute('aria-invalid');
      field.parentElement.querySelector('.field-error')?.remove();
    };

    // Validate on blur (not on every keystroke)
    required.forEach(f => {
      f.addEventListener('blur', () => {
        if (f.value.trim() === '') showError(f);
        else clearError(f);
      });
      f.addEventListener('input', () => {
        if (f.value.trim() !== '') clearError(f);
      });
    });

    const validate = () => {
      let firstInvalid = null;
      required.forEach(f => {
        if (f.value.trim() === '') {
          showError(f);
          if (!firstInvalid) firstInvalid = f;
        } else {
          clearError(f);
        }
      });
      if (firstInvalid) firstInvalid.focus();
      return !firstInvalid;
    };

    form.addEventListener('submit', e => {
      e.preventDefault();
      if (!validate()) return;
      const btn = form.querySelector('.form-submit');
      btn.disabled = true;
      btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>&nbsp; Envoi en cours…';

      fetch('https://formspree.io/f/YOUR_FORM_ID', {
        method: 'POST',
        body: new FormData(form),
        headers: { 'Accept': 'application/json' }
      })
      .then(res => {
        if (res.ok) {
          form.style.display = 'none';
          success.style.display = 'block';
          success.setAttribute('tabindex', '-1');
          success.focus();
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
          errEl.setAttribute('role', 'alert');
          errEl.setAttribute('aria-live', 'assertive');
          errEl.style.cssText = 'color:#dc2626;margin-top:12px;font-size:.9rem;text-align:center;font-weight:600;';
          form.querySelector('.form-note').before(errEl);
        }
        errEl.textContent = "Une erreur s'est produite. Veuillez réessayer ou nous appeler directement.";
      });
    });
  }
})();
