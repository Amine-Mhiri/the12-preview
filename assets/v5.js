/* the12 — v5 prototype behaviour.
   Tokens, header, menu, reveals, the S1 hero loop (all motion is CSS;
   JS only starts it and pauses it off screen), term tooltips. */
(function () {
  'use strict';

  var body = document.body;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---- S1 hero: the shelf, the scanner and the safe zone -----------------
     All motion is CSS on one 16.2s clock (v5-loop.css) and always runs; the
     stage carries .loop from the markup, so it runs without this script. The
     clock starts at 35% of the cycle (--t0 in v5.css), so the scanner arrives
     about half a second after the hero lands. JS only pauses it off screen. */
  try {
    var stage = document.getElementById('stage');
    if (stage) {
      stage.classList.add('loop');
      if ('IntersectionObserver' in window) {
        new IntersectionObserver(function (entries) {
          stage.classList.toggle('paused', !entries[0].isIntersecting);
        }).observe(stage);
      }
    }
  } catch (err) { /* the loop still runs from the markup */ }

  /* ---- S2: one stage, two ways to shop ------------------------------------
     A 6s CSS clock cross-fades the two drawings; each drawing runs its own 3s
     loop, so it is always on its first frame when its half comes round. JS only
     counts "Spent on claims" off the aisle drawing's clock and pauses the stage
     while it is off screen. */
  try {
    var ways = document.getElementById('ways');
    var spent = document.getElementById('spent');
    var aisleClk = document.querySelector('.cs-aisle .cclk');
    var AISLE = 3000, lastSpent = '';
    var spentTick = function () {
      var a = aisleClk && aisleClk.getAnimations ? aisleClk.getAnimations()[0] : null;
      if (a && a.currentTime !== null && spent) {
        var t = ((a.currentTime % AISLE) + AISLE) % AISLE;
        var f = Math.min(t / (AISLE * 0.8), 1), v = Math.round(84 * (1 - Math.pow(1 - f, 2)));
        var txt = '$' + v;
        if (txt !== lastSpent) { spent.textContent = txt; lastSpent = txt; }
      }
      requestAnimationFrame(spentTick);
    };
    requestAnimationFrame(spentTick);
    if (ways && 'IntersectionObserver' in window) {
      new IntersectionObserver(function (entries) {
        ways.classList.toggle('paused', !entries[0].isIntersecting);
      }).observe(ways);
    }
  } catch (err) { /* the stage still loops from CSS */ }

  /* ---- Number tokens ---------------------------------------------------- */
  var tokens = {
    analyzed: body.getAttribute('data-analyzed') || '10,450',
    eliminated: body.getAttribute('data-eliminated') || '8,360',
    rate: body.getAttribute('data-rate') || '80%'
  };
  document.querySelectorAll('[data-tally]').forEach(function (el) {
    var v = tokens[el.getAttribute('data-tally')];
    if (v) el.textContent = v;
  });

  /* ---- Header: hairline shadow after 8px -------------------------------- */
  var hdr = document.getElementById('hdr');
  function onScroll() { hdr.classList.toggle('scrolled', window.scrollY > 8); }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ---- Mobile menu ------------------------------------------------------ */
  var burger = hdr.querySelector('.burger');
  var menu = document.getElementById('menu');
  function setMenu(open) {
    burger.setAttribute('aria-expanded', String(open));
    burger.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    if (open) menu.style.top = Math.max(0, hdr.querySelector('.mast').getBoundingClientRect().bottom) + 'px';
    menu.hidden = !open;
    document.documentElement.style.overflow = open ? 'hidden' : '';
    if (open) { var first = menu.querySelector('a'); if (first) first.focus(); }
  }
  burger.addEventListener('click', function () { setMenu(menu.hidden); });
  menu.addEventListener('click', function (e) { if (e.target.closest('a')) setMenu(false); });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && !menu.hidden) { setMenu(false); burger.focus(); }
  });
  var mq = window.matchMedia('(min-width: 1025px)');
  (mq.addEventListener ? mq.addEventListener.bind(mq, 'change') : mq.addListener.bind(mq))(function (m) { if (m.matches) setMenu(false); });

  /* ---- Mega panels. One open at a time. A category button opens on hover
     (120ms intent), click or keyboard focus. A button marked data-open="click"
     opens only on click: the masthead CTA is a primary action, and a full-width
     panel that drops on hover or on tab-focus gets in the way of reaching it.
     Closes on mouseleave (150ms grace), Escape, outside click or a second
     click on the same button; 160ms fade/slide (CSS) ------------------------ */
  var catBtns = hdr.querySelectorAll('.cat-btn[aria-controls]');
  var openBtn = null, openedBy = '', openedAt = 0, openT = 0, closeT = 0, noFocusOpen = false;
  var canHover = window.matchMedia('(hover: hover)').matches;
  function panelOf(btn) { return document.getElementById(btn.getAttribute('aria-controls')); }
  function closePanel(btn, instant) {
    var panel = panelOf(btn);
    btn.setAttribute('aria-expanded', 'false');
    panel.classList.remove('open');
    if (instant) panel.hidden = true;
    else setTimeout(function () { if (btn.getAttribute('aria-expanded') === 'false') panel.hidden = true; }, 170);
    if (openBtn === btn) openBtn = null;
  }
  function openPanel(btn, how) {
    clearTimeout(openT); clearTimeout(closeT);
    if (openBtn === btn) return;
    if (openBtn) closePanel(openBtn, true);
    var panel = panelOf(btn);
    panel.hidden = false;
    btn.setAttribute('aria-expanded', 'true');
    requestAnimationFrame(function () { requestAnimationFrame(function () { panel.classList.add('open'); }); });
    openBtn = btn; openedBy = how; openedAt = Date.now();
  }
  function scheduleClose() {
    clearTimeout(openT); clearTimeout(closeT);
    closeT = setTimeout(function () { if (openBtn) closePanel(openBtn); }, 150);
  }
  catBtns.forEach(function (btn) {
    var panel = panelOf(btn);
    var clickOnly = btn.getAttribute('data-open') === 'click';
    btn.addEventListener('click', function () {
      clearTimeout(openT);
      /* Below the desktop breakpoint the panel container is display:none, so
         this would be a dead control. Hand it to the phone menu instead. */
      if (panel.parentElement && getComputedStyle(panel.parentElement).display === 'none') {
        setMenu(menu.hidden);
        return;
      }
      if (openBtn !== btn) { openPanel(btn, 'click'); return; }
      /* a click that lands right after the hover opened it keeps it open */
      if (openedBy === 'hover' && Date.now() - openedAt < 700) { openedBy = 'click'; return; }
      closePanel(btn);
    });
    btn.addEventListener('focus', function () {
      if (noFocusOpen || clickOnly) return;
      var kb = true; try { kb = btn.matches(':focus-visible'); } catch (e) {}
      if (kb) openPanel(btn, 'focus');
    });
    if (canHover && !clickOnly) {
      btn.addEventListener('mouseenter', function () {
        clearTimeout(closeT); clearTimeout(openT);
        if (openBtn === btn) return;
        openT = setTimeout(function () { openPanel(btn, 'hover'); }, 120);
      });
      btn.addEventListener('mouseleave', scheduleClose);
      panel.addEventListener('mouseenter', function () { clearTimeout(closeT); });
      panel.addEventListener('mouseleave', scheduleClose);
    }
  });
  document.addEventListener('click', function (e) {
    if (openBtn && !e.target.closest('.cat-btn') && !e.target.closest('.mp-in')) closePanel(openBtn);
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && openBtn) {
      var b = openBtn; closePanel(b);
      noFocusOpen = true; b.focus(); noFocusOpen = false;
    }
  });
  /* keyboard: leaving the button and its panel closes it */
  document.addEventListener('focusin', function (e) {
    if (openBtn && openedBy === 'focus' && !e.target.closest('.cat-btn') && !e.target.closest('.cat-panel')) closePanel(openBtn);
  });

  /* The phone menu is a flat list now: every category and product type is
     visible at once, so there is nothing left to expand. ------------------- */

  /* ---- Sections rise in once ------------------------------------------- */
  var reveals = document.querySelectorAll('.reveal');
  if (reduce || !('IntersectionObserver' in window)) {
    reveals.forEach(function (el) { el.classList.add('in'); });
  } else {
    var ro = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add('in'); ro.unobserve(en.target); }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    reveals.forEach(function (el) { ro.observe(el); });
  }

  /* ---- Newsletter (S7c) --------------------------------------------------
     The form posts normally once data-endpoint holds a list URL. While it is
     empty, submitting says so instead of implying the address was stored. */
  try {
    var news = document.querySelector('.news-form');
    if (news) {
      var note = document.getElementById('news-note');
      var noteRest = note.textContent;
      news.addEventListener('submit', function (e) {
        if (news.getAttribute('data-endpoint')) return;   /* a real endpoint: let it post */
        e.preventDefault();
        var email = news.querySelector('input[type="email"]');
        note.textContent = email.value && email.validity.valid
          ? 'Sign-up is not connected yet \u2014 set data-endpoint on this form.'
          : 'Enter an email address we can write to.';
        note.classList.add('is-msg');
      });
      news.addEventListener('input', function () {
        if (!note.classList.contains('is-msg')) return;
        note.textContent = noteRest;
        note.classList.remove('is-msg');
      });
    }
  } catch (err) { /* the form still posts once an endpoint is set */ }

  /* ---- Term tooltips: hover + focus in CSS; tap/click toggles ------------ */
  var terms = document.querySelectorAll('.term');
  function closeAll(except) {
    terms.forEach(function (t) { if (t !== except) t.setAttribute('aria-expanded', 'false'); });
  }
  terms.forEach(function (t) {
    t.addEventListener('click', function () {
      var open = t.getAttribute('aria-expanded') !== 'true';
      closeAll(t);
      t.setAttribute('aria-expanded', String(open));
    });
    t.addEventListener('blur', function () { t.setAttribute('aria-expanded', 'false'); t.removeAttribute('data-dismissed'); });
    t.addEventListener('focus', function () { t.removeAttribute('data-dismissed'); });
  });
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    closeAll();
    var a = document.activeElement;
    if (a && a.classList && a.classList.contains('term')) a.setAttribute('data-dismissed', '');
  });
})();
