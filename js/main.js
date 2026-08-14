(() => {
  'use strict';

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ── Header scroll — glass effect ──────────────────────────────────────────
  const header = document.getElementById('header');
  if (header && !header.classList.contains('solid')) {
    let isScrolled = false;
    const onScroll = () => {
      const y = window.scrollY;
      if (!isScrolled && y > 10) {
        isScrolled = true;
        header.classList.add('scrolled');
      } else if (isScrolled && y < 5) {
        isScrolled = false;
        header.classList.remove('scrolled');
      }
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  // ── Mobile menu — with focus trap, Escape, click-outside, focus return ────
  const hamburger   = document.getElementById('hamburger');
  const mobileMenu  = document.getElementById('mobileMenu');
  const mobileClose = document.getElementById('mobileClose');
  const stickyCta      = document.getElementById('stickyCta');
  let   heroPassed     = false;
  let   ctaSecVisible  = false;

  const refreshStickyCta = () => {
    if (!stickyCta) return;
    const show = heroPassed && !ctaSecVisible && !mobileMenu?.classList.contains('open');
    stickyCta.classList.toggle('is-visible', show);
    stickyCta.setAttribute('aria-hidden', String(!show));
  };

  if (mobileMenu) mobileMenu.setAttribute('aria-hidden', 'true');

  // Mark active page link.
  // Les liens vers l'accueil s'écrivent "/" (URL canonique), mais le fichier
  // servi reste index.html : on ramène les deux formes à une même clé.
  const pageKey = path => {
    const file = path.split('/').pop().split('#')[0].split('?')[0];
    return (file === '' || file === 'index.html') ? '/' : file;
  };
  const currentPage = pageKey(window.location.pathname);
  mobileMenu?.querySelectorAll('a[href]').forEach(a => {
    const href = a.getAttribute('href');
    if (/^(tel:|mailto:|https?:)/.test(href)) return;
    if (pageKey(href) === currentPage) {
      a.classList.add('active');
    }
  });

  const FOCUSABLE = 'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])';

  const openMenu = () => {
    mobileMenu?.classList.add('open');
    mobileMenu?.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    hamburger?.setAttribute('aria-expanded', 'true');
    // Hide sticky CTA while menu is open
    refreshStickyCta();
    setTimeout(() => mobileClose?.focus(), 50);
  };

  const closeMenu = () => {
    mobileMenu?.classList.remove('open');
    mobileMenu?.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    hamburger?.setAttribute('aria-expanded', 'false');
    // Restore sticky CTA if conditions still met
    refreshStickyCta();
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

  // ── FAQ accordion ──────────────────────────────────────────────────────────
  document.querySelectorAll('.faq-q').forEach(btn => {
    btn.addEventListener('click', () => {
      const item = btn.closest('.faq-item');
      const isOpen = item.classList.contains('open');
      document.querySelectorAll('.faq-item.open').forEach(el => {
        el.classList.remove('open');
        el.querySelector('.faq-q').setAttribute('aria-expanded', 'false');
      });
      if (!isOpen) {
        item.classList.add('open');
        btn.setAttribute('aria-expanded', 'true');
      }
    });
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


  // ── Sticky mobile CTA — appears when hero CTA button leaves viewport ─────
  const heroDevis = document.getElementById('heroDevis');
  if (stickyCta && heroDevis) {
    const heroObs = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        heroPassed = !entry.isIntersecting;
        refreshStickyCta();
      });
    }, { threshold: 0 });
    heroObs.observe(heroDevis);
  }

  // ── Hide sticky CTA when the page CTA section ("Votre projet...") is visible ─
  const ctaSection = document.getElementById('ctaSection');
  if (stickyCta && ctaSection) {
    const ctaSecObs = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        ctaSecVisible = entry.isIntersecting;
        refreshStickyCta();
      });
    }, { threshold: 0 });
    ctaSecObs.observe(ctaSection);
  }

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

      fetch('https://formspree.io/f/xaqkjnao', {
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

  // ── Arrow hint animation — triggered when savoir-faire list enters viewport ─
  document.querySelectorAll('.services-list').forEach(list => {
    if (!list.querySelector('.sr-arrow')) return;
    const obs = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('arrows-ready');
        obs.unobserve(entry.target);
      });
    }, { threshold: 0.15 });
    obs.observe(list);
  });


})();


