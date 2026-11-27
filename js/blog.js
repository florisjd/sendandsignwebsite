// Send & Sign blog — reading progress, TOC scroll-spy, copy link, index filtering.
(function () {
  "use strict";

  var reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // ---- Reading progress bar (article pages) ----
  var bar = document.querySelector(".read-progress");
  var prose = document.querySelector(".post-content");
  if (bar && prose && !reduceMotion) {
    var ticking = false;
    var update = function () {
      var rect = prose.getBoundingClientRect();
      var total = rect.height - window.innerHeight * 0.6;
      var p = total > 0 ? Math.min(1, Math.max(0, -rect.top / total)) : 0;
      bar.style.setProperty("--progress", p.toFixed(4));
      ticking = false;
    };
    window.addEventListener("scroll", function () {
      if (!ticking) { ticking = true; requestAnimationFrame(update); }
    }, { passive: true });
    window.addEventListener("resize", update, { passive: true });
    update();
  }

  // ---- Inline TOC: collapsed by default on narrow screens ----
  var inlineToc = document.querySelector(".post-content > .post-toc");
  if (inlineToc && window.matchMedia("(max-width: 1024px)").matches) {
    inlineToc.removeAttribute("open");
    inlineToc.addEventListener("click", function (e) {
      if (e.target.closest("a")) inlineToc.removeAttribute("open");
    });
  }

  // ---- TOC scroll-spy ----
  var tocLinks = Array.prototype.slice.call(document.querySelectorAll(".post-toc a[href^='#']"));
  if (tocLinks.length) {
    var headings = [];
    tocLinks.forEach(function (a) {
      var el = document.getElementById(decodeURIComponent(a.getAttribute("href").slice(1)));
      if (el && headings.indexOf(el) === -1) headings.push(el);
    });
    var setActive = function (id) {
      tocLinks.forEach(function (a) {
        var on = a.getAttribute("href") === "#" + id;
        a.classList.toggle("active", on);
        if (on) a.setAttribute("aria-current", "location"); else a.removeAttribute("aria-current");
      });
    };
    var spyTick = false;
    var spy = function () {
      // Active = last heading above the 35% line of the viewport.
      var current = "";
      for (var i = 0; i < headings.length; i++) {
        if (headings[i].getBoundingClientRect().top < window.innerHeight * 0.35) current = headings[i].id;
      }
      setActive(current);
      spyTick = false;
    };
    window.addEventListener("scroll", function () {
      if (!spyTick) { spyTick = true; requestAnimationFrame(spy); }
    }, { passive: true });
    spy();
  }

  // ---- Copy link ----
  document.querySelectorAll("[data-copy-link]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var url = btn.getAttribute("data-copy-link");
      var toast = btn.querySelector(".copy-toast");
      var done = function (msg) {
        if (!toast) return;
        toast.textContent = msg;
        clearTimeout(btn._t);
        btn._t = setTimeout(function () { toast.textContent = ""; }, 1800);
      };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(url).then(function () { done("Link copied"); }, function () { done("Copy failed"); });
      } else {
        var ta = document.createElement("textarea");
        ta.value = url; ta.setAttribute("readonly", ""); ta.style.position = "absolute"; ta.style.left = "-9999px";
        document.body.appendChild(ta); ta.select();
        try { document.execCommand("copy"); done("Link copied"); } catch (e) { done("Copy failed"); }
        document.body.removeChild(ta);
      }
    });
  });

  // ---- Blog index: category filter + search ----
  var items = Array.prototype.slice.call(document.querySelectorAll(".blog-listing [data-category]"));
  if (!items.length) return;
  var chips = Array.prototype.slice.call(document.querySelectorAll("[data-filter]"));
  var search = document.querySelector("[data-blog-search]");
  var empty = document.querySelector("[data-blog-empty]");
  var latestTitle = document.querySelector("[data-latest-title]");
  var reset = document.querySelector("[data-blog-reset]");
  var state = { cat: "all", q: "" };

  var params = new URLSearchParams(window.location.search);
  if (params.get("category") && chips.some(function (c) { return c.getAttribute("data-filter") === params.get("category"); })) {
    state.cat = params.get("category");
  }
  if (params.get("q") && search) { state.q = params.get("q").toLowerCase(); search.value = params.get("q"); }

  var apply = function () {
    var shown = 0;
    var shownInGrid = 0;
    items.forEach(function (el) {
      var ok = (state.cat === "all" || el.getAttribute("data-category") === state.cat) &&
        (!state.q || el.getAttribute("data-search").indexOf(state.q) !== -1);
      el.hidden = !ok;
      if (ok) { shown++; el.classList.add("in"); if (el.classList.contains("post-card")) shownInGrid++; }
    });
    chips.forEach(function (c) { c.setAttribute("aria-pressed", String(c.getAttribute("data-filter") === state.cat)); });
    if (empty) empty.hidden = shown !== 0;
    if (latestTitle) latestTitle.hidden = shownInGrid === 0;
    var url = new URL(window.location.href);
    if (state.cat === "all") url.searchParams.delete("category"); else url.searchParams.set("category", state.cat);
    if (state.q) url.searchParams.set("q", state.q); else url.searchParams.delete("q");
    history.replaceState(null, "", url.pathname + url.search);
  };

  chips.forEach(function (c) {
    c.addEventListener("click", function () { state.cat = c.getAttribute("data-filter"); apply(); });
  });
  if (search) {
    search.addEventListener("input", function () { state.q = search.value.trim().toLowerCase(); apply(); });
  }
  if (reset) {
    reset.addEventListener("click", function () { state.cat = "all"; state.q = ""; if (search) search.value = ""; apply(); });
  }
  if (state.cat !== "all" || state.q) apply();
})();
