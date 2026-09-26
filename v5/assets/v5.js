/* the12 — v5 prototype behaviour.
   Tokens, header, menu, reveals, hero count-up, the S2 process timeline
   (observer + counter + replay only; all motion is CSS), term tooltips. */
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
  document.querySelectorAll('.sec-head h2').forEach(function (h) {
    if (h.id === 's2h') h.textContent = 'From ' + tokens.analyzed + ' to twelve.';
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
  function tween(el, from, to, dur, delay, done) {
    var p = parse(el.textContent);
    if (!p) return;
    var start = null;
    function step(ts) {
      if (start === null) start = ts + (delay || 0);
      var t = Math.min(Math.max((ts - start) / dur, 0), 1);
      el.textContent = fmt(p, from + (to - from) * easeOut(t));
      if (t < 1) el._raf = requestAnimationFrame(step);
      else if (done) done();
    }
    cancelAnimationFrame(el._raf);
    el._raf = requestAnimationFrame(step);
  }

  /* ---- Hero count-up (1.2s on load) ------------------------------------- */
  if (!reduce) {
    document.querySelectorAll('[data-count]').forEach(function (el) {
      var p = parse(el.textContent);
      if (p) tween(el, 0, p.n, 1200, 150);
    });
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

  /* ---- S2 process timeline --------------------------------------------- */
  var stage = document.getElementById('stage');
  var count = document.getElementById('stage-count');
  var replay = document.getElementById('replay');
  var TOTAL = 4100; /* last keyframe (the arrow) ends at 4.0s */
  var timer = null;
  var from = parse(tokens.analyzed);

  function finish() {
    stage.classList.remove('play');
    stage.classList.add('done');
    count.textContent = '12';
  }
  function play() {
    clearTimeout(timer);
    stage.classList.remove('play', 'done');
    void stage.offsetWidth; /* restart the keyframes */
    count.textContent = tokens.analyzed;
    stage.classList.add('play');
    tween(count, from ? from.n : 10450, 12, 3300, 300);
    timer = setTimeout(finish, TOTAL);
  }
  if (reduce) {
    finish();
  } else if ('IntersectionObserver' in window) {
    var so = new IntersectionObserver(function (entries) {
      if (entries[0].isIntersecting) { so.disconnect(); play(); }
    }, { threshold: 0.5 });
    so.observe(stage);
  } else {
    finish();
  }
  replay.addEventListener('click', play);

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
