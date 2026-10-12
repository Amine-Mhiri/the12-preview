/* the12 — v5 prototype behaviour.
   Reveals, the S1 hero loop (all motion is CSS;
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
