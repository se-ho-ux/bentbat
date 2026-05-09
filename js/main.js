(() => {
  'use strict';

  // ── Header scroll ──────────────────────────────────────────────────────────
  const header = document.getElementById('header');
  const isInnerPage = header && header.classList.contains('scrolled');

  if (header && !isInnerPage) {
    const onScroll = () => {
      header.classList.toggle('scrolled', window.scrollY > 60);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
  }

  // ── Mobile menu ────────────────────────────────────────────────────────────
  const hamburger = document.getElementById('hamburger');
  const mobileMenu = document.getElementById('mobileMenu');
  const mobileMenuClose = document.getElementById('mobileMenuClose');

  const openMenu = () => {
    mobileMenu.classList.add('open');
    document.body.style.overflow = 'hidden';
    hamburger.setAttribute('aria-expanded', 'true');
  };

  const closeMenu = () => {
    mobileMenu.classList.remove('open');
    document.body.style.overflow = '';
    hamburger.setAttribute('aria-expanded', 'false');
  };

  if (hamburger) hamburger.addEventListener('click', openMenu);
  if (mobileMenuClose) mobileMenuClose.addEventListener('click', closeMenu);
  if (mobileMenu) {
    mobileMenu.querySelectorAll('a').forEach(a => a.addEventListener('click', closeMenu));
  }

  // ── Smooth scroll ──────────────────────────────────────────────────────────
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', e => {
      const id = anchor.getAttribute('href');
      if (id === '#') return;
      const target = document.querySelector(id);
      if (!target) return;
      e.preventDefault();
      const top = target.getBoundingClientRect().top + window.scrollY - 80;
      window.scrollTo({ top, behavior: 'smooth' });
    });
  });

  // ── Stats counter ──────────────────────────────────────────────────────────
  const animateCounter = el => {
    const target = parseInt(el.dataset.target, 10);
    const duration = 1200;
    const step = target / (duration / 16);
    let current = 0;
    const tick = () => {
      current = Math.min(current + step, target);
      el.textContent = Math.floor(current);
      if (current < target) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  };

  const statsObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      entry.target.querySelectorAll('.counter').forEach(animateCounter);
      statsObserver.unobserve(entry.target);
    });
  }, { threshold: 0.3 });

  const statsSection = document.querySelector('.stats-section');
  if (statsSection) statsObserver.observe(statsSection);

  // ── Scroll reveal ──────────────────────────────────────────────────────────
  const revealTargets = document.querySelectorAll(
    '.service-card, .testimonial-card, .value-card, .team-card, .why-point, .contact-info-card'
  );

  revealTargets.forEach((el, i) => {
    el.style.cssText += `opacity:0;transform:translateY(24px);transition:opacity .5s ease ${(i % 3) * 80}ms,transform .5s ease ${(i % 3) * 80}ms`;
  });

  const revealObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      entry.target.style.opacity = '1';
      entry.target.style.transform = 'translateY(0)';
      revealObserver.unobserve(entry.target);
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });

  revealTargets.forEach(el => revealObserver.observe(el));

  // ── Contact form ───────────────────────────────────────────────────────────
  const contactForm = document.getElementById('contactForm');
  const formSuccess = document.getElementById('formSuccess');

  if (contactForm && formSuccess) {
    const requiredFields = contactForm.querySelectorAll('[required]');

    const validate = () => {
      let ok = true;
      requiredFields.forEach(field => {
        const valid = field.value.trim() !== '';
        field.classList.toggle('error', !valid);
        if (!valid) ok = false;
      });
      return ok;
    };

    requiredFields.forEach(field => {
      field.addEventListener('input', () => field.classList.remove('error'));
    });

    contactForm.addEventListener('submit', e => {
      e.preventDefault();
      if (!validate()) return;

      const btn = contactForm.querySelector('.form-submit');
      btn.disabled = true;
      btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>&nbsp; Envoi en cours…';

      // Simulated submission — replace with fetch() to a real endpoint
      setTimeout(() => {
        contactForm.style.display = 'none';
        formSuccess.style.display = 'block';
      }, 1400);
    });
  }
})();
