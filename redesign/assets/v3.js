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
