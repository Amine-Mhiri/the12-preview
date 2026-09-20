/* the12 — v3 prototype behaviour. Vanilla JS, no libraries. */
(function () {
  'use strict';

  var mq = window.matchMedia('(max-width: 760px)');
  var isMobile = function () { return mq.matches; };

  /* ---------- Mega menu / mobile panel ---------------------------------- */
  var panel = document.getElementById('megapanel');
  var shelvesBtn = document.getElementById('shelvesBtn');
  var menuBtn = document.getElementById('menuBtn');
  var scrim = document.getElementById('scrim');
  var shelves = document.getElementById('shelves');
  var hoverTimer = null;
  var lastOpener = null;
  var suppressFocusOpen = false;

  function setOpen(open, opener) {
    if (!panel) return;
    panel.classList.toggle('open', open);
    if (shelvesBtn) shelvesBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
    if (menuBtn) menuBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
    if (scrim) scrim.classList.toggle('on', open && isMobile());
    document.documentElement.style.overflow = (open && isMobile()) ? 'hidden' : '';
    if (open) lastOpener = opener || lastOpener;
  }
  function isOpen() { return panel && panel.classList.contains('open'); }

  if (shelvesBtn) {
    shelvesBtn.addEventListener('click', function (e) {
      e.preventDefault();
      setOpen(!isOpen(), shelvesBtn);
    });
  }
  if (menuBtn) {
    menuBtn.addEventListener('click', function (e) {
      e.preventDefault();
      setOpen(!isOpen(), menuBtn);
    });
  }
  if (scrim) scrim.addEventListener('click', function () { setOpen(false); });

  /* hover on desktop only */
  if (shelves && panel) {
    var enter = function () {
      if (isMobile()) return;
      window.clearTimeout(hoverTimer);
      setOpen(true, shelvesBtn);
    };
    var leave = function () {
      if (isMobile()) return;
      window.clearTimeout(hoverTimer);
      hoverTimer = window.setTimeout(function () { setOpen(false); }, 160);
    };
    shelves.addEventListener('mouseenter', enter);
    shelves.addEventListener('mouseleave', leave);
    panel.addEventListener('mouseenter', enter);
    panel.addEventListener('mouseleave', leave);
    /* keyboard: opening on focus, closing when focus leaves the whole menu */
    shelvesBtn.addEventListener('focus', function () {
      if (!isMobile() && !suppressFocusOpen) setOpen(true, shelvesBtn);
    });
    document.addEventListener('focusin', function (e) {
      if (!isOpen() || isMobile()) return;
      if (panel.contains(e.target) || shelves.contains(e.target)) return;
      setOpen(false);
    });
  }

  /* Escape + outside click */
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && isOpen()) {
      suppressFocusOpen = true;
      setOpen(false);
      if (lastOpener) lastOpener.focus();
      window.setTimeout(function () { suppressFocusOpen = false; }, 0);
    }
    if ((e.metaKey || e.ctrlKey) && (e.key === 'k' || e.key === 'K')) {
      var s = document.getElementById('searchbtn');
      if (s) { e.preventDefault(); s.focus(); }
    }
  });
  document.addEventListener('click', function (e) {
    if (!isOpen()) return;
    if (panel.contains(e.target)) return;
    if (shelves && shelves.contains(e.target)) return;
    if (menuBtn && menuBtn.contains(e.target)) return;
    setOpen(false);
  });

  /* ---------- Accordion (mobile only; groups are always open above) ------ */
  Array.prototype.forEach.call(document.querySelectorAll('.acc-btn'), function (btn) {
    var group = btn.closest('.mega-group');
    btn.addEventListener('click', function () {
      if (!isMobile()) return;
      var open = group.classList.toggle('open');
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
  });

  function syncAccordion() {
    var mobile = isMobile();
    Array.prototype.forEach.call(document.querySelectorAll('.acc-btn'), function (btn) {
      var group = btn.closest('.mega-group');
      if (mobile) {
        btn.setAttribute('aria-expanded', group.classList.contains('open') ? 'true' : 'false');
      } else {
        btn.removeAttribute('aria-expanded');
      }
    });
  }
  syncAccordion();
  if (mq.addEventListener) {
    mq.addEventListener('change', function () { setOpen(false); syncAccordion(); });
  }

  /* ---------- Rails ------------------------------------------------------ */
  Array.prototype.forEach.call(document.querySelectorAll('.rail'), function (rail) {
    var track = rail.querySelector('.rail-track');
    var prev = rail.parentNode.querySelector('[data-rail="prev"]');
    var next = rail.parentNode.querySelector('[data-rail="next"]');
    if (!track) return;

    function step() {
      var card = track.firstElementChild;
      var w = card ? card.getBoundingClientRect().width : 264;
      var gap = 24;
      var per = isMobile() ? 1 : 2;
      return (w + gap) * per;
    }
    function sync() {
      var max = track.scrollWidth - track.clientWidth - 2;
      if (prev) prev.disabled = track.scrollLeft <= 2;
      if (next) next.disabled = track.scrollLeft >= max;
    }
    if (prev) prev.addEventListener('click', function () { track.scrollBy({ left: -step(), behavior: 'smooth' }); });
    if (next) next.addEventListener('click', function () { track.scrollBy({ left: step(), behavior: 'smooth' }); });
    track.addEventListener('scroll', sync, { passive: true });
    window.addEventListener('resize', sync);
    sync();
  });

  /* ---------- Scale numbers, from data- attributes on <body> ------------- */
  (function () {
    var b = document.body;
    var vals = {
      analyzed: b.getAttribute('data-analyzed') || '',
      rejected: b.getAttribute('data-rejected') || '',
      kept: b.getAttribute('data-kept') || ''
    };
    Array.prototype.forEach.call(document.querySelectorAll('[data-tally]'), function (el) {
      var k = el.getAttribute('data-tally');
      if (vals[k]) el.textContent = vals[k];
    });
  })();

  /* ---------- Hero carousel ---------------------------------------------- */
  (function () {
    var hero = document.getElementById('hero');
    var track = document.getElementById('heroTrack');
    if (!hero || !track) return;

    var slides = Array.prototype.slice.call(track.children);
    var dots = Array.prototype.slice.call(hero.querySelectorAll('.dot-btn'));
    var prev = hero.querySelector('[data-hero="prev"]');
    var next = hero.querySelector('[data-hero="next"]');
    var reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
    var index = 0;
    var timer = null;
    var paused = false;
    var DELAY = 6000;

    function render() {
      track.style.transform = 'translateX(' + (-index * 100) + '%)';
      slides.forEach(function (sl, i) {
        var on = i === index;
        sl.setAttribute('aria-hidden', on ? 'false' : 'true');
        Array.prototype.forEach.call(sl.querySelectorAll('a, button'), function (f) {
          if (on) f.removeAttribute('tabindex');
          else f.setAttribute('tabindex', '-1');
        });
      });
      dots.forEach(function (d, i) {
        d.setAttribute('aria-selected', i === index ? 'true' : 'false');
      });
    }
    function go(i) {
      index = (i + slides.length) % slides.length;
      render();
      restart();
    }
    function stop() { if (timer) { window.clearInterval(timer); timer = null; } }
    function restart() {
      stop();
      if (paused || reduce.matches) return;
      timer = window.setInterval(function () { index = (index + 1) % slides.length; render(); }, DELAY);
    }
    function pause() { paused = true; stop(); }
    function resume() { paused = false; restart(); }

    if (prev) prev.addEventListener('click', function () { go(index - 1); });
    if (next) next.addEventListener('click', function () { go(index + 1); });
    dots.forEach(function (d, i) { d.addEventListener('click', function () { go(i); }); });

    hero.addEventListener('mouseenter', pause);
    hero.addEventListener('mouseleave', resume);
    hero.addEventListener('focusin', pause);
    hero.addEventListener('focusout', function (e) {
      if (!hero.contains(e.relatedTarget)) resume();
    });
    hero.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowRight') { e.preventDefault(); go(index + 1); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); go(index - 1); }
    });
    if (reduce.addEventListener) reduce.addEventListener('change', restart);

    render();
    restart();
  })();

  /* ---------- Newsletter placeholder ------------------------------------ */
  var form = document.getElementById('newsform');
  if (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var note = document.getElementById('newsnote');
      if (note) note.textContent = 'Thanks — placeholder. Nothing was sent.';
      var input = form.querySelector('input');
      if (input) input.value = '';
    });
  }
})();
