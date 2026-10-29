/* ==========================================================================
   richardbwang.github.io — stages.js. Decoration only; the page reads the same without it.

   The chapters that act out their stage of the perception stack:
   1. 01 Calibration: AROUND the portrait, never on it. A graticule in the photo's margin and the
      frame's own edges arrive bowed by an uncalibrated lens (barrel distortion); the
      checkerboard's 54 inner corners are found one by one; the lens model is applied and the
      lines straighten. The photo is always shown clean. If the chapter is skipped (a jump, a
      fast scroll), it is finished the moment it leaves the screen, so it can never be seen
      half-done.
   2. 03 Tracking (Projects): the chapter title (always) and each project name (while pointed at
      or focused) carry a tracked box that trails them as you scroll: a tracker with some latency.
   3. 06 Localization: the title is localized from a particle cloud; beside the results log a
      Monte Carlo localization simulation runs on a top-down Push Back field; and the opener's
      3D robot is booted here (3c: which mode, when to load; robot3d.js draws it).
   Each runs only near the screen, stops on its own within seconds, and with reduced motion or
   "Pause motion" shows its finished state at once.
   ========================================================================== */
(function () {
  "use strict";

  var M = Math, root = document.documentElement;
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  /* Without site.js (it failed to load) there's no Motion button to pause with: show every stage
     finished. */
  var still = function () { return window.rbw ? window.rbw.still() : true; };
  var io = "IntersectionObserver" in window;
  var feat = window.rbwFeat;
  var small = function () { return innerWidth < 700; };
  root.classList.add("stg"); /* the stages may now hold their "before" states (style.css, section 14) */
  var onMotion = [];
  document.addEventListener("rbw:motion", function () { onMotion.forEach(function (f) { f(); }); });
  function when(el, margin, threshold, fn) { /* run fn once, when el comes within margin/threshold of the screen */
    if (!el) return;
    if (!io) return fn();
    var o = new IntersectionObserver(function (es) { if (es[0].isIntersecting) { o.disconnect(); fn(); } }, { rootMargin: margin, threshold: threshold });
    o.observe(el);
  }
  var ease = function (t) { return t < 0.5 ? 4 * t * t * t : 1 - M.pow(-2 * t + 2, 3) / 2; };
  var NS = "http://www.w3.org/2000/svg";

  /* ---------- 1. Calibration (01) ----------
     The lens model: a point at radius r from the photo's centre (r = 1 at its corners) is drawn
     at r·(1 + k·r²)/(1 + k). With k < 0 straight lines bow outward (barrel) and the corners stay
     put. The overlay is an SVG over the photo plus a margin: the graticule is masked out of the
     photo (it only draws in the margin), the edge path is the photo's own outline. */
  (function () {
    var sec = $("#about"), pic = sec && $("[data-cal]", sec), fi = pic && $(".fi", pic), fm = pic && $(".fm", pic);
    if (!fi) return;
    var k1 = $("[data-k1]", sec), cb = $("[data-cb]", sec), state = $("[data-cal-state]", sec);
    var K0 = -0.2;  /* the radial term of the "uncalibrated lens" (shown as k1 −0.20, barrel) */
    var labels = fm ? Array.prototype.slice.call(fm.children) : [];
    var svg = null, gP, eP, tP, mR, mP, mL, eR, eL = [], k = K0, started = false, done = false, raf = 0;

    function build() {
      svg = document.createElementNS(NS, "svg");
      svg.setAttribute("class", "cal-ov"); svg.setAttribute("aria-hidden", "true"); svg.setAttribute("focusable", "false");
      /* Two masks: the graticule keeps clear of the photo and its label strip; the bowed edges
         (whose top bulges up past the frame into the label strip) keep clear of the labels
         themselves, so they never strike through "ref_frame · me.jpg" or the calibration state
         while it is being read. */
      svg.innerHTML = '<defs><mask id="cal-m" maskUnits="userSpaceOnUse"><rect fill="#fff"/><rect fill="#000"/><rect fill="#000"/></mask>' +
        '<mask id="cal-ml" maskUnits="userSpaceOnUse"><rect fill="#fff"/>' + labels.map(function () { return '<rect fill="#000"/>'; }).join("") + '</mask></defs>' +
        '<path class="cal-g" mask="url(#cal-m)"/><path class="cal-e" mask="url(#cal-ml)"/><path class="cal-t"/>';
      var rs = svg.querySelectorAll("rect");
      mR = rs[0]; mP = rs[1]; mL = rs[2]; /* the photo, and its label strip, are kept clear */
      eR = rs[3]; eL = Array.prototype.slice.call(rs, 4); /* one per label, for the edges */
      gP = svg.querySelector(".cal-g"); eP = svg.querySelector(".cal-e"); tP = svg.querySelector(".cal-t");
      pic.appendChild(svg);
    }
    function draw() {
      if (!svg) build();
      var pr = pic.getBoundingClientRect(), r = fi.getBoundingClientRect();
      if (!r.width) return;
      var w = r.width, h = r.height, s = w / 8, m = M.round(s * 0.85);
      var W = w + 2 * m, H = h + 2 * m, cx = m + w / 2, cy = m + h / 2, R2 = (w * w + h * h) / 4;
      var st = svg.style;
      st.left = (r.left - pr.left - m) + "px"; st.top = (r.top - pr.top - m) + "px"; st.width = W + "px"; st.height = H + "px";
      svg.setAttribute("viewBox", "0 0 " + W + " " + H);
      mR.setAttribute("width", W); mR.setAttribute("height", H);
      eR.setAttribute("width", W); eR.setAttribute("height", H);
      mP.setAttribute("x", m - 0.5); mP.setAttribute("y", m - 0.5); mP.setAttribute("width", w + 1); mP.setAttribute("height", h + 1);
      if (fm) {
        var lr = fm.getBoundingClientRect(), ox = r.left - m, oy = r.top - m;
        mL.setAttribute("x", lr.left - ox - 6); mL.setAttribute("y", lr.top - oy - 4); mL.setAttribute("width", lr.width + 12); mL.setAttribute("height", lr.height + 4);
        labels.forEach(function (l, i) {
          var q = eL[i], b = l.getBoundingClientRect();
          q.setAttribute("x", b.left - ox - 5); q.setAttribute("y", b.top - oy - 3); q.setAttribute("width", b.width + 10); q.setAttribute("height", b.height + 6);
        });
      }
      var D = function (x, y) {
        var dx = x - cx, dy = y - cy, f = (1 + k * (dx * dx + dy * dy) / R2) / (1 + k);
        return (cx + dx * f).toFixed(1) + "," + (cy + dy * f).toFixed(1);
      };
      var line = function (x0, y0, x1, y1, n) {
        var d = "M" + D(x0, y0);
        for (var i = 1; i <= n; i++) d += "L" + D(x0 + (x1 - x0) * i / n, y0 + (y1 - y0) * i / n);
        return d;
      };
      /* the graticule: lines every s through the photo's frame, across the whole overlay */
      var g = "", i;
      for (i = 0; i <= 8; i++) g += line(m + i * s, 0, m + i * s, H, 24);
      for (i = 0; m + i * s <= m + h + 0.5; i++) g += line(0, m + i * s, W, m + i * s, 24);
      g += line(m / 2, 0, m / 2, H, 24) + line(W - m / 2, 0, W - m / 2, H, 24) + line(0, m / 2, W, m / 2, 24) + line(0, H - m / 2, W, H - m / 2, 24);
      gP.setAttribute("d", g);
      /* the frame's edges, as the lens sees them */
      eP.setAttribute("d", line(m, m, m + w, m, 24) + line(m + w, m, m + w, m + h, 24) + line(m + w, m + h, m, m + h, 24) + line(m, m + h, m, m, 24));
      /* registration marks at the corners of the rectified frame: outside it, pointing along its
         sides (none reaches up into the label strip) */
      var t = M.max(10, s * 0.35), o = 5, a = m - o, b = m + w + o, c = m, e = m + h;
      tP.setAttribute("d", "M" + (a - t) + "," + c + "H" + a + "V" + (c + t) + "M" + (b + t) + "," + c + "H" + b + "V" + (c + t) +
        "M" + (b + t) + "," + e + "H" + b + "V" + (e - t) + "M" + (a - t) + "," + e + "H" + a + "V" + (e - t));
      tP.style.opacity = k === 0 ? "1" : "0";
    }
    function finish() { /* the finished, calibrated state */
      done = true;
      cancelAnimationFrame(raf);
      sec.classList.add("cal-go");
      if (cb) cb.textContent = "found";
      if (k1) k1.textContent = "removed";
      if (state) state.textContent = "rectified";
      k = 0; draw(); svg.classList.add("done");
    }
    function run() { /* corners found (CSS, ~0.9 s), then the lens model is applied (0.9 s) */
      if (done || started) return;
      started = true;
      sec.classList.add("cal-go");
      if (state) state.textContent = "uncalibrated"; /* labels first: draw() masks the edges round them */
      if (k1) k1.textContent = "k1 −" + M.abs(K0).toFixed(2);
      if (cb) cb.textContent = "searching";
      k = K0; draw();
      var t0 = performance.now();
      raf = requestAnimationFrame(function f(now) {
        if (done) return;
        var t = (now - t0) / 1000;
        if (t > 0.95 && cb && cb.textContent !== "found") cb.textContent = "found";
        if (t > 1.05) {
          var p = M.min(1, (t - 1.05) / 0.9);
          if (state) state.textContent = "rectifying";
          k = K0 * (1 - ease(p)); draw();
          if (k1) k1.textContent = "k1 −" + M.abs(k).toFixed(2);
        }
        if (t < 2.1) raf = requestAnimationFrame(f);
        else finish();
      });
    }
    if (still() || !io) return finish();
    onMotion.push(function () { if (still() && !done) finish(); });
    /* Start when a third of the portrait is in view; finish at once if it leaves the screen
       (or is jumped past) before it's done. Before it starts nothing is drawn: never a
       half-calibrated frame. */
    var ob = new IntersectionObserver(function (es) {
      var e = es[es.length - 1];
      if (done) return ob.disconnect();
      if (e.isIntersecting && e.intersectionRatio >= 0.34) run();
      else if (!e.isIntersecting && (started || e.boundingClientRect.bottom < 0)) finish();
    }, { threshold: [0, 0.34] });
    ob.observe(fi);
    /* An observer stays silent if the portrait goes from below the screen to above it in one
       jump (a nav click, End, a deep link), so the scroll position is checked too. */
    var chk = 0;
    function passed() { chk = 0; if (!done && fi.getBoundingClientRect().bottom < 0) finish(); }
    addEventListener("scroll", function () { if (!done && !chk) chk = requestAnimationFrame(passed); }, { passive: true });
    addEventListener("load", passed);
    passed();
    addEventListener("resize", function () { if (svg) draw(); });
  })();

  /* ---------- 2. Tracking (03, Projects) ----------
     One smoothed copy of the scroll position (an exponential filter, ~0.14 s time constant) is
     the tracker's estimate; each box is drawn at the estimate, so while you scroll it trails its
     word by the tracker's lag (capped), and settles back on it when you stop. */
  (function () {
    var words = $$("[data-trk]"), proj = $("#projects");
    if (!words.length || !proj) return;
    var boxes = words.map(function (w) {
      var b = document.createElement("span");
      b.className = "tbox"; b.setAttribute("aria-hidden", "true");
      b.innerHTML = "<b>trk " + w.getAttribute("data-trk") + "</b>";
      w.appendChild(b);
      return b;
    });
    var S = scrollY, raf = 0, last = 0, onScreen = false;
    function apply(lag) { boxes.forEach(function (b) { b.style.transform = lag ? "translate3d(0," + lag.toFixed(1) + "px,0)" : ""; }); }
    function frame(now) {
      raf = 0;
      var dt = last ? M.min(0.05, (now - last) / 1000) : 1 / 60; last = now;
      S += (scrollY - S) * (1 - M.exp(-dt * 8));
      var lag = M.max(-80, M.min(80, scrollY - S));
      if (M.abs(scrollY - S) < 0.4) { S = scrollY; lag = 0; }
      apply(lag);
      if (lag && onScreen && !still()) raf = requestAnimationFrame(frame); else last = 0;
    }
    addEventListener("scroll", function () {
      if (still() || !onScreen) { S = scrollY; return; }
      if (!raf) raf = requestAnimationFrame(frame);
    }, { passive: true });
    if (io) new IntersectionObserver(function (es) {
      onScreen = es[0].isIntersecting;
      if (!onScreen) { S = scrollY; apply(0); }
    }).observe(proj);
    onMotion.push(function () { if (still()) { S = scrollY; apply(0); } });
  })();

  /* ---------- 3a. Localization (06): the title, from a particle cloud ----------
     Target points are sampled inside the word's own letters (drawn offscreen, the way feed.js
     finds features); the particles start scattered over the title's area and converge on them,
     the letters solidify as they do, then the particles fade. About 2 s, once.
     The word is only ever faint while the run is actually playing: the points are prepared
     ahead (within 250px of the screen) but nothing changes on the page until the run starts,
     which is the moment the title is read out (the same trigger as its reveal: any part of it
     on screen). The run then always plays to its end, so the resting state is the solid word. */
  (function () {
    var word = $("[data-particles]"), head = word && word.closest(".giant");
    if (!word || !feat || still()) return;
    var cv, ctx, pts = [], W, H, m, dpr, ready = false, started = false, done = false, raf = 0;
    function finish() {
      done = true; cancelAnimationFrame(raf);
      if (cv) cv.remove();
      word.classList.remove("loc-run"); word.style.removeProperty("--solid");
    }
    onMotion.push(function () { if (still() && !done) finish(); });
    function setup() { /* sample the targets and make the canvas; nothing on the page changes yet */
      if (ready) return true;
      var r = word.getBoundingClientRect(), s = 0.5;
      var oc = document.createElement("canvas"); oc.width = M.ceil(r.width * s) + 4; oc.height = M.ceil(r.height * s) + 4;
      var g = oc.getContext("2d", { willReadFrequently: true });
      g.fillStyle = "#000";
      if (!feat.glyphs(g, [word], word, s)) return false;
      var a = g.getImageData(0, 0, oc.width, oc.height).data, inside = [];
      for (var y = 0; y < oc.height; y += 2) for (var x = 0; x < oc.width; x += 2) if (a[(y * oc.width + x) * 4 + 3] > 160) inside.push([x / s, y / s]);
      if (!inside.length) return false;
      var n = small() ? 170 : 300;
      m = r.height * 0.3; W = r.width + 2 * m; H = r.height + 2 * m;
      for (var i = 0; i < n; i++) {
        var t = inside[(M.random() * inside.length) | 0];
        pts.push({ tx: t[0] + m, ty: t[1] + m, sx: M.random() * W, sy: M.random() * H, k: 2.2 + M.random() * 2.6, ph: M.random() * 6.28 });
      }
      dpr = M.min(window.devicePixelRatio || 1, 2);
      cv = document.createElement("canvas"); cv.className = "loc-cv"; cv.setAttribute("aria-hidden", "true");
      cv.width = M.round(W * dpr); cv.height = M.round(H * dpr);
      cv.style.cssText = "left:" + -m + "px;top:" + -m + "px;width:" + W + "px;height:" + H + "px";
      ctx = cv.getContext("2d");
      ready = true;
      return true;
    }
    function draw(t) {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);
      var fade = t < 1.35 ? 1 : M.max(0, 1 - (t - 1.35) / 0.55), j = 7 * M.exp(-2.4 * t);
      ctx.globalAlpha = 0.9 * fade; ctx.fillStyle = "#d4ff3a";
      for (var i = 0; i < pts.length; i++) {
        var p = pts[i], e = M.exp(-p.k * t);
        var x = p.tx + (p.sx - p.tx) * e + M.cos(p.ph + t * 9) * j, y = p.ty + (p.sy - p.ty) * e + M.sin(p.ph * 1.7 + t * 8) * j;
        ctx.fillRect(x - 1.25, y - 1.25, 2.5, 2.5);
      }
      word.style.setProperty("--solid", M.min(1, 0.06 + 0.94 * M.max(0, (t - 0.45) / 1.0)).toFixed(3));
    }
    function run() {
      if (done || started) return;
      if (still() || !setup()) return finish(); /* can't run: the word just stays solid */
      started = true;
      word.appendChild(cv); word.classList.add("loc-run"); draw(0);
      var t0 = performance.now();
      raf = requestAnimationFrame(function f(now) {
        if (done) return;
        var t = (now - t0) / 1000;
        draw(t);
        if (t < 1.95) raf = requestAnimationFrame(f); else finish();
      });
    }
    feat.fontsReady.then(function () {
      when(word, "250px 0px", 0, function () { if (!done) setup(); });
      when(head || word, "0px 0px -7% 0px", 0, run);
    });
  })();

  /* ---------- 3b. Monte Carlo localization (06) ----------
     The field: a top-down Push Back field (2025–26, the season of Worlds 2026), 144 in square,
     6 × 6 foam tiles of 24 in inside the perimeter. Red alliance wall on the left, blue on the
     right; their park zones at the middle of those walls and two loaders on each; the two long
     goals parallel to the other walls, in line with the loaders; the two centre goals crossed in
     the middle. Drawn once per size into a canvas under the live one.
     The robot: drives a loop round the centre goals by pure pursuit (16 in lookahead), so when
     it is moved it drives itself back to its route. It knows its heading (an IMU) and how far it
     has driven (odometry, with noise), and four distance sensors (front, left, back, right; 80 in
     range) measure the walls.
     The filter: each particle is a guess at (x, y); it moves with the odometry plus noise, is
     weighted by how well the readings it would expect match the real ones, and the set is
     resampled. The measurement noise starts wide and anneals, so the first convergence takes
     about 2–3 s. When no particle explains the readings (kidnapped), fresh random guesses are
     injected (augmented MCL) and the cloud finds the robot again.
     The run: the guesses appear scattered as the panel nears the screen; when half of it is in
     view they converge, the robot is kidnapped once on its own, they find it again, and it
     holds. "Kidnap the robot", dragging the robot (mouse) or tapping the field (touch) moves
     it again. */
  (function () {
    var fig = $("[data-mcl]");
    if (!fig) return;
    var cv = $("canvas", fig), ctx = cv.getContext && cv.getContext("2d"), btn = $("[data-kidnap]", fig);
    if (!ctx) return;
    var bgc = document.createElement("canvas"), bctx = bgc.getContext("2d");
    bgc.setAttribute("aria-hidden", "true");
    cv.parentNode.insertBefore(bgc, cv);
    cv.classList.add("live");
    var rd = { n: $("[data-mcl-n]", fig), s: $("[data-mcl-s]", fig), x: $("[data-mcl-x]", fig), y: $("[data-mcl-y]", fig), st: $("[data-mcl-state]", fig) };
    var F = 144, RANGE = 80, SZ = 18, N = small() ? 240 : 420, SPEED = 30, LOOK = 16;
    var DIRS = [0, M.PI / 2, M.PI, -M.PI / 2];
    var rob = { x: 0, y: 0, th: 0, ci: 0 }, ps = [], z = [], est = { x: 72, y: 72, vx: 1600, vy: 1600, cxy: 0 };
    var anneal = 0, raf = 0, last = 0, holdFrom = 0, onScreen = false, near = false, S = 0, dpr = 1, ran = false;
    var phase = "idle", autoKidnapped = false, held = false, dragging = null;

    var gauss = function () { var u = 1 - M.random(), v = M.random(); return M.sqrt(-2 * M.log(u)) * M.cos(6.2832 * v); };
    var sp = function (v, e) { return (v < 0 ? -1 : 1) * M.pow(M.abs(v), e); };
    /* The route: a rounded rectangle round the centre goals, clear of every field element. */
    var ROUTE = [];
    for (var ri = 0; ri < 240; ri++) { var ru = ri / 240 * 6.2832; ROUTE.push({ x: 72 + 44 * sp(M.cos(ru), 0.55), y: 72 + 27 * sp(M.sin(ru), 0.55) }); }

    function ray(x, y, a) { /* distance from (x, y) along heading a to the field wall */
      var c = M.cos(a), s = M.sin(a), tx = c > 1e-6 ? (F - x) / c : c < -1e-6 ? -x / c : 1e9, ty = s > 1e-6 ? (F - y) / s : s < -1e-6 ? -y / s : 1e9;
      return M.min(tx, ty);
    }
    function scatter(p) { p.x = 9 + M.random() * (F - 18); p.y = 9 + M.random() * (F - 18); p.w = 1; }
    function reset() { ps = []; for (var i = 0; i < N; i++) { var p = {}; scatter(p); ps.push(p); } anneal = 0; }
    function closest(global) { /* index of the route point nearest the robot (a window ahead, or all of it) */
      var best = 1e9, bi = rob.ci, n = ROUTE.length;
      for (var j = global ? 0 : -6; global ? j < n : j <= 30; j++) {
        var i = ((rob.ci + j) % n + n) % n, q = ROUTE[i], d = (q.x - rob.x) * (q.x - rob.x) + (q.y - rob.y) * (q.y - rob.y);
        if (d < best) { best = d; bi = i; }
      }
      rob.ci = bi;
      return M.sqrt(best);
    }
    function drive(dt) { /* pure pursuit: steer for the route point one lookahead ahead */
      if (dragging) return 0;
      if (closest(false) > 12) closest(true);
      var n = ROUTE.length, tgt = ROUTE[rob.ci], k = rob.ci;
      for (var j = 0; j < n; j++) { k = (rob.ci + j) % n; tgt = ROUTE[k]; if (M.hypot(tgt.x - rob.x, tgt.y - rob.y) >= LOOK) break; }
      var al = M.atan2(tgt.y - rob.y, tgt.x - rob.x) - rob.th;
      al = M.atan2(M.sin(al), M.cos(al));
      var w = M.max(-3.2, M.min(3.2, SPEED * 2 * M.sin(al) / LOOK));
      var v = SPEED * (M.abs(al) > 1.2 ? 0.35 : 1); /* slow to turn round when it faces away */
      rob.th += w * dt;
      var ds = v * dt;
      rob.x = M.max(SZ / 2, M.min(F - SZ / 2, rob.x + ds * M.cos(rob.th)));
      rob.y = M.max(SZ / 2, M.min(F - SZ / 2, rob.y + ds * M.sin(rob.th)));
      return ds;
    }
    function sense() { z = DIRS.map(function (d) { var r = ray(rob.x, rob.y, rob.th + d) + gauss() * 1.2; return r > RANGE ? -1 : r; }); }
    function update(ds) {
      /* The measurement noise anneals from 40 in to 2.2 in, and the likelihood is tempered (raised
         to a power that ramps from 0.04 to 1 over 3.6 s): the first convergence is gradual. */
      var sig = M.max(2.2, 40 * M.exp(-anneal / 1.9)), ramp = M.min(1, anneal / 3.6), beta = 0.04 + 0.96 * ramp * ramp * (3 - 2 * ramp);
      var tw = 0, raw = 0, i, p, dif = 0.15 * sig; /* dif: a little extra diffusion while the noise is wide */
      for (i = 0; i < ps.length; i++) {
        p = ps[i];
        var th = rob.th + gauss() * 0.02, d = ds + gauss() * (0.08 * ds + 0.12);
        p.x += d * M.cos(th) + gauss() * dif; p.y += d * M.sin(th) + gauss() * dif;
        p.x = M.max(1, M.min(F - 1, p.x)); p.y = M.max(1, M.min(F - 1, p.y));
        var w = 1;
        for (var k = 0; k < 4; k++) {
          var e = ray(p.x, p.y, rob.th + DIRS[k]), want = e > RANGE ? -1 : e;
          if (z[k] < 0 && want < 0) continue;
          if (z[k] < 0 || want < 0) { w *= 0.25; continue; }
          var q = (z[k] - want) / sig; w *= M.exp(-0.5 * q * q);
        }
        raw += w;
        w = M.pow(w, beta);
        p.w = w; tw += w;
      }
      /* Augmented MCL: if nothing explains the readings (kidnapped), inject random guesses. */
      if (raw / ps.length < 1e-6) {
        for (i = 0; i < ps.length; i++) if (M.random() < 0.5) scatter(ps[i]);
        anneal = 0; tw = 0; ps.forEach(function (p) { tw += p.w; });
        if (phase === "kidnapped" || phase === "converged") phase = "relocalizing";
      }
      var neff = 0;
      for (i = 0; i < ps.length; i++) { ps[i].w /= tw || 1; neff += ps[i].w * ps[i].w; }
      if (1 / neff < ps.length * 0.6) { /* systematic resampling, plus a little jitter and 1% fresh guesses */
        var out = [], c = ps[0].w, j = 0, step = 1 / ps.length, r0 = M.random() * step;
        for (i = 0; i < ps.length; i++) {
          var u = r0 + i * step;
          while (u > c && j < ps.length - 1) { j++; c += ps[j].w; }
          var np = { x: ps[j].x + gauss() * 0.7, y: ps[j].y + gauss() * 0.7, w: 1 / ps.length };
          if (M.random() < 0.01) { scatter(np); np.w = 1 / ps.length; }
          out.push(np);
        }
        ps = out;
      }
      var mx = 0, my = 0, vx = 0, vy = 0, cxy = 0;
      ps.forEach(function (p) { mx += p.w * p.x; my += p.w * p.y; });
      ps.forEach(function (p) { vx += p.w * (p.x - mx) * (p.x - mx); vy += p.w * (p.y - my) * (p.y - my); cxy += p.w * (p.x - mx) * (p.y - my); });
      /* Once most of the cloud has gathered, report the main cluster (the guesses within 18 in of
         the mean, re-centred), so the 1% fresh guesses don't make the spread jump about. */
      var cw = 0, cx = 0, cy = 0;
      ps.forEach(function (p) { if (M.abs(p.x - mx) < 18 && M.abs(p.y - my) < 18) { cw += p.w; cx += p.w * p.x; cy += p.w * p.y; } });
      if (cw > 0.85) {
        cx /= cw; cy /= cw; vx = vy = cxy = 0;
        ps.forEach(function (p) { if (M.abs(p.x - cx) < 18 && M.abs(p.y - cy) < 18) { vx += p.w * (p.x - cx) * (p.x - cx); vy += p.w * (p.y - cy) * (p.y - cy); cxy += p.w * (p.x - cx) * (p.y - cy); } });
        mx = cx; my = cy; vx /= cw; vy /= cw; cxy /= cw;
      }
      est = { x: mx, y: my, cxy: cxy, vx: vx, vy: vy };
    }
    var stepN = 0, odo = 0;
    function simStep(dt) { /* 30 Hz motion; sensors and the filter update at 10 Hz */
      anneal += dt;
      odo += drive(dt);
      if (++stepN % 3 === 0) { sense(); update(odo); odo = 0; }
    }
    function sigma() { return M.sqrt(((est.vx || 0) + (est.vy || 0)) / 2); }
    /* "converged" means the cloud is tight AND on the robot (the simulation knows the truth; a
       tight cloud in the wrong place, just after a kidnap, is not converged). */
    function locked() { return sigma() < 2.6 && M.hypot(est.x - rob.x, est.y - rob.y) < 5; }

    /* ---- drawing ---- */
    var PAD = 0.035, k = 1, o = 0;
    var X = function (x) { return o + x * k; }, Y = function (y) { return o + (F - y) * k; };
    function size() {
      var r = cv.getBoundingClientRect();
      dpr = M.min(window.devicePixelRatio || 1, 2);
      S = r.width;
      cv.width = bgc.width = M.round(S * dpr); cv.height = bgc.height = M.round(S * dpr);
      o = S * PAD; k = (S - 2 * o) / F;
      drawField();
    }
    function drawField() {
      var g = bctx;
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      g.clearRect(0, 0, S, S);
      var u = k; /* px per inch */
      /* foam tiles and seams */
      g.fillStyle = "#1b1b1f"; g.fillRect(X(0), Y(F), F * u, F * u);
      g.strokeStyle = "#0b0b0d"; g.lineWidth = M.max(1, u * 0.25);
      g.beginPath();
      for (var i = 1; i < 6; i++) { g.moveTo(X(i * 24), Y(0)); g.lineTo(X(i * 24), Y(F)); g.moveTo(X(0), Y(i * 24)); g.lineTo(X(F), Y(i * 24)); }
      g.stroke();
      /* the centre line: two white tape lines */
      g.strokeStyle = "rgba(241,239,232,0.55)"; g.lineWidth = M.max(1, u * 0.5);
      g.beginPath(); g.moveTo(X(71), Y(0)); g.lineTo(X(71), Y(F)); g.moveTo(X(73), Y(0)); g.lineTo(X(73), Y(F)); g.stroke();
      /* park zones, hatched, at the middle of each alliance wall */
      [["#ff4a3d", 0], ["#5b95ff", F - 18]].forEach(function (pz) {
        var x0 = X(pz[1]), y0 = Y(84), w = 18 * u, h = 24 * u;
        g.save(); g.beginPath(); g.rect(x0, y0, w, h); g.clip();
        g.strokeStyle = pz[0]; g.globalAlpha = 0.28; g.lineWidth = 1;
        g.beginPath(); for (var d = -h; d < w + h; d += 6) { g.moveTo(x0 + d, y0 + h); g.lineTo(x0 + d + h, y0); } g.stroke();
        g.restore();
        g.strokeStyle = pz[0]; g.lineWidth = M.max(1.5, u * 0.9); g.globalAlpha = 0.95;
        g.strokeRect(x0 + g.lineWidth / 2, y0, w - g.lineWidth, h);
        g.globalAlpha = 1;
      });
      /* long goals: orange tubes on two stands, in line with the loaders */
      [24, 120].forEach(function (gy) {
        var x0 = X(48), x1 = X(96), yc = Y(gy), hw = 3.2 * u;
        g.fillStyle = "rgba(0,0,0,0.45)"; g.fillRect(x0 + u, yc - hw + u * 1.2, x1 - x0, 2 * hw);
        g.fillStyle = "#c27410"; g.fillRect(x0 - u, yc - hw * 1.5, 2.6 * u, hw * 3); g.fillRect(x1 - 1.6 * u, yc - hw * 1.5, 2.6 * u, hw * 3);
        g.fillStyle = "#e8961a"; g.fillRect(x0, yc - hw, x1 - x0, 2 * hw);
        g.fillStyle = "#6b3f06"; g.fillRect(x0 + 1.2 * u, yc - hw * 0.45, x1 - x0 - 2.4 * u, hw * 0.9);
      });
      /* centre goals: two shorter tubes crossed in the middle (upper and lower) */
      [[M.PI / 4, "#e8961a"], [-M.PI / 4, "#d4881a"]].forEach(function (cg) {
        g.save(); g.translate(X(72), Y(72)); g.rotate(-cg[0]);
        var L = 11 * u, hw = 2.4 * u;
        g.fillStyle = "rgba(0,0,0,0.4)"; g.fillRect(-L + u, -hw + u, 2 * L, 2 * hw);
        g.fillStyle = cg[1]; g.fillRect(-L, -hw, 2 * L, 2 * hw);
        g.fillStyle = "#6b3f06"; g.fillRect(-L + u, -hw * 0.4, 2 * L - 2 * u, hw * 0.8);
        g.restore();
      });
      g.fillStyle = "#3a3a40"; g.beginPath(); g.arc(X(72), Y(72), 2 * u, 0, 6.2832); g.fill();
      /* loaders: tubes against the alliance walls, in line with the long goals */
      [[3.5, 24, "#ff4a3d"], [3.5, 120, "#ff4a3d"], [F - 3.5, 24, "#5b95ff"], [F - 3.5, 120, "#5b95ff"]].forEach(function (ld) {
        g.beginPath(); g.arc(X(ld[0]), Y(ld[1]), 3 * u, 0, 6.2832);
        g.fillStyle = "#26262b"; g.fill();
        g.lineWidth = M.max(1.5, u * 0.9); g.strokeStyle = "#e8961a"; g.stroke();
        g.beginPath(); g.arc(X(ld[0]), Y(ld[1]), 1.2 * u, 0, 6.2832); g.fillStyle = ld[2]; g.fill();
      });
      /* the perimeter: an aluminium rail, with the alliance walls marked outside it */
      var rw = M.max(2, u * 1.4);
      g.strokeStyle = "#b9b9b3"; g.lineWidth = rw;
      g.strokeRect(X(0) - rw / 2, Y(F) - rw / 2, F * u + rw, F * u + rw);
      g.strokeStyle = "#5c5c58"; g.lineWidth = 1;
      g.strokeRect(X(0) + 0.5, Y(F) + 0.5, F * u - 1, F * u - 1);
      g.fillStyle = "#ff4a3d"; g.fillRect(X(0) - rw - M.max(2, o * 0.35), Y(F) + F * u * 0.3, M.max(2, o * 0.35), F * u * 0.4);
      g.fillStyle = "#5b95ff"; g.fillRect(X(F) + rw, Y(F) + F * u * 0.3, M.max(2, o * 0.35), F * u * 0.4);
    }
    function draw() {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, S, S);
      /* sensor rays (paper, dashed) to where they hit the wall */
      ctx.strokeStyle = "#f1efe8"; ctx.globalAlpha = 0.5; ctx.lineWidth = 1; ctx.setLineDash([3, 4]);
      ctx.beginPath();
      DIRS.forEach(function (d, i) {
        if (!(z[i] > 0)) return;
        var a = rob.th + d; ctx.moveTo(X(rob.x), Y(rob.y)); ctx.lineTo(X(rob.x + z[i] * M.cos(a)), Y(rob.y + z[i] * M.sin(a)));
      });
      ctx.stroke(); ctx.setLineDash([]);
      /* particles */
      ctx.globalAlpha = 0.85; ctx.fillStyle = "#d4ff3a";
      for (var i = 0; i < ps.length; i++) ctx.fillRect(X(ps[i].x) - 1.1, Y(ps[i].y) - 1.1, 2.2, 2.2);
      /* the robot (truth), top-down: an 18 in chassis, four wheels, a heading mark */
      ctx.globalAlpha = 1;
      ctx.save(); ctx.translate(X(rob.x), Y(rob.y)); ctx.rotate(-rob.th);
      var h = SZ / 2 * k;
      ctx.fillStyle = "rgba(10,10,11,0.82)"; ctx.fillRect(-h, -h, 2 * h, 2 * h);
      ctx.fillStyle = "#f1efe8";
      [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(function (wh) { ctx.fillRect(wh[0] * h * 0.62 - h * 0.26, wh[1] * h - h * 0.14 - (wh[1] > 0 ? h * 0.06 : -h * 0.06), h * 0.52, h * 0.2); });
      ctx.strokeStyle = dragging ? "#d4ff3a" : "#f1efe8"; ctx.lineWidth = 1.5; ctx.strokeRect(-h, -h, 2 * h, 2 * h);
      ctx.beginPath(); ctx.moveTo(h * 0.15, 0); ctx.lineTo(h * 0.95, 0); ctx.moveTo(h * 0.95, 0); ctx.lineTo(h * 0.6, -h * 0.3); ctx.moveTo(h * 0.95, 0); ctx.lineTo(h * 0.6, h * 0.3); ctx.stroke();
      ctx.restore();
      /* the estimate: mean pose and its 2σ ellipse */
      var tr = (est.vx || 0) + (est.vy || 0), det = (est.vx || 0) * (est.vy || 0) - est.cxy * est.cxy;
      var l1 = tr / 2 + M.sqrt(M.max(0, tr * tr / 4 - det)), l2 = tr / 2 - M.sqrt(M.max(0, tr * tr / 4 - det));
      var ang = 0.5 * M.atan2(2 * est.cxy, (est.vx || 0) - (est.vy || 0));
      if (sigma() > 18) { ctx.globalAlpha = 1; return; } /* no estimate to show while the guesses are still everywhere */
      ctx.strokeStyle = "#d4ff3a"; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.ellipse(X(est.x), Y(est.y), M.max(2, M.min(S, 2 * M.sqrt(M.max(l1, 0)) * k)), M.max(2, M.min(S, 2 * M.sqrt(M.max(l2, 0)) * k)), -ang, 0, 6.2832); ctx.stroke();
      ctx.save(); ctx.translate(X(est.x), Y(est.y)); ctx.rotate(-rob.th);
      ctx.beginPath(); ctx.moveTo(-5, 0); ctx.lineTo(12, 0); ctx.moveTo(12, 0); ctx.lineTo(7, -4); ctx.moveTo(12, 0); ctx.lineTo(7, 4); ctx.stroke();
      ctx.restore();
      ctx.globalAlpha = 1;
    }
    var readT = 0;
    function readout(force) {
      var t = performance.now();
      if (!force && t - readT < 100) return; readT = t;
      var s = sigma();
      rd.n.textContent = ps.length; rd.s.textContent = s.toFixed(1) + " in"; rd.x.textContent = est.x.toFixed(0); rd.y.textContent = est.y.toFixed(0);
      rd.st.textContent = phase;
    }

    /* ---- the run ---- */
    function frame(now) {
      raf = 0;
      var dt = last ? M.min(0.05, (now - last) / 1000) : 1 / 60; last = now;
      var n = M.max(1, M.round(dt * 30));
      for (var i = 0; i < n; i++) simStep(1 / 30);
      if (locked() && !dragging) {
        if (phase !== "converged") { phase = "converged"; holdFrom = now; }
      } else if (phase === "converged" && (sigma() > 6 || M.hypot(est.x - rob.x, est.y - rob.y) > 9)) { phase = "relocalizing"; holdFrom = 0; }
      /* once converged for 1.4 s: kidnap the robot once, on its own; after that, hold */
      if (phase === "converged" && holdFrom && now - holdFrom > 1400 && !autoKidnapped && !still()) { autoKidnapped = true; kidnap(); }
      draw(); readout();
      var holding = phase === "converged" && holdFrom && now - holdFrom > 1600 && autoKidnapped && !dragging;
      if (onScreen && !still() && !document.hidden && !holding) raf = requestAnimationFrame(frame);
      else { last = 0; readout(true); held = holding; }
    }
    function start() {
      if (raf) return;
      if (still()) { converge(); return; }
      last = 0; held = false;
      raf = requestAnimationFrame(frame);
    }
    function converge() { /* the still version: run the filter offscreen until it settles, draw once */
      for (var i = 0; i < 300; i++) simStep(1 / 30);
      phase = locked() ? "converged" : "localizing";
      draw(); readout(true);
    }
    function begin() { /* scattered: the first frame, before the run */
      if (ran) return;
      size();
      rob.ci = 40; var p0 = ROUTE[rob.ci], p1 = ROUTE[rob.ci + 1];
      rob.x = p0.x; rob.y = p0.y; rob.th = M.atan2(p1.y - p0.y, p1.x - p0.x);
      reset(); sense(); est = { x: 72, y: 72, vx: 1600, vy: 1600, cxy: 0 };
      phase = "localizing";
      ran = true;
      if (still()) return converge(); /* no motion: only ever the settled frame */
      draw(); readout(true);
    }
    function kidnap(x, y) { /* move the robot; the particles don't know */
      if (x == null) {
        rob.ci = (rob.ci + 70 + M.floor(M.random() * 80)) % ROUTE.length;
        var p = ROUTE[rob.ci], q = ROUTE[(rob.ci + 1) % ROUTE.length];
        rob.x = p.x; rob.y = p.y; rob.th = M.atan2(q.y - p.y, q.x - p.x);
      } else {
        rob.x = M.max(SZ / 2, M.min(F - SZ / 2, x)); rob.y = M.max(SZ / 2, M.min(F - SZ / 2, y));
        closest(true);
      }
      sense(); phase = "kidnapped"; holdFrom = 0;
      draw(); readout(true);
    }
    btn.addEventListener("click", function () {
      if (!ran) begin();
      kidnap();
      if (raf) { cancelAnimationFrame(raf); raf = 0; }
      start();
    });
    /* Drag the robot (mouse, pen) or tap the field (touch, or click an empty spot) to move it. */
    function fieldAt(e) { var r = cv.getBoundingClientRect(); return { x: (e.clientX - r.left - o) / k, y: F - (e.clientY - r.top - o) / k }; }
    function onRobot(q) { return M.abs(q.x - rob.x) < SZ * 0.75 && M.abs(q.y - rob.y) < SZ * 0.75; }
    var down = null;
    cv.addEventListener("pointerdown", function (e) {
      if (!ran || e.button > 0) return;
      var q = fieldAt(e);
      down = { x: e.clientX, y: e.clientY, type: e.pointerType };
      if (e.pointerType !== "touch" && onRobot(q)) {
        dragging = { id: e.pointerId };
        try { cv.setPointerCapture(e.pointerId); } catch (err) {}
        cv.classList.add("drag"); phase = "kidnapped"; holdFrom = 0;
        e.preventDefault();
        if (raf) { cancelAnimationFrame(raf); raf = 0; }
        start();
      }
    });
    cv.addEventListener("pointermove", function (e) {
      var q = fieldAt(e);
      if (dragging) {
        rob.x = M.max(SZ / 2, M.min(F - SZ / 2, q.x)); rob.y = M.max(SZ / 2, M.min(F - SZ / 2, q.y));
        if (!raf) draw();
      } else if (e.pointerType === "mouse") cv.classList.toggle("over", ran && onRobot(q));
    });
    function up(e) {
      if (dragging) {
        dragging = null; cv.classList.remove("drag");
        closest(true);
        if (!raf) start();
      } else if (down && e.type === "pointerup" && M.hypot(e.clientX - down.x, e.clientY - down.y) < 10) {
        var q = fieldAt(e);
        if (q.x > 0 && q.x < F && q.y > 0 && q.y < F) { kidnap(q.x, q.y); if (raf) { cancelAnimationFrame(raf); raf = 0; } start(); }
      }
      down = null;
    }
    cv.addEventListener("pointerup", up);
    cv.addEventListener("pointercancel", function () { down = null; if (dragging) { dragging = null; cv.classList.remove("drag"); } });

    if (window.ResizeObserver) new ResizeObserver(function () { if (ran && M.abs(cv.getBoundingClientRect().width - S) > 1) { size(); draw(); } }).observe(cv);
    if (io) {
      /* near: lay the field and the scattered guesses; half in view: run */
      new IntersectionObserver(function (es) { if (es[0].isIntersecting) begin(); }, { rootMargin: "240px 0px" }).observe(cv);
      new IntersectionObserver(function (es) {
        onScreen = es[0].isIntersecting;
        if (onScreen) { begin(); if (!held) setTimeout(function () { if (onScreen) start(); }, 300); }
      }, { threshold: 0.5 }).observe(cv);
    }
    document.addEventListener("visibilitychange", function () {
      if (document.hidden && raf) { cancelAnimationFrame(raf); raf = 0; }
      else if (!document.hidden && onScreen && ran && !held) start();
    });
    onMotion.push(function () {
      if (still()) { if (raf) { cancelAnimationFrame(raf); raf = 0; } if (ran) converge(); }
      else if (onScreen && ran && !held) start();
    });
  })();
  /* ---------- 3c. The 3D robot (06 opener) ----------
     The figure reads without any of this: a still (a lazy <img>), its detector box, the parts
     list and the caption. Here it gets one of three modes:
     - STILL: reduced motion, Save-Data, ≤ 2 GB of memory, no WebGL 2 or no import maps (or the
       3D failed): the still stays, and "Explode" swaps it for the exploded still and its labels.
     - OFFER: phones and touch screens (< 700px or a coarse pointer), or motion paused: the still
       plus "Load 3D model · 2.1 MB". Nothing 3D downloads unless it is pressed.
     - AUTO: a desktop with motion. The opener is pinned now (html.r3d-pinned gives its track the
       scroll length; it is far below the first screen, so nothing visible moves) and, once it is
       within ~1.5 screens, a WebGL 2 context is probed (one that would run on a software
       renderer is refused: the still is better there), the model download starts and
       robot3d.js (with three.js, through the importmap) is imported. The probed context is
       handed to three.js, so only one is ever made. When it is all in, the scroll plays the act.
       If the reader is well into the pinned scroll before it is ready, the opener unpins in place
       (no scrolling past a still that isn't doing anything) and pins again once it is off screen
       (below, or where you next stop back on it).
     Whatever fails on the way (no context, a load error, the context lost for good) puts the
     still back and unpins the opener without moving what you're looking at (and the rest of the
     visit keeps the still). "Pause motion" freezes the 3D on the still's view and unpins it;
     resuming pins it again.
     The pin never changes while the page is scrolling (a nav jump, a deep link, End, a fling):
     an instant scroll would cancel a smooth one still on its way. It waits for the scroll to
     stop, and a jump that only passes the opener doesn't start the download. Nor does it change
     while what follows the pinned part is on screen (that would be a layout shift): it waits
     for a stop with the pinned part filling the screen, or the opener below it.
     Testing on a software renderer (headless Chrome): add ?r3d=force to the URL. */
  (function () {
    var fig = $("[data-r3d]");
    if (!fig) return;
    var track = $("[data-r3d-track]"), head = fig.closest(".ch-head"), trackM = $(".r3d-track-m", fig), pinBox = $(".r3d-pin", fig);
    var view = $("[data-r3d-view]", fig), bar = $(".r3d-bar", fig), state = $("[data-r3d-state]", fig);
    var bLoad = $("[data-r3d-load]", fig), bEx = $("[data-r3d-explode]", fig), bReset = $("[data-r3d-reset]", fig), bMotion = $("[data-r3d-motion]", fig);
    var asPic = $(".r3d-as", fig), exPic = $(".r3d-ex", fig), sbox = $(".r3d-sbox", fig), slabs = $(".r3d-slabs", fig);
    var title = head && $(".giant-w", head);
    if (!track || !head || !view || !bar) return;
    /* media queries, made once (stages run every frame through pinEls) */
    var mq = function (q) { return window.matchMedia ? matchMedia(q) : { matches: false }; };
    var mqWide = mq("(min-width: 1000px)"), mqReduced = mq("(prefers-reduced-motion: reduce)"), mqCoarse = mq("(pointer: coarse)"), mqHover = mq("(hover: hover)");
    var wide = function () { return mqWide.matches; };
    var reduced = function () { return mqReduced.matches; };
    var touch = function () { return innerWidth < 700 || mqCoarse.matches || !mqHover.matches; };
    var force = /[?&]r3d=force\b/.test(location.search);
    var conn = navigator.connection, mem = navigator.deviceMemory;
    var capable = io && !!window.WebGL2RenderingContext && !!window.ResizeObserver &&
      !!(window.HTMLScriptElement && HTMLScriptElement.supports && HTMLScriptElement.supports("importmap")) &&
      !(conn && conn.saveData) && !(mem && mem <= 2);
    var live = null, busy = false, dead = false, ex = false, armed = null, late = false, probe = null, eager = false;
    /* what this visit already knows (sessionStorage): "still" (the 3D failed here: keep the
       still), "free" (it was left unpinned: a reload restores the scroll into that layout) */
    var KEY = "rbw-r3d", memo = null;
    try { memo = sessionStorage.getItem(KEY); } catch (e) { /* private mode: fine */ }
    var navE = window.performance && performance.getEntriesByType ? performance.getEntriesByType("navigation")[0] : null;
    var restored = !!(navE && (navE.type === "reload" || navE.type === "back_forward"));
    var mode = !capable || reduced() || memo === "still" ? "still" : touch() || still() ? "offer" : "auto";
    function say(t) { if (state && state.textContent !== t) state.textContent = t; }
    var tight = function () { return innerWidth < 400; }; /* the readout's short forms */
    bar.hidden = false;
    root.classList.add("r3d-js"); /* the opener's wide layout is the pinned one, pinned or not (style.css 9a) */
    /* and in a 700–999px desktop window, the view's pinned size too, but only where it can pin:
       a robot that stays a still keeps the plain layout there (no screen-tall view, no gap). Kept
       once set (a later failure unpins in place, in the same layout). */
    if (mode !== "still") root.classList.add("r3d-pinnable");
    addEventListener("pagehide", function () {
      try { sessionStorage.setItem(KEY, dead && !live ? "still" : mode === "auto" && !root.classList.contains("r3d-pinned") ? "free" : "pin"); } catch (e) { /* fine */ }
    });

    /* Is the page scrolling? (moving: until scrollend, or a quiet moment where there is none;
       jumping: a nav click, a hash, a key or a restored scroll that hasn't landed yet) */
    var moving = false, jumping = false, settleT = 0, pendingPin = null;
    var hasEnd = "onscrollend" in window;
    function wait(ms) { clearTimeout(settleT); settleT = setTimeout(settled, ms); }
    function settled() {
      clearTimeout(settleT);
      moving = false; jumping = false;
      if (pendingPin !== null) { var on = pendingPin; pendingPin = null; setPin(on); }
      if (armed) armed();
      if (repin) repin();
    }
    function jump() { jumping = true; moving = true; wait(hasEnd ? 900 : 450); }
    addEventListener("scroll", function () { moving = true; wait(hasEnd ? 900 : 250); }, { passive: true });
    if (hasEnd) addEventListener("scrollend", settled, { passive: true });
    document.addEventListener("click", function (e) {
      var a = e.target && e.target.closest ? e.target.closest('a[href^="#"]') : null;
      if (a && a.hash.length > 1 && !e.defaultPrevented) jump();
    });
    addEventListener("hashchange", jump);
    addEventListener("keydown", function (e) {
      var t = e.target, k = e.key;
      if (!e.defaultPrevented && /^(End|Home|PageDown|PageUp| )$/.test(k) && !(t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT|BUTTON)$/.test(t.tagName)))) jump();
    });
    if (location.hash.length > 1 || restored) jump(); /* the browser's own scroll to a hash, or back to where you were */

    /* Pin or unpin the opener, keeping what's on screen where it is (the robot if you're on it,
       what follows if you're past it). While the page scrolls this waits for it to stop (now:
       a press that brings the view up itself, or the boot), and it waits too while anything
       after the pinned part is on screen (clear()): that moves by the track's length, and a move
       the scroll makes up for still counts as a layout shift. It happens where you next stop
       with the pinned part filling the screen, or the opener still below it. */
    function setPin(on, now) {
      if (root.classList.contains("r3d-pinned") === on) { pendingPin = null; return; }
      if (!now && (moving || !clear())) { pendingPin = on; return; }
      pendingPin = null;
      /* what to hold still: the pinned part if any of it shows below the bar, else what follows
         the opener (on narrow screens the view itself changes height, so it can't stand in for
         the page under it) */
      var tr = track.getBoundingClientRect(), own = wide() ? head : view, or = own.getBoundingClientRect(), ref = null;
      if (tr.bottom <= 0 || (or.bottom <= hudH() && tr.top < innerHeight)) ref = track.nextElementSibling;
      else if (tr.top < innerHeight) ref = own;
      var y0 = ref ? ref.getBoundingClientRect().top : 0;
      root.classList.toggle("r3d-pinned", on);
      if (ref) { var d = ref.getBoundingClientRect().top - y0; if (M.abs(d) > 0.5) window.scrollBy({ top: d, behavior: "instant" }); }
      if (live) live.refit();
    }
    /* Where the reader is in the act (0..1), kept up to date, so a rotated phone (or a resized
       window) puts them back at the same point: the pinned track is sized in screen heights. */
    var actP = -1, actW = innerWidth;
    function readAct() {
      var els = pinEls();
      if (!els) return (actP = -1);
      var tr = els.track.getBoundingClientRect(), range = tr.height - els.pin.getBoundingClientRect().height;
      var p = range > 40 ? (hudH() - tr.top) / range : -1;
      actP = p > 0 && p < 1 ? p : -1;
    }
    addEventListener("scroll", readAct, { passive: true });
    addEventListener("resize", function () {
      if (innerWidth === actW) return; /* a toolbar showing or hiding: nothing to do */
      actW = innerWidth;
      var p = actP, els = pinEls();
      if (p < 0 || !els) return;
      var tr = els.track.getBoundingClientRect(), range = tr.height - els.pin.getBoundingClientRect().height;
      if (range > 40) window.scrollTo({ top: M.round(scrollY + tr.top - hudH() + p * range), behavior: "instant" });
      actP = p;
    });
    /* what robot3d.js scrubs against: the whole opener on wide screens, the view on narrow ones */
    var PW = { track: track, pin: head }, PN = { track: trackM, pin: pinBox };
    function pinEls() {
      if (!root.classList.contains("r3d-pinned")) return null;
      return wide() ? PW : PN;
    }
    var offscreen = function () { var r = track.getBoundingClientRect(); return r.bottom < 0 || r.top > innerHeight; };
    /* nothing after the pinned part on screen: the results log on wide screens (the whole opener
       is pinned), the caption on narrow ones (the view is) */
    var cap = $("figcaption", fig);
    function clear() { var a = wide() ? track.nextElementSibling : cap; return !a || a.getBoundingClientRect().top >= innerHeight - 1; }

    /* The still's Explode: swap the pictures (each with its own alt text) and the overlays. */
    function stillEx(on) {
      ex = on;
      fig.classList.toggle("is-ex", on);
      asPic.hidden = on; sbox.hidden = on; exPic.hidden = !on; slabs.hidden = !on;
      say(on ? "still · exploded" : "still · 3/4 view");
      fitTags();
    }
    /* On a narrow screen the frame is small but the tags aren't: keep the still's tag and the
       exploded still's callouts inside the view, and the callouts on each side stacked at least
       5 px apart (their leaders bent to follow). The leaders are one path, a segment per callout
       in the callouts' order. */
    var leader = $("svg path", slabs), leaderD = leader ? leader.getAttribute("d") : "";
    function fitTags() {
      var vr = view.getBoundingClientRect();
      if (!vr.width) return;
      var tb = $("b", sbox);
      if (tb && !sbox.hidden) {
        tb.style.marginLeft = "";
        var br = tb.getBoundingClientRect();
        if (br.right > vr.right - 2) tb.style.marginLeft = M.max(vr.left + 2 - br.left, vr.right - 2 - br.right) + "px";
      }
      if (slabs.hidden) return;
      var tags = $$(".r3d-tag", slabs), shift = [];
      tags.forEach(function (t) {
        t.style.marginLeft = ""; t.style.marginTop = "";
        var r = t.getBoundingClientRect(), d = 0;
        if (r.left < vr.left + 2) d = vr.left + 2 - r.left; else if (r.right > vr.right - 2) d = vr.right - 2 - r.right;
        if (d) t.style.marginLeft = d + "px";
      });
      ["l", "r"].forEach(function (side) {
        var col = tags.map(function (t, i) { return { t: t, i: i, r: t.getBoundingClientRect() }; })
          .filter(function (o) { return o.t.classList.contains(side); })
          .sort(function (a, b) { return a.r.top - b.r.top; });
        var floor = -1e9;
        col.forEach(function (o) {
          var dy = M.max(0, M.ceil(floor + 5 - o.r.top));
          if (dy) { o.t.style.marginTop = dy + "px"; shift[o.i] = dy; }
          floor = o.r.bottom + dy;
        });
      });
      if (!leader) return;
      var k = 125 / (slabs.getBoundingClientRect().height || 1); /* the SVG's viewBox is 100 × 125 */
      var segs = leaderD.split("M").filter(Boolean);
      leader.setAttribute("d", segs.map(function (sg, i) {
        if (!shift[i]) return "M" + sg;
        var ends = sg.split("L"), p1 = ends[1].trim().split(/\s+/);
        return "M" + ends[0] + "L" + p1[0] + " " + (parseFloat(p1[1]) + shift[i] * k).toFixed(1);
      }).join(""));
    }
    if (window.ResizeObserver) new ResizeObserver(function () { fitTags(); }).observe(view);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(fitTags); /* the tags' own font changes their size */
    bEx.addEventListener("click", function () {
      if (live) return live.explode();
      var img = $("img", exPic), go = function () { stillEx(!ex); };
      if (!ex && img && !img.complete) { img.loading = "eager"; (img.decode ? img.decode() : Promise.resolve()).then(go, go); }
      else go();
    });
    bReset.addEventListener("click", function () { if (live) live.reset(); });
    bMotion.addEventListener("click", function () { var hb = $(".hud [data-motion]"); if (hb) hb.click(); });

    /* Load: the model (with honest progress) and the code, side by side. */
    var hooks = {
      small: innerWidth < 700,
      still: still,
      status: say,
      exploded: function (on) { ex = on; fig.classList.toggle("is-ex", on); },
      fail: function () { live = null; fallback(); },
      pinEls: pinEls,
      gl: function () { var p = probe; probe = null; return p; },
      keepOut: function () { return wide() && title ? [title] : []; },
    };
    var importer = function (u) { return (new Function("u", "return import(u)"))(u); }; /* kept out of the parser's way in old browsers */
    /* A WebGL 2 context that a real GPU draws: a software renderer such as SwiftShader, WARP or
       llvmpipe stalls the page for seconds and then draws a frame every few hundred ms; the still
       is better there. failIfMajorPerformanceCaveat refuses most of them, and the renderer's own
       name the rest (some browsers hand out SwiftShader without the caveat). Kept, and handed to
       three.js. */
    var SOFT = /swiftshader|llvmpipe|softpipe|lavapipe|basic render|microsoft warp|\bwarp\b|software/i;
    function glOk() {
      if (probe) return true;
      try {
        var c = document.createElement("canvas");
        var g = c.getContext("webgl2", { alpha: true, antialias: (window.devicePixelRatio || 1) < 1.5, depth: true, stencil: false,
          premultipliedAlpha: true, preserveDrawingBuffer: false, powerPreference: "default", failIfMajorPerformanceCaveat: !force });
        if (!g || g.isContextLost()) return false;
        if (!force) {
          var name = String(g.getParameter(g.RENDERER) || "");
          if (!SOFT.test(name)) { /* (where RENDERER is masked, the debug extension still names it) */
            var dbg = /webkit webgl|^$/i.test(name) ? g.getExtension("WEBGL_debug_renderer_info") : null;
            if (dbg) name = String(g.getParameter(dbg.UNMASKED_RENDERER_WEBGL) || "");
          }
          if (SOFT.test(name)) { var l = g.getExtension("WEBGL_lose_context"); if (l) l.loseContext(); return false; }
        }
        probe = { canvas: c, gl: g };
        return true;
      } catch (e) { return false; }
    }
    function dropProbe() {
      if (!probe) return;
      var l = probe.gl.getExtension("WEBGL_lose_context");
      if (l && !probe.gl.isContextLost()) l.loseContext();
      probe = null;
    }
    var PRE = ["robot3d.js", "assets/vendor/three/build/three.module.min.js", "assets/vendor/three/examples/jsm/loaders/GLTFLoader.js",
      "assets/vendor/three/examples/jsm/libs/meshopt_decoder.module.js", "assets/vendor/three/examples/jsm/utils/BufferGeometryUtils.js"];
    function load() {
      if (busy || live || dead) return;
      if (!glOk()) { if (window.console && console.info) console.info("3D robot unavailable (no hardware WebGL 2): showing the still."); return fallback(); }
      busy = true;
      bLoad.hidden = true;
      /* the code's whole import chain, fetched side by side rather than one step at a time */
      PRE.forEach(function (h) { var l = document.createElement("link"); l.rel = "modulepreload"; l.href = h; document.head.appendChild(l); });
      var url = fig.getAttribute("data-glb"), total = +fig.getAttribute("data-bytes") || 0;
      var mb = function (b) { return (b / 1e6).toFixed(1); };
      var acq = tight() ? "model · " : "acquiring model · ";
      say(acq + "0.0 / " + mb(total) + " MB");
      var model = fetch(url, { priority: "high" }).then(function (r) {
        if (!r.ok) throw new Error("model " + r.status);
        var len = +r.headers.get("content-length");
        if (len && !r.headers.get("content-encoding")) total = len;
        if (!r.body || !r.body.getReader) return r.arrayBuffer();
        var rd = r.body.getReader(), parts = [], got = 0;
        return (function pump() {
          return rd.read().then(function (x) {
            if (x.done) {
              var out = new Uint8Array(got), at = 0;
              parts.forEach(function (p) { out.set(p, at); at += p.length; });
              return out.buffer;
            }
            parts.push(x.value); got += x.value.length;
            if (!dead) say(acq + mb(got) + " / " + mb(total) + " MB");
            return pump();
          });
        })();
      });
      Promise.all([importer("./robot3d.js"), model]).then(function (r) {
        if (dead) throw new Error("stopped");
        say("building the scene");
        hooks.eager = eager;
        return r[0].start(fig, r[1], hooks);
      }).then(function (ctrl) {
        busy = false;
        if (dead) return ctrl.teardown();
        /* reduced motion turned on while it loaded: keep the still */
        if (reduced()) { ctrl.teardown(); mode = "still"; dead = true; root.classList.add("r3d-off"); setPin(false); bLoad.hidden = true; stillEx(ex); return; }
        live = ctrl;
        stillEx(ex); /* under the live view: the still you were looking at (its alt text describes the robot) */
        fig.classList.add("is-live");
        view.tabIndex = 0;
        view.setAttribute("role", "group");
        view.setAttribute("aria-label", "The 1698V robot in 3D: drag it, or use the left and right arrow keys, to turn it");
        bReset.hidden = false;
        bMotion.hidden = reduced();
        /* Pause motion pressed while it loaded: it rests, unpinned */
        var s = still();
        live.freeze(s);
        if (s) setPin(false);
        else if (late) repinLater();
      }).catch(function (e) {
        if (window.console && console.info && !(e && e.message === "stopped")) console.info("3D robot unavailable (" + (e && e.message) + "): showing the still.");
        fallback();
      });
    }
    function fallback() {
      busy = false; dead = true;
      root.classList.add("r3d-off"); /* the Honors teaser now says "See it up close" */
      dropProbe();
      var hadFocus = document.activeElement === view;
      if (live) { live.teardown(); live = null; }
      fig.classList.remove("is-live", "is-swept");
      ["--live", "--still", "--cut"].forEach(function (p) { fig.style.removeProperty(p); });
      view.removeAttribute("tabindex"); view.removeAttribute("role"); view.removeAttribute("aria-label");
      bLoad.hidden = true; bReset.hidden = true; bMotion.hidden = true;
      setPin(false);
      stillEx(ex);
      say(tight() ? "still · no 3D here" : "still · 3D unavailable here");
      if (hadFocus) bEx.focus(); /* a keyboard user keeps their place */
    }
    /* AUTO: pin, and load once the opener is within ~1.5 screens. (A plain position check on
       scroll: an IntersectionObserver's rootMargin gets clipped short here.) While it loads, a
       reader who has stopped well into the pinned scroll, with the opener on screen, gets the
       page back: unpinned in place. A jump that is only passing doesn't start the load: it is
       looked at again where the jump lands. */
    function arm(pin) {
      if (pin !== false) setPin(true);
      if (armed) return;
      armed = function () {
        var r = track.getBoundingClientRect(), vh = innerHeight;
        var els = pinEls();
        if (busy && !live && els) {
          if (moving) return; /* settled() asks again once the scroll stops */
          var tr = els.track.getBoundingClientRect(), range = tr.height - els.pin.getBoundingClientRect().height;
          if (range > 40 && (hudH() - tr.top) / range > 0.18 && clear()) { late = true; setPin(false); }
          return;
        }
        if (busy || live || dead) return disarm();
        if (jumping || r.top > 2.5 * vh || r.bottom < -1.5 * vh) return;
        if (still()) { disarm(); return offer(); }
        load();
      };
      addEventListener("scroll", armed, { passive: true });
      addEventListener("resize", armed);
      armed();
    }
    function disarm() {
      if (!armed) return;
      removeEventListener("scroll", armed); removeEventListener("resize", armed);
      armed = null;
    }
    var hudH = function () { return parseFloat(getComputedStyle(root).getPropertyValue("--hud")) || 52; };
    /* pin again (it arrived late) once the opener is off screen and the scroll has stopped, so
       nothing visible moves */
    var repin = null;
    function repinLater() {
      late = false;
      dropRepin();
      repin = function () {
        if (dead || mode !== "auto" || still()) return dropRepin();
        if (!moving && offscreen()) { dropRepin(); setPin(true); }
      };
      addEventListener("scroll", repin, { passive: true });
      repin();
    }
    function dropRepin() { if (repin) { removeEventListener("scroll", repin); repin = null; } }
    function offer() {
      mode = "offer";
      disarm();
      if (!busy && !live) setPin(false);
      bLoad.hidden = !!(busy || live);
    }
    bLoad.addEventListener("click", function () {
      var hadFocus = document.activeElement === bLoad;
      eager = true;
      /* pin now, while it's your click (so nothing counts as a layout shift), and bring the view up */
      if (!still()) {
        setPin(true, true);
        if (!wide()) {
          var t = trackM.getBoundingClientRect().top - hudH();
          if (M.abs(t) > 2) window.scrollBy({ top: t, behavior: "smooth" });
        }
      }
      load();
      if (hadFocus) view.tabIndex = -1, view.focus({ preventScroll: true });
    });
    onMotion.push(function () {
      var s = still();
      if (live) { live.freeze(s); dropRepin(); setPin(!s); bMotion.hidden = reduced(); return; }
      if (dead || !capable) return;
      if (reduced()) { disarm(); setPin(false); bLoad.hidden = true; return; }
      if (s && mode === "auto") offer();
      else if (!s && mode === "offer" && !touch() && !busy) { mode = "auto"; bLoad.hidden = true; arm(); }
    });

    if (mode === "auto") {
      /* back on a page that was left unpinned: the browser restores the scroll into that layout
         (whenever it gets to it), so it stays unpinned, as if the 3D had arrived late: it pins
         again once the 3D is in and the opener off screen */
      if (restored && memo === "free") { late = true; arm(false); }
      else { setPin(true, true); arm(false); } /* now, before the browser scrolls to a hash */
    } else if (mode === "offer") bLoad.hidden = false;
  })();
})();
