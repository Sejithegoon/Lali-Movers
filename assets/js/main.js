/* Lali Movers — shared site behaviour (every page). No dependencies. */
(function () {
  "use strict";

  var root = document.documentElement;
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  var THEME_KEY = "lali-theme";

  function $(sel, ctx) { return (ctx || document).querySelector(sel); }
  function $$(sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); }

  function storageGet(key) { try { return localStorage.getItem(key); } catch (e) { return null; } }
  function storageSet(key, val) { try { localStorage.setItem(key, val); } catch (e) { /* private mode */ } }

  /* ---------- Theme ---------- */
  var themeMeta = $('meta[name="theme-color"]');

  function applyTheme(theme, animate) {
    if (animate && !reduceMotion.matches) {
      root.classList.add("theme-transition");
      window.setTimeout(function () { root.classList.remove("theme-transition"); }, 350);
    }
    root.setAttribute("data-theme", theme);
    if (themeMeta) themeMeta.setAttribute("content", theme === "dark" ? "#0f0f11" : "#ffffff");
    $$(".theme-toggle").forEach(function (btn) {
      var next = theme === "dark" ? "light" : "dark";
      btn.setAttribute("aria-label", "Switch to " + next + " theme");
      btn.setAttribute("title", "Switch to " + next + " theme");
    });
  }

  applyTheme(root.getAttribute("data-theme") || "light", false);

  $$(".theme-toggle").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var next = root.getAttribute("data-theme") === "dark" ? "light" : "dark";
      storageSet(THEME_KEY, next);
      applyTheme(next, true);
    });
  });

  // Follow OS changes until the visitor picks a theme themselves
  var systemDark = window.matchMedia("(prefers-color-scheme: dark)");
  var onSystemChange = function (e) {
    if (!storageGet(THEME_KEY)) applyTheme(e.matches ? "dark" : "light", true);
  };
  if (systemDark.addEventListener) systemDark.addEventListener("change", onSystemChange);

  /* ---------- Header shadow on scroll ---------- */
  var header = $(".site-header");
  var backToTop = $(".back-to-top");
  var actionBar = $(".action-bar");

  function onScroll() {
    var y = window.scrollY;
    if (header) header.classList.toggle("is-scrolled", y > 8);
    if (backToTop) backToTop.classList.toggle("is-visible", y > 800);
    if (actionBar) actionBar.classList.toggle("is-visible", y > 320 || !$(".hero"));
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  if (backToTop) {
    backToTop.addEventListener("click", function () {
      window.scrollTo({ top: 0, behavior: reduceMotion.matches ? "auto" : "smooth" });
      var skipTarget = $("#main");
      if (skipTarget) skipTarget.focus({ preventScroll: true });
    });
  }

  /* ---------- Mobile menu ---------- */
  var menuBtn = $(".menu-toggle");
  var menu = $("#mobile-menu");
  var lastFocus = null;

  function focusables(el) {
    return $$('a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])', el)
      .filter(function (n) { return n.offsetParent !== null; });
  }

  function setMenu(open) {
    if (!menu || !menuBtn) return;
    menuBtn.setAttribute("aria-expanded", String(open));
    menuBtn.setAttribute("aria-label", open ? "Close menu" : "Open menu");
    menu.classList.toggle("is-open", open);
    document.body.classList.toggle("menu-open", open);
    if (open) {
      menu.removeAttribute("inert");
      lastFocus = document.activeElement;
      var first = focusables(menu)[0];
      if (first) window.setTimeout(function () { first.focus(); }, 50);
    } else {
      menu.setAttribute("inert", "");
      if (lastFocus && menu.contains(document.activeElement)) menuBtn.focus();
    }
  }

  if (menuBtn && menu) {
    menu.setAttribute("inert", "");
    menuBtn.addEventListener("click", function () {
      setMenu(menuBtn.getAttribute("aria-expanded") !== "true");
    });
    menu.addEventListener("click", function (e) {
      if (e.target.closest("a")) setMenu(false);
    });
    document.addEventListener("keydown", function (e) {
      if (!menu.classList.contains("is-open")) return;
      if (e.key === "Escape") { setMenu(false); menuBtn.focus(); return; }
      if (e.key !== "Tab") return;
      // Trap focus between the toggle button and the menu contents
      var items = [menuBtn].concat(focusables(menu));
      var first = items[0], last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    });
    window.matchMedia("(min-width: 1100px)").addEventListener("change", function (e) {
      if (e.matches) setMenu(false);
    });
  }

  /* ---------- Active nav link for on-page sections (home) ---------- */
  var sectionLinks = $$('.nav-link[href*="#"]');
  var linkFor = {};
  sectionLinks.forEach(function (a) {
    var id = a.getAttribute("href").split("#")[1];
    var target = id && document.getElementById(id);
    if (target) (linkFor[id] = linkFor[id] || []).push(a);
  });
  var sectionIds = Object.keys(linkFor);
  if (sectionIds.length && "IntersectionObserver" in window) {
    var homeLinks = $$('.nav-link[data-nav="home"]');
    var visible = {};
    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { visible[en.target.id] = en.isIntersecting; });
      var current = sectionIds.filter(function (id) { return visible[id]; })[0];
      sectionLinks.forEach(function (a) { a.classList.remove("is-active"); a.removeAttribute("aria-current"); });
      homeLinks.forEach(function (a) { a.removeAttribute("aria-current"); a.classList.remove("is-active"); });
      if (current) {
        linkFor[current].forEach(function (a) { a.classList.add("is-active"); });
      } else {
        homeLinks.forEach(function (a) { a.setAttribute("aria-current", "page"); });
      }
    }, { rootMargin: "-45% 0px -50% 0px" });
    sectionIds.forEach(function (id) { spy.observe(document.getElementById(id)); });
  }

  /* ---------- Scroll reveal ---------- */
  var reveals = $$(".reveal");
  if (reveals.length) {
    if (!("IntersectionObserver" in window) || reduceMotion.matches) {
      reveals.forEach(function (el) { el.classList.add("is-visible"); });
    } else {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          if (en.isIntersecting) { en.target.classList.add("is-visible"); io.unobserve(en.target); }
        });
      }, { rootMargin: "0px 0px -8% 0px", threshold: 0.05 });
      reveals.forEach(function (el) { io.observe(el); });
    }
  }

  /* ---------- FAQ accordion ---------- */
  $$("[data-accordion]").forEach(function (acc) {
    var triggers = $$(".accordion-trigger", acc);
    triggers.forEach(function (btn) {
      var item = btn.closest(".accordion-item");
      var panel = document.getElementById(btn.getAttribute("aria-controls"));
      btn.setAttribute("aria-expanded", "false");
      if (panel) panel.setAttribute("inert", "");
      btn.addEventListener("click", function () {
        var open = btn.getAttribute("aria-expanded") !== "true";
        btn.setAttribute("aria-expanded", String(open));
        item.classList.toggle("is-open", open);
        if (panel) { if (open) panel.removeAttribute("inert"); else panel.setAttribute("inert", ""); }
      });
    });
    // Open the first question by default
    if (triggers[0]) triggers[0].click();
  });

  /* ---------- Gallery lightbox ---------- */
  var lightbox = $("#lightbox");
  var galleryItems = $$("[data-lightbox]");
  if (lightbox && galleryItems.length && typeof lightbox.showModal === "function") {
    var lbImg = $(".lightbox-stage img", lightbox);
    var lbCaption = $(".lightbox-caption", lightbox);
    var lbCounter = $(".lightbox-counter", lightbox);
    var index = 0;

    function show(i) {
      index = (i + galleryItems.length) % galleryItems.length;
      var item = galleryItems[index];
      var thumb = $("img", item);
      lbImg.src = item.getAttribute("data-full") || thumb.currentSrc || thumb.src;
      lbImg.alt = thumb.alt;
      lbCaption.textContent = item.getAttribute("data-caption") || thumb.alt;
      lbCounter.textContent = (index + 1) + " / " + galleryItems.length;
    }

    galleryItems.forEach(function (item, i) {
      item.addEventListener("click", function () {
        show(i);
        lightbox.showModal();
        document.body.style.overflow = "hidden";
      });
      item.addEventListener("keydown", function (e) {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); item.click(); }
      });
    });
    lightbox.addEventListener("close", function () {
      document.body.style.overflow = "";
      if (galleryItems[index]) galleryItems[index].focus();
    });
    $(".lightbox-prev", lightbox).addEventListener("click", function () { show(index - 1); });
    $(".lightbox-next", lightbox).addEventListener("click", function () { show(index + 1); });
    $(".lightbox-close", lightbox).addEventListener("click", function () { lightbox.close(); });
    lightbox.addEventListener("keydown", function (e) {
      if (e.key === "ArrowLeft") show(index - 1);
      if (e.key === "ArrowRight") show(index + 1);
    });
    // Click on the dark backdrop (not the image) closes
    lightbox.addEventListener("click", function (e) {
      if (e.target === lightbox || e.target.classList.contains("lightbox-stage")) lightbox.close();
    });
    // Basic swipe support
    var startX = null;
    lightbox.addEventListener("touchstart", function (e) { startX = e.touches[0].clientX; }, { passive: true });
    lightbox.addEventListener("touchend", function (e) {
      if (startX === null) return;
      var dx = e.changedTouches[0].clientX - startX;
      if (Math.abs(dx) > 50) show(index + (dx < 0 ? 1 : -1));
      startX = null;
    });
  }

  /* ---------- Footer year ---------- */
  $$("[data-year]").forEach(function (el) { el.textContent = new Date().getFullYear(); });
})();
