/* the12 — v5 prototype behaviour.
   Tokens, header, menu, reveals, the S1 hero loop (all motion is CSS;
   JS only starts it and pauses it off screen), term tooltips. */
(function () {
  'use strict';

  var body = document.body;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---- S1 hero: the shelf, the scanner and the safe zone -----------------
     All motion is CSS on one 16.2s clock (v5-loop.css) and always runs; the
     stage carries .loop from the markup, so it runs without this script. JS
     pauses it while off screen and writes the progress label, read from the
     shared clock (0% at the start, 100% at the end of the safe-zone hold). */
  try {
    var stage = document.getElementById('stage');
    if (stage) {
      stage.classList.add('loop');
      var CYCLE = 16200, HOLD_END = 15400;
      var pct = document.getElementById('stage-pct');
      var clocks = stage.querySelectorAll('.clk'), raf = 0, last = '';
      var clock = function () {
        for (var i = 0; i < clocks.length; i++) {
          var a = clocks[i].getAnimations ? clocks[i].getAnimations() : [];
          if (a.length) return a[0];
        }
        return null;
      };
      var tick = function () {
        var a = clock();
        if (a && a.currentTime !== null && pct) {
          var t = ((a.currentTime % CYCLE) + CYCLE) % CYCLE;
          var txt = Math.min(100, Math.max(0, Math.floor(t / HOLD_END * 100))) + '%';
          if (txt !== last) { pct.textContent = txt; last = txt; }
        }
        raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
      if ('IntersectionObserver' in window) {
        new IntersectionObserver(function (entries) {
          var on = entries[0].isIntersecting;
          stage.classList.toggle('paused', !on);
          cancelAnimationFrame(raf);
          if (on) raf = requestAnimationFrame(tick);
        }).observe(stage);
      }
    }
  } catch (err) { /* the loop still runs from the markup */ }

  /* ---- S2 cards: two 8s CSS loops ----------------------------------------
     JS only counts "Spent on claims" from the aisle card's own clock and pauses
     each card while it is off screen. */
  try {
    var cards = document.querySelectorAll('.card-stage');
    var spent = document.getElementById('spent');
    var aisleClk = document.querySelector('.cs-aisle .cclk');
    var lastSpent = '';
    var spentTick = function () {
      var a = aisleClk && aisleClk.getAnimations ? aisleClk.getAnimations()[0] : null;
      if (a && a.currentTime !== null && spent) {
        var t = ((a.currentTime % 8000) + 8000) % 8000;
        var f = Math.min(t / 6000, 1), v = Math.round(84 * (1 - Math.pow(1 - f, 2)));
        var txt = '$' + v;
        if (txt !== lastSpent) { spent.textContent = txt; lastSpent = txt; }
      }
      requestAnimationFrame(spentTick);
    };
    requestAnimationFrame(spentTick);
    if ('IntersectionObserver' in window) {
      var co = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) { en.target.classList.toggle('paused', !en.isIntersecting); });
      });
      cards.forEach(function (c) { co.observe(c); });
    }
  } catch (err) { /* the cards still loop from CSS */ }

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

  /* ---- Category bar: mega panels. One open at a time. Opens on hover (120ms intent),
     click or keyboard focus; closes on mouseleave (150ms grace), Escape, outside click
     or a second click on the same button; 160ms fade/slide (CSS) --------------- */
  var catBtns = hdr.querySelectorAll('.cat-btn');
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
    btn.addEventListener('click', function () {
      clearTimeout(openT);
      if (openBtn !== btn) { openPanel(btn, 'click'); return; }
      /* a click that lands right after the hover opened it keeps it open */
      if (openedBy === 'hover' && Date.now() - openedAt < 700) { openedBy = 'click'; return; }
      closePanel(btn);
    });
    btn.addEventListener('focus', function () {
      if (noFocusOpen) return;
      var kb = true; try { kb = btn.matches(':focus-visible'); } catch (e) {}
      if (kb) openPanel(btn, 'focus');
    });
    if (canHover) {
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

  /* ---- Phone menu: categories as an accordion (one open at a time) ---------- */
  var accBtns = menu.querySelectorAll('.acc-btn');
  accBtns.forEach(function (btn) {
    btn.addEventListener('click', function () {
      var open = btn.getAttribute('aria-expanded') !== 'true';
      accBtns.forEach(function (o) { o.setAttribute('aria-expanded', 'false'); document.getElementById(o.getAttribute('aria-controls')).hidden = true; });
      btn.setAttribute('aria-expanded', String(open));
      document.getElementById(btn.getAttribute('aria-controls')).hidden = !open;
    });
  });

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
