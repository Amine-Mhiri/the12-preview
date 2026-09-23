/* ===========================================================================
   Top Best Whey Protein Ever - behaviour
   ---------------------------------------------------------------------------
   Motion personality: Premium. One signature easing, three durations, zero
   overshoot. There is exactly one orchestrated moment on this page (the
   elimination sequence); everything else is a quiet entrance so the page does
   not twitch while you read it.

   Every animation here answers one of: hierarchy, storytelling, feedback.
   Nothing loops, nothing floats, nothing hovers for decoration.
   =========================================================================== */
(function () {
  "use strict";

  var EASE = "power2.out";      // matches cubic-bezier(0.4, 0, 0.2, 1) closely
  var T_STD = 0.42;

  /* --- theme ------------------------------------------------------------ */
  var root = document.documentElement;
  var toggle = document.querySelector("[data-theme-toggle]");

  function systemDark() {
    return window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
  }
  function currentTheme() {
    return root.getAttribute("data-theme") || (systemDark() ? "dark" : "light");
  }
  function applyTheme(next) {
    root.setAttribute("data-theme", next);
    try { localStorage.setItem("wpe-theme", next); } catch (e) { /* private mode */ }
    if (toggle) {
      toggle.textContent = next === "dark" ? "Light" : "Dark";
      toggle.setAttribute("aria-label", "Switch to " + (next === "dark" ? "light" : "dark") + " theme");
    }
  }
  try {
    var saved = localStorage.getItem("wpe-theme");
    if (saved === "dark" || saved === "light") applyTheme(saved);
    else if (toggle) toggle.textContent = systemDark() ? "Light" : "Dark";
  } catch (e) {
    if (toggle) toggle.textContent = systemDark() ? "Light" : "Dark";
  }
  if (toggle) {
    toggle.addEventListener("click", function () {
      applyTheme(currentTheme() === "dark" ? "light" : "dark");
    });
  }

  /* --- masthead hairline ------------------------------------------------ */
  var masthead = document.querySelector(".masthead");
  if (masthead && "IntersectionObserver" in window) {
    var sentinel = document.createElement("div");
    sentinel.style.cssText = "position:absolute;top:0;height:1px;width:1px;";
    document.body.prepend(sentinel);
    new IntersectionObserver(function (entries) {
      masthead.setAttribute("data-stuck", String(!entries[0].isIntersecting));
    }).observe(sentinel);
  }

  // Only now, with GSAP present, is it safe to hide content for the entrance.
  if (!window.gsap) return;
  var gsap = window.gsap;
  if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    root.classList.add("js-motion");
  }
  if (window.ScrollTrigger) gsap.registerPlugin(window.ScrollTrigger);

  gsap.matchMedia().add(
    { motion: "(prefers-reduced-motion: no-preference)" },
    function (ctx) {
      if (!ctx.conditions.motion) return;

      /* --- entrances: hierarchy. Content arrives in reading order. ------- */
      gsap.utils.toArray(".rise").forEach(function (el) {
        gsap.to(el, {
          opacity: 1, y: 0, duration: T_STD, ease: EASE,
          scrollTrigger: { trigger: el, start: "top 88%", once: true },
          delay: parseFloat(el.getAttribute("data-delay") || 0),
        });
      });

      /* --- hero shelf: storytelling. The nineteen land as a set, then the
         seven that failed recede, which is the whole argument in one beat. -- */
      var heroCells = gsap.utils.toArray(".hero-figure .cell");
      if (heroCells.length) {
        gsap.from(heroCells, {
          opacity: 0, y: 14, duration: T_STD, ease: EASE,
          stagger: { each: 0.022, from: "start" }, delay: 0.15,
        });
        gsap.fromTo(
          ".hero-figure .cell[data-state='out']",
          { opacity: 1 },
          { opacity: 0.26, duration: 0.7, ease: EASE, delay: 0.95, stagger: 0.04 }
        );
      }

      /* --- the signature moment ------------------------------------------
         Nineteen products are pinned in view. As the reader scrolls, the seven
         that broke a rule are struck out one at a time, each naming the
         ingredient that removed it, while the tally counts down to twelve.
         This is the only pinned sequence on the page. -------------------- */
      var stage = document.querySelector(".cut-stage");
      var outs = gsap.utils.toArray(".cut-item[data-reason]");
      if (stage && outs.length && window.ScrollTrigger) {
        var keptEl = document.querySelector("[data-tally='kept']");
        var cutEl = document.querySelector("[data-tally='cut']");
        var counter = { kept: 19, cut: 0 };

        var tl = gsap.timeline({
          scrollTrigger: {
            trigger: stage,
            // Not "top top": the masthead is sticky and 68px tall, so pinning
            // flush to the viewport top hides the running tally behind it.
            start: "top 88px",
            end: "+=" + Math.round(window.innerHeight * 1.2),
            pin: true,
            scrub: 0.6,
            invalidateOnRefresh: true,
          },
        });

        outs.forEach(function (item, i) {
          var strike = item.querySelector(".strike");
          // set() rather than call(): a timeline reverses a set, so scrolling
          // back up genuinely puts the product back rather than leaving the
          // grid stuck in its resolved state.
          tl.to(strike, { scaleX: 1, duration: 0.5, ease: "power1.inOut" }, i * 0.62)
            .set(item, { attr: { "data-out": "true" } }, i * 0.62 + 0.18)
            .to(counter, {
              kept: 19 - (i + 1), cut: i + 1, duration: 0.5, ease: "none",
              onUpdate: function () {
                if (keptEl) keptEl.textContent = Math.round(counter.kept);
                if (cutEl) cutEl.textContent = Math.round(counter.cut);
              },
            }, i * 0.62);
        });

      }

      return function () { /* matchMedia reverts its own tweens */ };
    }
  );

  /* Reduced motion: nothing animates, and the sequence is shown resolved so
     the reader still gets the argument. */
  gsap.matchMedia().add({ still: "(prefers-reduced-motion: reduce)" }, function (ctx) {
    if (!ctx.conditions.still) return;
    gsap.set(".rise", { opacity: 1, y: 0 });
    gsap.utils.toArray(".cut-item[data-reason]").forEach(function (i) { i.setAttribute("data-out", "true"); });
    var keptEl = document.querySelector("[data-tally='kept']");
    var cutEl = document.querySelector("[data-tally='cut']");
    if (keptEl) keptEl.textContent = "12";
    if (cutEl) cutEl.textContent = "7";
  });
})();
