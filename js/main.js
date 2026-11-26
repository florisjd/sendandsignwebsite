// Send & Sign marketing site — small progressive enhancements only.
(function () {
  "use strict";

  // Sticky nav hairline on scroll
  var nav = document.querySelector(".top-nav");
  if (nav) {
    var onScroll = function () { nav.classList.toggle("scrolled", window.scrollY > 8); };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
  }

  // Mobile menu
  var toggle = document.querySelector(".nav-toggle");
  var menu = document.getElementById("mobile-menu");
  if (toggle && menu) {
    toggle.addEventListener("click", function () {
      var open = menu.classList.toggle("open");
      toggle.setAttribute("aria-expanded", String(open));
    });
  }

  // Tabs (accessible tablist pattern)
  document.querySelectorAll("[role='tablist']").forEach(function (list) {
    var tabs = Array.prototype.slice.call(list.querySelectorAll("[role='tab']"));

    // Sliding highlight behind the selected tab
    var indicator = document.createElement("span");
    indicator.className = "tab-indicator";
    indicator.setAttribute("aria-hidden", "true");
    list.insertBefore(indicator, list.firstChild);
    list.classList.add("has-indicator");
    function moveIndicator() {
      var cur = list.querySelector("[role='tab'][aria-selected='true']") || tabs[0];
      if (!cur) return;
      indicator.style.width = cur.offsetWidth + "px";
      indicator.style.height = cur.offsetHeight + "px";
      indicator.style.translate = cur.offsetLeft + "px " + cur.offsetTop + "px";
    }
    moveIndicator();
    window.addEventListener("resize", moveIndicator, { passive: true });
    window.addEventListener("load", moveIndicator);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(moveIndicator);

    function select(tab) {
      tabs.forEach(function (t) {
        var on = t === tab;
        t.setAttribute("aria-selected", String(on));
        t.tabIndex = on ? 0 : -1;
        var panel = document.getElementById(t.getAttribute("aria-controls"));
        if (panel) { panel.classList.toggle("active", on); panel.hidden = !on; }
      });
      moveIndicator();
    }
    tabs.forEach(function (tab, i) {
      tab.addEventListener("click", function () { select(tab); });
      tab.addEventListener("keydown", function (e) {
        var next = null;
        if (e.key === "ArrowRight") next = tabs[(i + 1) % tabs.length];
        if (e.key === "ArrowLeft") next = tabs[(i - 1 + tabs.length) % tabs.length];
        if (next) { e.preventDefault(); next.focus(); select(next); }
      });
    });
  });

  // Reveal on scroll
  var reveals = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add("in"); io.unobserve(en.target); }
      });
    }, { rootMargin: "0px 0px -8% 0px" });
    reveals.forEach(function (el) { io.observe(el); });
  } else {
    reveals.forEach(function (el) { el.classList.add("in"); });
  }

  // ---------------------------------------------------------------
  // Product in motion: mock UIs animate while on screen.
  // Skipped entirely for prefers-reduced-motion; static markup stays as-is.
  // ---------------------------------------------------------------
  var reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (!reduceMotion && "IntersectionObserver" in window) {
    document.documentElement.classList.add("motion");

    // Run start()/stop() as an element enters/leaves the viewport
    var watch = function (els, start, stop, threshold) {
      if (!els.length) return;
      var obs = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          if (en.isIntersecting) start(en.target);
          else if (stop) stop(en.target);
        });
      }, { threshold: threshold || 0.4 });
      els.forEach(function (el) { obs.observe(el); });
    };
    var replay = function (el, cls) { el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls); };

    // 1. OTP code types itself in, digit by digit, then repeats
    var otps = Array.prototype.slice.call(document.querySelectorAll(".otp-boxes"));
    otps.forEach(function (box) {
      var cells = Array.prototype.slice.call(box.children);
      box._digits = cells.map(function (c) { return c.textContent; });
      box._count = cells.filter(function (c) { return c.classList.contains("filled"); }).length;
    });
    var stopOtp = function (box) { (box._timers || []).forEach(clearTimeout); box._timers = []; };
    var playOtp = function (box) {
      stopOtp(box);
      var cells = Array.prototype.slice.call(box.children);
      var t = box._timers;
      cells.forEach(function (c) { c.textContent = ""; c.classList.remove("filled", "pop", "caret"); });
      box.classList.remove("done");
      if (cells[0]) cells[0].classList.add("caret");
      for (var i = 0; i < box._count; i++) {
        (function (i) {
          t.push(setTimeout(function () {
            var c = cells[i];
            c.classList.remove("caret");
            c.textContent = box._digits[i];
            c.classList.add("filled", "pop");
            if (cells[i + 1]) cells[i + 1].classList.add("caret");
            else box.classList.add("done");
          }, 500 + i * 220));
        })(i);
      }
      t.push(setTimeout(function () { playOtp(box); }, 500 + box._count * 220 + 4200));
    };
    watch(otps, playOtp, stopOtp);

    // 2. Signed copy drops into the folder and the chip pops
    var saves = Array.prototype.slice.call(document.querySelectorAll(".ui")).filter(function (ui) {
      var signed = ui.querySelector(".file-row .ico.signed");
      if (signed) signed.closest(".file-row").classList.add("fr-signed");
      return !!signed;
    });
    var stopSave = function (ui) { clearInterval(ui._loop); };
    var playSave = function (ui) {
      stopSave(ui);
      replay(ui, "saved");
      ui._loop = setInterval(function () { replay(ui, "saved"); }, 6500);
    };
    watch(saves, playSave, stopSave);

    // 3. Sequential routing advances 1 → 2 → 3 → all signed
    var routes = Array.prototype.slice.call(document.querySelectorAll(".route"));
    routes.forEach(function (r) { r._orig = r.innerHTML; });
    var stopRoute = function (r) { clearInterval(r._loop); r.innerHTML = r._orig; };
    var playRoute = function (r) {
      clearInterval(r._loop);
      var nodes = r.querySelectorAll(".node"), links = r.querySelectorAll(".link"), step = 0;
      var paint = function () {
        Array.prototype.forEach.call(nodes, function (n, i) {
          n.classList.toggle("done", i < step);
          n.classList.toggle("active", i === step);
        });
        Array.prototype.forEach.call(links, function (l, i) { l.classList.toggle("done", i < step); });
        step = (step + 1) % (nodes.length + 2); // hold on "all done" for a beat
      };
      paint();
      r._loop = setInterval(paint, 1100);
    };
    watch(routes, playRoute, stopRoute);

    // 4. One-time entrances: routing bars grow, unmetered stat animates
    var once = function (el) { el.classList.add("played"); };
    watch(Array.prototype.slice.call(document.querySelectorAll(".route-diagram, .unmetered-band")), once, null, 0.15);

    // 5. Phone mockups tilt toward the cursor (mouse only)
    if (window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
      document.querySelectorAll(".phone-shot, .mini-phone").forEach(function (phone) {
        var zone = phone.closest(".chapter-body") || phone.parentElement;
        phone.classList.add("tilt");
        zone.addEventListener("pointermove", function (e) {
          var r = phone.getBoundingClientRect();
          var x = Math.max(-1, Math.min(1, (e.clientX - (r.left + r.width / 2)) / (r.width * 1.5)));
          var y = Math.max(-1, Math.min(1, (e.clientY - (r.top + r.height / 2)) / (r.height * 1.2)));
          phone.style.transform = "perspective(900px) rotateY(" + (x * 9).toFixed(2) + "deg) rotateX(" + (-y * 7).toFixed(2) + "deg)";
        }, { passive: true });
        zone.addEventListener("pointerleave", function () { phone.style.transform = ""; });
      });
    }
  }

  // Demo form: validate, post to /contact-submit.php (emails the sales inbox), show result.
  // Without JS the form still posts normally and the PHP redirects back to /contact?sent=1.
  var form = document.getElementById("demo-form");
  if (form) {
    var ok = document.getElementById("form-success");
    var err = document.getElementById("form-error");
    var started = document.getElementById("f-started");
    if (started) started.value = String(Date.now());
    var showSuccess = function () {
      form.hidden = true;
      if (ok) { ok.classList.add("show"); ok.focus(); }
    };
    var showError = function (msg) {
      if (!err) return;
      err.textContent = msg;
      err.hidden = false;
    };
    var qs = new URLSearchParams(location.search);
    if (qs.get("sent") === "1") showSuccess();
    if (qs.get("error") === "1") showError("Sorry, your request could not be sent. Please email floris@sendandsign.online directly.");

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      if (err) err.hidden = true;
      if (!form.checkValidity()) { form.reportValidity(); return; }
      var btn = form.querySelector("button[type='submit']");
      var label = btn ? btn.textContent : "";
      if (btn) { btn.disabled = true; btn.textContent = "Sending…"; }
      fetch(form.getAttribute("action"), {
        method: "POST",
        body: new FormData(form),
        headers: { "Accept": "application/json" }
      })
        .then(function (res) {
          return res.json().catch(function () { return { ok: false }; });
        })
        .then(function (data) {
          if (data && data.ok) { showSuccess(); return; }
          showError((data && data.error) || "Sorry, your request could not be sent. Please email floris@sendandsign.online directly.");
        })
        .catch(function () {
          showError("We couldn't reach the server. Please check your connection, or email floris@sendandsign.online.");
        })
        .then(function () {
          if (btn) { btn.disabled = false; btn.textContent = label; }
        });
    });
  }

  // Product tour: chapter buttons seek the video and start playback.
  var tour = document.getElementById("productTour");
  if (tour) {
    document.querySelectorAll("[data-seek]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var t = parseFloat(btn.getAttribute("data-seek")) || 0;
        var go = function () { try { tour.currentTime = t; } catch (e) {} var p = tour.play(); if (p && p.catch) p.catch(function () {}); };
        if (tour.readyState >= 1) go();
        else { tour.preload = "metadata"; tour.addEventListener("loadedmetadata", go, { once: true }); tour.load(); }
      });
    });
  }

  // Footer year
  var y =document.getElementById("year");
  if (y) y.textContent = String(new Date().getFullYear());
})();
