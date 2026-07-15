/* ============================================================
   The Spaceback Awards 2026 — main.js
   Scroll-driven cinematic video scrubbing + interactions
   ============================================================ */
(function () {
  "use strict";

  const VIDEO_DURATION = 8; // seconds — hero video length

  const body = document.body;
  const video = document.getElementById("heroVideo");
  const stage = document.getElementById("scrollStage");
  const panels = Array.from(document.querySelectorAll(".panel"));
  const progressBar = document.getElementById("scrollProgressBar");
  const nav = document.getElementById("nav");
  const navToggle = document.getElementById("navToggle");

  const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ----------------------------------------------------------
     State
     ---------------------------------------------------------- */
  let stageTop = 0;
  let stageRange = 1;      // scroll distance over which scrubbing happens
  let targetTime = 0;      // desired video.currentTime driven by scroll
  let videoReady = false;
  let seeking = false;     // true while a seek is in flight
  let pendingTime = null;  // latest requested time while a seek is in flight
  let lastProgress = -1;

  /* ----------------------------------------------------------
     Fallback mode (no scroll-scrub): reduced motion.
     Un-pins the stage, stacks panels, freezes final frame.
     ---------------------------------------------------------- */
  const noScrub = prefersReduced;
  if (noScrub) body.classList.add("no-scrub");

  /* ----------------------------------------------------------
     Video setup
     ---------------------------------------------------------- */
  if (video) {
    video.pause();
    video.muted = true;

    video.addEventListener("loadedmetadata", onVideoReady, { once: true });
    video.addEventListener("loadeddata", onVideoReady, { once: true });
    // If the source is missing/broken we simply keep the starfield background.
    video.addEventListener("error", function () {
      videoReady = false;
    });

    // Coalesce seeks: never issue a new seek while one is still in flight.
    // The browser can only decode one seek at a time; queuing them is what
    // makes scrubbing stutter. We keep at most one pending target.
    video.addEventListener("seeked", function () {
      seeking = false;
      if (pendingTime !== null) {
        const t = pendingTime;
        pendingTime = null;
        seek(t);
      }
    });

    // metadata may already be available
    if (video.readyState >= 1) onVideoReady();
  }

  function onVideoReady() {
    if (videoReady) return;
    videoReady = true;
    video.classList.add("is-ready");
    video.pause();

    // freeze on the final frame in fallback mode, else honor scroll target
    seek(noScrub ? VIDEO_DURATION : targetTime);
  }

  function seek(t) {
    if (!videoReady || video.readyState < 1) return;
    const clamped = Math.max(0, Math.min(VIDEO_DURATION, t));
    if (Math.abs(video.currentTime - clamped) < 0.01) return;
    if (seeking) {
      // a seek is already running — remember only the newest target
      pendingTime = clamped;
      return;
    }
    seeking = true;
    try { video.currentTime = clamped; }
    catch (e) { seeking = false; /* ignore transient seek errors */ }
  }

  /* ----------------------------------------------------------
     Geometry
     ---------------------------------------------------------- */
  function measure() {
    if (noScrub || !stage) return;
    const rect = stage.getBoundingClientRect();
    stageTop = rect.top + window.scrollY;
    stageRange = Math.max(1, stage.offsetHeight - window.innerHeight);
  }

  /* ----------------------------------------------------------
     Progress → video time + panel crossfade
     ---------------------------------------------------------- */
  function computeProgress() {
    const y = window.scrollY - stageTop;
    return Math.max(0, Math.min(1, y / stageRange));
  }

  function updatePanels(progress) {
    if (noScrub) return;
    const n = panels.length;
    // continuous position across panels: 0 .. n-1
    const floatPos = progress * (n - 1);

    // Each panel HOLDS at full opacity across a plateau near its center,
    // then fades out quickly near the boundary. This keeps the outgoing
    // panel readable through its segment yet almost gone before the next
    // one arrives, so adjacent panels don't visibly overlap.
    const HOLD = 0.3;      // |dist| within this → fully visible
    const FADE_END = 0.55; // fully gone by here (neighbours meet at 0.5)

    for (let i = 0; i < n; i++) {
      const dist = Math.abs(i - floatPos);
      let opacity;
      if (dist <= HOLD) opacity = 1;
      else if (dist >= FADE_END) opacity = 0;
      else opacity = 1 - (dist - HOLD) / (FADE_END - HOLD);
      // subtle easing
      opacity = opacity * opacity * (3 - 2 * opacity); // smoothstep

      const p = panels[i];
      if (opacity <= 0.01) {
        if (p.style.visibility !== "hidden") {
          p.style.opacity = "0";
          p.style.visibility = "hidden";
        }
        continue;
      }
      const offset = (i - floatPos) * 26; // px — calm vertical drift
      p.style.visibility = "visible";
      p.style.opacity = opacity.toFixed(3);
      p.style.transform = "translate3d(0," + offset.toFixed(1) + "px,0)";
    }
  }

  function updateProgressBar() {
    if (!progressBar) return;
    const doc = document.documentElement;
    const scrollable = doc.scrollHeight - window.innerHeight;
    const pct = scrollable > 0 ? (window.scrollY / scrollable) * 100 : 0;
    progressBar.style.width = pct.toFixed(2) + "%";
  }

  /* ----------------------------------------------------------
     Scroll handler (rAF-throttled, no layout thrash)
     ---------------------------------------------------------- */
  let scrollScheduled = false;
  function onScroll() {
    if (scrollScheduled) return;
    scrollScheduled = true;
    requestAnimationFrame(function () {
      scrollScheduled = false;

      // nav state
      if (window.scrollY > 24) nav.classList.add("is-scrolled");
      else nav.classList.remove("is-scrolled");

      updateProgressBar();

      if (noScrub) return;

      const progress = computeProgress();
      if (progress === lastProgress) return;
      lastProgress = progress;

      targetTime = progress * VIDEO_DURATION; // 0 .. 8, clamped by seek()
      updatePanels(progress);
      seek(targetTime); // coalesced — at most one seek in flight
    });
  }

  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", function () {
    measure();
    onScroll();
  });

  /* ----------------------------------------------------------
     Mobile nav toggle
     ---------------------------------------------------------- */
  if (navToggle) {
    navToggle.addEventListener("click", function () {
      const open = nav.classList.toggle("is-open");
      navToggle.setAttribute("aria-expanded", String(open));
    });
    nav.querySelectorAll(".nav-links a").forEach(function (a) {
      a.addEventListener("click", function () {
        nav.classList.remove("is-open");
        navToggle.setAttribute("aria-expanded", "false");
      });
    });
  }

  /* ----------------------------------------------------------
     Reveal-on-scroll for post-scrub sections
     ---------------------------------------------------------- */
  const reveals = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window && !prefersReduced) {
    const io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-in");
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15, rootMargin: "0px 0px -8% 0px" });
    reveals.forEach(function (el) { io.observe(el); });
  } else {
    reveals.forEach(function (el) { el.classList.add("is-in"); });
  }

  /* ----------------------------------------------------------
     FAQ accordion (accessible)
     ---------------------------------------------------------- */
  document.querySelectorAll(".acc-item").forEach(function (item) {
    const trigger = item.querySelector(".acc-trigger");
    const panel = item.querySelector(".acc-panel");
    trigger.addEventListener("click", function () {
      const isOpen = item.classList.toggle("is-open");
      trigger.setAttribute("aria-expanded", String(isOpen));
      panel.style.maxHeight = isOpen ? panel.scrollHeight + "px" : "0px";
    });
  });

  /* ----------------------------------------------------------
     Init
     ---------------------------------------------------------- */
  function init() {
    measure();
    if (!noScrub) {
      lastProgress = -1;
      const progress = computeProgress();
      lastProgress = progress;
      targetTime = progress * VIDEO_DURATION;
      updatePanels(progress);
      seek(targetTime);
    }
    // set initial nav + progress bar
    if (window.scrollY > 24) nav.classList.add("is-scrolled");
    updateProgressBar();
  }

  // re-measure once fonts/images settle
  window.addEventListener("load", function () {
    measure();
    onScroll();
  });

  init();
})();
