/* ===========================================================================
   Motion.
   Personality is Premium: one signature easing, three durations, no overshoot.
   Every section gets its OWN idea rather than the same fade repeated, because
   a page where everything enters identically reads as a template.

   Every animation here answers one of: hierarchy, storytelling, feedback.
   Nothing loops. Nothing floats for decoration.
   =========================================================================== */
(function () {
  "use strict";

  var EASE = "power2.out";           // === cubic-bezier(.33,1,.68,1)
  var root = document.documentElement;

  /* --- theme ------------------------------------------------------------ */
  var toggle = document.querySelector("[data-theme-toggle]");
  var sysDark = function () { return window.matchMedia("(prefers-color-scheme: dark)").matches; };
  var current = function () { return root.getAttribute("data-theme") || (sysDark() ? "dark" : "light"); };
  function applyTheme(next) {
    root.setAttribute("data-theme", next);
    try { localStorage.setItem("wpe-theme", next); } catch (e) {}
    if (toggle) {
      toggle.textContent = next === "dark" ? "Light" : "Dark";
      toggle.setAttribute("aria-label", "Switch to " + (next === "dark" ? "light" : "dark") + " theme");
    }
  }
  try {
    var saved = localStorage.getItem("wpe-theme");
    if (saved === "dark" || saved === "light") applyTheme(saved);
    else if (toggle) toggle.textContent = sysDark() ? "Light" : "Dark";
  } catch (e) { if (toggle) toggle.textContent = sysDark() ? "Light" : "Dark"; }
  if (toggle) toggle.addEventListener("click", function () { applyTheme(current() === "dark" ? "light" : "dark"); });

  /* --- masthead hairline ------------------------------------------------ */
  var masthead = document.querySelector(".masthead");
  if (masthead && "IntersectionObserver" in window) {
    var s = document.createElement("div");
    s.style.cssText = "position:absolute;top:0;height:1px;width:1px;";
    document.body.prepend(s);
    new IntersectionObserver(function (e) { masthead.setAttribute("data-stuck", String(!e[0].isIntersecting)); }).observe(s);
  }

  if (!window.gsap) return;
  var gsap = window.gsap;
  if (window.ScrollTrigger) gsap.registerPlugin(window.ScrollTrigger);

  var mm = gsap.matchMedia();

  mm.add({ motion: "(prefers-reduced-motion: no-preference)" }, function (ctx) {
    if (!ctx.conditions.motion) return;
    root.classList.add("js-motion");

    /* HERO. The product arrives first and largest, the copy behind it, the
       spec pins last. Staging: the reader looks at the thing being sold. */
    var heroTl = gsap.timeline({ delay: 0.12 });
    heroTl.from(".hero-stage .shot", { opacity: 0, y: 40, scale: 0.94, duration: 0.95, ease: EASE })
          .from(".hero-copy > *", { opacity: 0, y: 24, duration: 0.6, stagger: 0.07, ease: EASE }, 0.18)
          .from(".pin", { opacity: 0, scale: 0.8, duration: 0.5, stagger: 0.09, ease: "back.out(1.6)" }, 0.6);

    /* The hero product drifts slower than the page. ease:"none" because the
       input is a scrollbar, not a clock; any curve here reads as lag. */
    gsap.to(".hero-stage .shot", {
      yPercent: 12, ease: "none",
      scrollTrigger: { trigger: ".hero", start: "clamp(top top)", end: "clamp(bottom top)", scrub: true },
    });
    gsap.to(".pin", {
      yPercent: -26, ease: "none",
      scrollTrigger: { trigger: ".hero", start: "clamp(top top)", end: "clamp(bottom top)", scrub: true },
    });

    /* Generic entrances, used only where a section has no idea of its own. */
    gsap.utils.toArray(".rise").forEach(function (el) {
      gsap.to(el, {
        opacity: 1, y: 0, duration: 0.55, ease: EASE,
        delay: parseFloat(el.getAttribute("data-delay") || 0),
        scrollTrigger: { trigger: el, start: "top 88%", once: true },
      });
    });

    /* A wipe, not a fade: the content is uncovered rather than faded up. */
    gsap.utils.toArray(".wipe").forEach(function (el) {
      gsap.to(el, {
        clipPath: "inset(0% 0% 0% 0%)", duration: 0.9, ease: EASE,
        scrollTrigger: { trigger: el, start: "top 85%", once: true },
      });
    });

    /* STAT BAND. Counters. snap keeps them on integers so no digit flickers. */
    gsap.utils.toArray("[data-count]").forEach(function (el) {
      var target = parseFloat(el.getAttribute("data-count"));
      var o = { v: 0 };
      gsap.to(o, {
        v: target, duration: 1.15, ease: EASE, snap: { v: 1 },
        onUpdate: function () { el.textContent = Math.round(o.v); },
        scrollTrigger: { trigger: el, start: "top 88%", once: true },
      });
    });

    /* THE CULL. The one orchestrated moment. Nineteen products are pinned;
       the seven that broke a rule are struck one at a time, each naming the
       ingredient that removed it, while the tally counts down to twelve. */
    var stage = document.querySelector(".cull-stage");
    var outs = gsap.utils.toArray(".cull-item[data-reason]");
    if (stage && outs.length && window.ScrollTrigger) {
      var keptEl = document.querySelector("[data-tally='kept']");
      var cutEl = document.querySelector("[data-tally='cut']");
      var c = { kept: 19, cut: 0 };
      var tl = gsap.timeline({
        scrollTrigger: {
          trigger: stage, start: "top 92px", end: "+=" + Math.round(window.innerHeight * 1.25),
          pin: true, scrub: 0.6, anticipatePin: 1, invalidateOnRefresh: true, fastScrollEnd: true,
        },
      });
      outs.forEach(function (item, i) {
        var at = i * 0.62;
        tl.to(item.querySelector(".strike"), { scaleX: 1, duration: 0.5, ease: "power1.inOut" }, at)
          .set(item, { attr: { "data-out": "true" } }, at + 0.18)
          .to(c, {
            kept: 19 - (i + 1), cut: i + 1, duration: 0.5, ease: "none",
            onUpdate: function () {
              if (keptEl) keptEl.textContent = Math.round(c.kept);
              if (cutEl) cutEl.textContent = Math.round(c.cut);
            },
          }, at);
      });
      // The reason bars fill in step with the strikes.
      gsap.utils.toArray(".reasons .bar i").forEach(function (bar) {
        gsap.to(bar, {
          width: bar.getAttribute("data-w") + "%", duration: 0.7, ease: EASE,
          scrollTrigger: { trigger: bar, start: "top 92%", once: true },
        });
      });
    }

    /* THE TWELVE. A grid that lands as a wave rather than twelve separate
       fades: stagger from the start, tight enough to read as one gesture. */
    gsap.from(".grid .card", {
      opacity: 0, y: 34, duration: 0.62, ease: EASE,
      stagger: { each: 0.045, from: "start" },
      scrollTrigger: { trigger: ".grid", start: "top 84%", once: true },
    });

    /* EVIDENCE. Bars race from zero, which is the claim made physical. */
    gsap.utils.toArray(".diaas .track i").forEach(function (bar) {
      gsap.to(bar, {
        width: bar.getAttribute("data-w") + "%", duration: 0.95, ease: EASE,
        scrollTrigger: { trigger: bar, start: "top 90%", once: true },
      });
    });

    /* The score dial draws itself. */
    gsap.utils.toArray("[data-dial]").forEach(function (circle) {
      var len = circle.getTotalLength ? circle.getTotalLength() : 176;
      var pct = parseFloat(circle.getAttribute("data-dial")) / 100;
      gsap.fromTo(circle, { strokeDasharray: len, strokeDashoffset: len },
        { strokeDashoffset: len * (1 - pct), duration: 1.1, ease: EASE, delay: 0.7 });
    });
  });

  /* Reduced motion: no ScrollTrigger is created at all, and the page is shown
     already resolved so the argument still lands. */
  mm.add({ still: "(prefers-reduced-motion: reduce)" }, function (ctx) {
    if (!ctx.conditions.still) return;
    gsap.set(".rise", { opacity: 1, y: 0 });
    gsap.utils.toArray(".cull-item[data-reason]").forEach(function (i) { i.setAttribute("data-out", "true"); });
    gsap.utils.toArray("[data-count]").forEach(function (el) { el.textContent = el.getAttribute("data-count"); });
    gsap.utils.toArray(".diaas .track i, .reasons .bar i").forEach(function (b) { b.style.width = b.getAttribute("data-w") + "%"; });
    var k = document.querySelector("[data-tally='kept']"), c = document.querySelector("[data-tally='cut']");
    if (k) k.textContent = "12";
    if (c) c.textContent = "7";
  });
})();
