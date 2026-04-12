(function () {
  "use strict";

  /* ===== CAROUSEL ===== */
  (function () {
    var stage = document.querySelector(".g-car__st");
    if (!stage) return;
    var slides = stage.querySelectorAll(".g-car__sl");
    var dotsEl = document.getElementById("dots");
    var curEl = document.getElementById("cur");
    var totEl = document.getElementById("tot");
    var prevBtn = document.querySelector(".g-car__btn--prev");
    var nextBtn = document.querySelector(".g-car__btn--next");
    var total = slides.length;
    var cur = 0;
    var timer;
    var busy = false;

    if (totEl) totEl.textContent = String(total).padStart(2, "0");

    function upd() { if (curEl) curEl.textContent = String(cur + 1).padStart(2, "0"); }

    function go(i) {
      if (busy) return;
      if (i < 0) i = total - 1;
      if (i >= total) i = 0;
      if (i === cur) return;
      busy = true;
      slides[cur].classList.remove("on");
      cur = i;
      slides[cur].classList.add("on");
      upd();
      if (dotsEl) {
        dotsEl.querySelectorAll(".g-car__dot").forEach(function (d, j) {
          d.classList.toggle("on", j === cur);
        });
      }
      setTimeout(function () { busy = false; }, 650);
    }

    function start() { stop(); timer = setInterval(function () { go(cur + 1); }, 4500); }
    function stop() { if (timer) clearInterval(timer); }

    if (dotsEl && total > 0) {
      for (var i = 0; i < total; i++) {
        var d = document.createElement("button");
        d.type = "button";
        d.className = "g-car__dot" + (i === 0 ? " on" : "");
        (function (idx) { d.addEventListener("click", function () { go(idx); start(); }); })(i);
        dotsEl.appendChild(d);
      }
    }

    if (prevBtn) prevBtn.addEventListener("click", function () { go(cur - 1); start(); });
    if (nextBtn) nextBtn.addEventListener("click", function () { go(cur + 1); start(); });

    var carEl = document.querySelector(".g-car");
    if (carEl) { carEl.addEventListener("mouseenter", stop); carEl.addEventListener("mouseleave", start); }

    if (total > 0) { slides[0].classList.add("on"); upd(); start(); }
  })();

  /* ===== SMOOTH SCROLL ===== */
  document.querySelectorAll("[data-scroll-to]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var t = this.getAttribute("data-scroll-to");
      if (!t) return;
      var el = document.querySelector(t);
      if (!el) return;
      var hh = parseInt(getComputedStyle(document.documentElement).getPropertyValue("--header-h"), 10) || 60;
      window.scrollTo({ top: el.getBoundingClientRect().top + pageYOffset - hh, behavior: "smooth" });
      var mn = document.getElementById("mobNav");
      var bg = document.getElementById("burger");
      if (mn && mn.classList.contains("on")) {
        mn.classList.remove("on");
        if (bg) bg.classList.remove("on");
        document.body.style.overflow = "";
      }
    });
  });

  /* ===== CALCULATOR ===== */
  (function () {
    var f = document.getElementById("priceCalculator");
    var p = document.getElementById("calcPrice");
    var a = document.getElementById("calcArea");
    var ae = document.getElementById("areaErr");
    if (!f || !p) return;

    f.addEventListener("submit", function (e) {
      e.preventDefault();
      var area = parseFloat(a ? a.value : "0");
      if (ae) ae.textContent = "";
      if (a) a.classList.remove("err");
      if (!area || area < 5 || area > 200) {
        p.textContent = "—";
        if (ae) ae.textContent = "Введите от 5 до 200 м²";
        if (a) a.classList.add("err");
        return;
      }
      var corners = parseInt(f.corners.value || "4", 10);
      var lights = parseInt(f.lights.value || "0", 10);
      var tEl = f.querySelector('input[name="type"]:checked');
      var type = tEl ? tEl.value : "matte";
      var base = 259;
      if (type === "floating") base = 1400;
      if (type === "lines") base = 1600;
      var cc = 1;
      if (corners >= 6 && corners < 8) cc = 1.08;
      if (corners >= 8) cc = 1.15;
      var total = (area * base + lights * 450) * cc;
      if (area >= 35) total *= 0.95;
      var r = Math.round(total / 100) * 100;
      p.textContent = new Intl.NumberFormat("ru-RU", { style: "currency", currency: "RUB", maximumFractionDigits: 0 }).format(r);
    });

    if (a) { a.addEventListener("input", function () { a.classList.remove("err"); if (ae) ae.textContent = ""; }); }
  })();

  /* ===== CONTACT FORM ===== */
  (function () {
    var f = document.getElementById("contactForm");
    var ok = document.getElementById("cOk");
    var ni = document.getElementById("contactName");
    var pi = document.getElementById("contactPhone");
    var mi = document.getElementById("contactMessage");
    var ne = document.getElementById("nameErr");
    var pe = document.getElementById("phoneErr");
    var sb = document.getElementById("cSubmit");
    if (!f || !ok) return;

    function val(v) { return v.replace(/\D/g, "").length >= 11; }
    function clr() {
      if (ni) ni.classList.remove("err");
      if (pi) pi.classList.remove("err");
      if (ne) ne.textContent = "";
      if (pe) pe.textContent = "";
    }

    f.addEventListener("submit", function (e) {
      e.preventDefault();
      clr();
      var n = ni ? ni.value.trim() : "";
      var ph = pi ? pi.value.trim() : "";
      var err = false;
      if (!n) { if (ne) ne.textContent = "Введите имя"; if (ni) ni.classList.add("err"); err = true; }
      if (!ph || !val(ph)) { if (pe) pe.textContent = "Введите корректный номер"; if (pi) pi.classList.add("err"); err = true; }
      if (err) return;
      if (sb) { sb.disabled = true; sb.textContent = "Отправляем..."; }
      fetch("/contact.php", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: "name=" + encodeURIComponent(n) + "&phone=" + encodeURIComponent(ph) + "&message=" + encodeURIComponent(mi ? mi.value.trim() : "")
      }).then(function (r) {
        return r.json();
      }).then(function (data) {
        if (data.success) {
          ok.hidden = false;
          f.reset();
        } else {
          alert("Ошибка отправки. Попробуйте позвонить нам.");
        }
      }).catch(function () {
        alert("Ошибка отправки. Попробуйте позвонить нам.");
      }).finally(function () {
        if (sb) { sb.disabled = false; sb.textContent = "Отправить заявку"; }
      });
    });

    if (ni) ni.addEventListener("input", function () { ni.classList.remove("err"); if (ne) ne.textContent = ""; });
    if (pi) pi.addEventListener("input", function () { pi.classList.remove("err"); if (pe) pe.textContent = ""; });
    if (mi) mi.addEventListener("input", function () { mi.classList.remove("err"); });
  })();

  /* ===== PHONE MASK ===== */
  (function () {
    var i = document.getElementById("contactPhone");
    if (!i) return;
    i.addEventListener("input", function () {
      var v = i.value.replace(/\D/g, "");
      if (!v.length) { i.value = ""; return; }
      if (v[0] === "8") v = "7" + v.slice(1);
      if (v[0] !== "7") v = "7" + v;
      var f = "+7";
      if (v.length > 1) f += " (" + v.slice(1, 4);
      if (v.length > 4) f += ") " + v.slice(4, 7);
      if (v.length > 7) f += "-" + v.slice(7, 9);
      if (v.length > 9) f += "-" + v.slice(9, 11);
      i.value = f;
    });
    i.addEventListener("focus", function () { if (!i.value) i.value = "+7"; });
    i.addEventListener("keydown", function (e) { if (e.key === "Backspace" && i.value.length <= 3) { e.preventDefault(); i.value = ""; } });
  })();

  /* ===== THEME ===== */
  (function () {
    var t = document.getElementById("theme-toggle");
    if (localStorage.getItem("potolocheck-theme") === "dark") document.body.classList.add("dark-theme");
    if (t) t.addEventListener("click", function () {
      document.body.classList.toggle("dark-theme");
      localStorage.setItem("potolocheck-theme", document.body.classList.contains("dark-theme") ? "dark" : "light");
    });
  })();

  /* ===== MOBILE NAV ===== */
  (function () {
    var b = document.getElementById("burger");
    var m = document.getElementById("mobNav");
    if (!b || !m) return;
    b.addEventListener("click", function () {
      var o = m.classList.toggle("on");
      b.classList.toggle("on");
      b.setAttribute("aria-expanded", o);
      document.body.style.overflow = o ? "hidden" : "";
    });
    m.querySelectorAll("a").forEach(function (l) {
      l.addEventListener("click", function () {
        m.classList.remove("on");
        b.classList.remove("on");
        b.setAttribute("aria-expanded", "false");
        document.body.style.overflow = "";
      });
    });
  })();

  /* ===== SCROLL ANIM ===== */
  (function () {
    var els = document.querySelectorAll(".anim");
    if (!els.length) return;
    var obs = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add("vis"); obs.unobserve(e.target); } });
    }, { threshold: 0.08, rootMargin: "0px 0px -30px 0px" });
    els.forEach(function (el) { obs.observe(el); });
  })();

})();