// ── Carrousel homepage (hpTrack) ─────────────────────────────────────────────
(function() {
      const track   = document.getElementById('hpTrack');
      if (!track) return;
      const prevBtn = document.getElementById('hpPrev');
      const nextBtn = document.getElementById('hpNext');
      const fill    = document.getElementById('hpFill');
      const counter = document.getElementById('hpCounter');
      const slides  = Array.from(track.querySelectorAll('.hp-slide'));
      const total   = slides.length;
      const GAP     = 12;
      let current   = 0;
      let hpOffset  = 0;

      function slideW() { return slides[0].offsetWidth + GAP; }

      function maxIdx() {
        const tw = total * slideW() - GAP;
        const cw = track.parentElement.offsetWidth;
        return Math.max(0, Math.ceil((tw - cw) / slideW()));
      }

      function goTo(idx) {
        const max = maxIdx();
        current = Math.max(0, Math.min(idx, max));
        hpOffset = current * slideW();
        track.style.transition = '';
        track.style.transform = 'translateX(-' + hpOffset + 'px)';
        prevBtn.disabled = current === 0;
        nextBtn.disabled = current >= max;
        if (max === 0) {
          fill.style.width = '100%';
        } else {
          var visibleFrac = (total - max) / total;
          fill.style.width = (visibleFrac + (1 - visibleFrac) * (current / max)) * 100 + '%';
        }
        if (counter) counter.textContent = (current + 1) + ' / ' + total;
      }

      prevBtn.addEventListener('click', function() { goTo(current - 1); });
      nextBtn.addEventListener('click', function() { goTo(current + 1); });

      var tx = 0, dragging = false;
      track.addEventListener('touchstart', function(e) {
        tx = e.changedTouches[0].clientX;
        dragging = true;
        track.style.transition = 'none';
      }, { passive: true });
      track.addEventListener('touchmove', function(e) {
        if (!dragging) return;
        var dx = e.changedTouches[0].clientX - tx;
        track.style.transform = 'translateX(' + (-hpOffset + dx) + 'px)';
      }, { passive: true });
      track.addEventListener('touchend', function(e) {
        if (!dragging) return;
        dragging = false;
        var dx = e.changedTouches[0].clientX - tx;
        track.style.transition = '';
        if (Math.abs(dx) > 32) { if (dx < 0) goTo(current + 1); else goTo(current - 1); }
        else goTo(current);
      }, { passive: true });

      window.addEventListener('resize', function() { goTo(Math.min(current, maxIdx())); }, { passive: true });

      // ── Horizontal scroll fluide (trackpad / molette) ────────
      var wrap = track.parentElement.parentElement;
      var hpSnapTimer = null;
      wrap.addEventListener('wheel', function(e) {
        if (Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return;
        e.preventDefault();
        clearTimeout(hpSnapTimer);
        var maxOff = maxIdx() * slideW();
        hpOffset = Math.max(0, Math.min(hpOffset + e.deltaX, maxOff));
        track.style.transition = 'none';
        track.style.transform  = 'translateX(-' + hpOffset + 'px)';
        hpSnapTimer = setTimeout(function() {
          goTo(Math.round(hpOffset / slideW()));
        }, 180);
      }, { passive: false });

      goTo(0);
    })();

// ── Carrousel & lightbox réalisations (rlTrack) ──────────────────────────────
(function() {
      const btns      = document.querySelectorAll('.pf-btn');
      const rlTrack   = document.getElementById('rlTrack');
      const items     = rlTrack ? Array.from(rlTrack.querySelectorAll('.gallery-item')) : [];
      const rlPrevBtn = document.getElementById('rlPrev');
      const rlNextBtn = document.getElementById('rlNext');
      const rlFillEl  = document.getElementById('rlFill');
      const rlCntEl   = document.getElementById('rlCounter');
      const RL_GAP    = 12;
      let rlCurrent   = 0;
      let rlOffset    = 0;

      function rlGetVis() { return items.filter(s => !s.classList.contains('rl-hidden')); }

      function rlGoTo(idx) {
        if (!rlTrack) return;
        const vis = rlGetVis();
        if (!vis.length) {
          rlTrack.style.transform = 'translateX(0)';
          if (rlPrevBtn) rlPrevBtn.disabled = true;
          if (rlNextBtn) rlNextBtn.disabled = true;
          return;
        }
        const sw  = vis[0].offsetWidth + RL_GAP;
        const tw  = vis.length * sw - RL_GAP;
        const cw  = rlTrack.parentElement.offsetWidth;
        const max = Math.max(0, Math.ceil((tw - cw) / sw));
        rlCurrent = Math.max(0, Math.min(idx, max));
        rlOffset  = rlCurrent * sw;
        rlTrack.style.transition = '';
        rlTrack.style.transform  = 'translateX(-' + rlOffset + 'px)';
        if (rlPrevBtn) rlPrevBtn.disabled = rlCurrent === 0;
        if (rlNextBtn) rlNextBtn.disabled = rlCurrent >= max;
        if (rlFillEl) {
          const vf = max === 0 ? 1 : (vis.length - max) / vis.length;
          rlFillEl.style.width = (max === 0 ? 100 : (vf + (1 - vf) * rlCurrent / max) * 100) + '%';
        }
        if (rlCntEl) rlCntEl.textContent = (rlCurrent + 1) + ' / ' + (max + 1);
      }

      // ── Filters ──────────────────────────────────────────────
      btns.forEach(btn => {
        btn.addEventListener('click', () => {
          btns.forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          const f = btn.dataset.filter;
          items.forEach(item => item.classList.toggle('rl-hidden', f !== 'all' && item.dataset.category !== f));
          rlGoTo(0);
          const wrap = rlTrack ? rlTrack.closest('.hp-carousel-wrap') : null;
          if (wrap) {
            setTimeout(() => {
              const rect = wrap.getBoundingClientRect();
              if (rect.top > window.innerHeight * 0.55 || rect.top < 88) {
                const behavior = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';
                window.scrollTo({ top: rect.top + window.scrollY - 88, behavior });
              }
            }, 50);
          }
        });
      });

      if (rlPrevBtn) rlPrevBtn.addEventListener('click', () => rlGoTo(rlCurrent - 1));
      if (rlNextBtn) rlNextBtn.addEventListener('click', () => rlGoTo(rlCurrent + 1));

      let rlTx = 0, rlDragging = false;
      if (rlTrack) {
        rlTrack.addEventListener('touchstart', e => {
          rlTx = e.changedTouches[0].clientX;
          rlDragging = true;
          rlTrack.style.transition = 'none';
        }, { passive: true });
        rlTrack.addEventListener('touchmove', e => {
          if (!rlDragging) return;
          const dx = e.changedTouches[0].clientX - rlTx;
          rlTrack.style.transform = 'translateX(' + (-rlOffset + dx) + 'px)';
        }, { passive: true });
        rlTrack.addEventListener('touchend', e => {
          if (!rlDragging) return;
          rlDragging = false;
          const dx = e.changedTouches[0].clientX - rlTx;
          rlTrack.style.transition = '';
          if (Math.abs(dx) > 32) rlGoTo(dx < 0 ? rlCurrent + 1 : rlCurrent - 1);
          else rlGoTo(rlCurrent);
        }, { passive: true });
      }

      window.addEventListener('resize', () => {
        const vis = rlGetVis();
        if (!vis.length) return;
        const sw  = vis[0].offsetWidth + RL_GAP;
        const max = Math.max(0, Math.ceil((vis.length * sw - RL_GAP - rlTrack.parentElement.offsetWidth) / sw));
        rlGoTo(Math.min(rlCurrent, max));
      }, { passive: true });

      // ── Horizontal scroll fluide (trackpad / molette) ────────
      const rlWrap = rlTrack ? rlTrack.closest('.hp-carousel-wrap') : null;
      let rlSnapTimer = null;
      if (rlWrap) {
        rlWrap.addEventListener('wheel', e => {
          if (Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return;
          e.preventDefault();
          clearTimeout(rlSnapTimer);
          const vis = rlGetVis();
          if (!vis.length) return;
          const sw     = vis[0].offsetWidth + RL_GAP;
          const maxOff = Math.max(0, vis.length * sw - RL_GAP - rlTrack.parentElement.offsetWidth);
          rlOffset = Math.max(0, Math.min(rlOffset + e.deltaX, maxOff));
          rlTrack.style.transition = 'none';
          rlTrack.style.transform  = 'translateX(-' + rlOffset + 'px)';
          rlSnapTimer = setTimeout(() => rlGoTo(Math.round(rlOffset / sw)), 180);
        }, { passive: false });
      }

      rlGoTo(0);

      // ── Lightbox ─────────────────────────────────────────────
      const overlay   = document.getElementById('lightbox');
      const lbImg     = document.getElementById('lbImg');
      const lbLabel   = document.getElementById('lbLabel');
      const lbCounter = document.getElementById('lbCounter');
      const lbCloseBtn = document.getElementById('lbClose');
      const lbPrevBtn  = document.getElementById('lbPrev');
      const lbNextBtn  = document.getElementById('lbNext');

      // La lightbox n'existe que sur la page Réalisations : sans ce garde-fou,
      // toutes les autres pages lèvent une TypeError en fin de script.
      if (!overlay || !lbCloseBtn || !lbPrevBtn || !lbNextBtn) return;

      let lbIdx = 0;

      function lbGetVis() { return items.filter(i => !i.classList.contains('rl-hidden')); }

      function lbUpdate(dir) {
        const vis = lbGetVis();
        const item = vis[lbIdx];
        if (!item) return;
        const img = item.querySelector('img');
        lbImg.src = img.src;
        lbImg.alt = img.alt;
        lbLabel.textContent   = (item.querySelector('.gallery-label') || {}).textContent || '';
        lbCounter.textContent = (lbIdx + 1) + ' / ' + vis.length;
        lbImg.classList.remove('slide-left', 'slide-right');
        void lbImg.offsetWidth;
        if (dir === 'left')  lbImg.classList.add('slide-left');
        if (dir === 'right') lbImg.classList.add('slide-right');
      }

      function lbOpen(idx) { lbIdx = idx; lbUpdate('left'); overlay.classList.add('is-open'); document.body.style.overflow = 'hidden'; }
      function lbClose()   { overlay.classList.remove('is-open'); document.body.style.overflow = ''; }
      function lbNext()    { const vis = lbGetVis(); lbIdx = (lbIdx + 1) % vis.length; lbUpdate('left'); }
      function lbPrev()    { const vis = lbGetVis(); lbIdx = (lbIdx - 1 + vis.length) % vis.length; lbUpdate('right'); }

      items.forEach(item => {
        item.addEventListener('click', () => {
          const vis = lbGetVis();
          const idx = vis.indexOf(item);
          if (idx !== -1) lbOpen(idx);
        });
      });

      lbCloseBtn.addEventListener('click', lbClose);
      lbNextBtn.addEventListener('click',  lbNext);
      lbPrevBtn.addEventListener('click',  lbPrev);
      overlay.addEventListener('click', e => { if (e.target === overlay) lbClose(); });

      document.addEventListener('keydown', e => {
        if (!overlay.classList.contains('is-open')) return;
        if (e.key === 'Escape')     lbClose();
        if (e.key === 'ArrowRight') lbNext();
        if (e.key === 'ArrowLeft')  lbPrev();
      });

      let lbTouchX = 0;
      overlay.addEventListener('touchstart', e => { lbTouchX = e.changedTouches[0].clientX; }, { passive: true });
      overlay.addEventListener('touchend', e => {
        const dx = e.changedTouches[0].clientX - lbTouchX;
        if (Math.abs(dx) > 48) { if (dx < 0) lbNext(); else lbPrev(); }
      }, { passive: true });
    })();
