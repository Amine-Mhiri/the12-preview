/* the12 — v5 prototype behaviour.
   Tokens, header, menu, reveals, the S1 process counter (all motion is
   CSS; JS only keeps the counter in step and pauses it off screen),
   term tooltips. */
(function () {
  'use strict';

  var body = document.body;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var easeOut = function (t) { return 1 - Math.pow(1 - t, 3); };

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
  /* "10,450" -> {n:10450, comma:true, suffix:''}; "80%" -> {n:80, suffix:'%'} */
  function parse(str) {
    var m = String(str).match(/^([^0-9]*)([0-9][0-9,]*)(.*)$/);
    if (!m) return null;
    return { pre: m[1], n: parseInt(m[2].replace(/,/g, ''), 10), comma: m[2].indexOf(',') > -1, suf: m[3] };
  }
  function fmt(p, n) {
    var s = String(Math.round(n));
    if (p.comma) s = s.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return p.pre + s + p.suf;
  }
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
    menu.hidden = !open;
    document.documentElement.style.overflow = open ? 'hidden' : '';
    if (open) { var first = menu.querySelector('a'); if (first) first.focus(); }
  }
  burger.addEventListener('click', function () { setMenu(menu.hidden); });
  menu.addEventListener('click', function (e) { if (e.target.closest('a')) setMenu(false); });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && !menu.hidden) { setMenu(false); burger.focus(); }
  });
  window.matchMedia('(min-width: 1025px)').addEventListener('change', function (m) { if (m.matches) setMenu(false); });

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

  /* ---- S1 process animation: a 9s CSS loop; JS only drives the counter --
     The counter reads the phase of one shared-clock animation (the card copy),
     so it stays in step with the CSS even when the loop is paused. */
  var stage = document.getElementById('stage');
  var count = document.getElementById('stage-count');
  var CYCLE = 9000;
  var from = parse(tokens.analyzed) || { pre: '', n: 10450, comma: true, suf: '' };
  var easeInOut = function (t) { return t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };
  function countAt(ms) {
    /* 0–0.3s full · 0.3–4.2s down to 12 · hold · 7.6–8.8s back up (the market refills) */
    if (ms < 300) return from.n;
    if (ms < 4200) return from.n + (12 - from.n) * easeOut((ms - 300) / 3900);
    if (ms < 7600) return 12;
    if (ms < 8800) return 12 + (from.n - 12) * easeInOut((ms - 7600) / 1200);
    return from.n;
  }
  var copies = stage.querySelectorAll('.copy'); /* one per layout; the hidden one has no running animation */
  function clock() {
    for (var i = 0; i < copies.length; i++) {
      var a = copies[i].getAnimations();
      if (a.length) return a[0];
    }
    return null;
  }
  var raf = 0, last = '';
  function tick() {
    var a = clock();
    if (a && a.currentTime !== null) {
      var txt = fmt(from, countAt(((a.currentTime % CYCLE) + CYCLE) % CYCLE));
      if (txt !== last) { count.textContent = txt; last = txt; }
    }
    raf = requestAnimationFrame(tick);
  }
  if (reduce) {
    count.textContent = '12';
  } else {
    raf = requestAnimationFrame(tick);
    if ('IntersectionObserver' in window) {
      /* pause the loop (and the counter) while the stage is off screen */
      new IntersectionObserver(function (entries) {
        var on = entries[0].isIntersecting;
        stage.classList.toggle('paused', !on);
        cancelAnimationFrame(raf);
        if (on) raf = requestAnimationFrame(tick);
      }).observe(stage);
    }
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
