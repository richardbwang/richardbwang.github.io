/* ==========================================================================
   richardbwang.github.io — feed.js. Decoration only; the page reads the same without it.

   The hero is stage 00 of the perception stack: a raw camera feed looking at a name.
   1. Features: the name's letters are drawn into an offscreen canvas (same font, same
      positions as the real text, read back from the DOM), and a Shi–Tomasi corner detector
      finds "good features to track" on them. The same detector marks the one boxed chapter
      title (02 Detection, Honors) and the name reprised in the footer. stages.js borrows it too
      (window.rbwFeat).
   2. The floor (the hero's resting signature): behind the name, what the robot's camera sees
      of a VEX field, as a sparse depth image: fixed rows of depth samples (like a depth
      sensor's scan rows) and the 24-inch tile seams as dotted lines in perspective, all tinted
      by distance on the inferno ramp (near = amber, far = violet); the seams drift toward the
      camera as it rolls forward; a few tile corners are tracked, with their optical flow.
      Slow (a tile every ~2.4 s), drawn at most 30 times a second, paused with "Pause motion" and
      off screen; reduced motion gets one still frame.
   3. The knock: the camera's pose (shift, roll, scale) is a damped spring. It plays once, when
      the name's typeface lands (the name itself painted at t=0 in a metric-matched stand-in).
      Grab the name and fling it, or click (tap on a phone) for another knock. The outline
      (.name-ghost) is the raw, misaligned view; the bias correction pulls it back while flow
      lines join each feature to where it belongs (the ICCAS 2025 paper). Once the pose is
      LOCKED the feature rings clear from the name; a resting mouse lights only the ones near it.
   4. The loops run only while something moves, the hero is on screen and the tab is visible.
      The corner detection waits until after first paint (and finds fewer features on phones).
   ========================================================================== */
(function () {
  "use strict";

  var M = Math, root = document.documentElement;
  /* Without site.js (it failed to load) there's no Motion button to pause with, so hold still. */
  var still = function () { return window.rbw ? window.rbw.still() : true; };
  var fine =!!(window.matchMedia && matchMedia("(hover: hover) and (pointer: fine)").matches);
  var idle = window.requestIdleCallback ? function (f) { requestIdleCallback(f, { timeout: 500 }); } : function (f) { setTimeout(f, 60); };
  var STRETCH = { "50%": "ultra-condensed", "62.5%": "extra-condensed", "75%": "condensed", "87.5%": "semi-condensed", "100%": "normal", "112.5%": "semi-expanded", "125%": "expanded" };

  /* ---------- 1. Features ----------
     glyphs(): draws the text of each element in `lines` into `g` (scaled by s, relative to `host`,
     shifted by ox/oy). Every character is placed where the browser put it (a Range per
     character), so kerning, letter-spacing, word-spacing and wrapping all match. With no `g` it
     only measures (returns the text's box in host px). */
  function glyphs(g, lines, host, s, ox, oy) {
    var hr = host.getBoundingClientRect(), range = document.createRange(), cap = 0, box = null;
    ox = ox || 0; oy = oy || 0;
    lines.forEach(function (el) {
      var node = el.firstChild, cs = getComputedStyle(el), size = parseFloat(cs.fontSize);
      if (!node || node.nodeType !== 3) return;
      /* The baseline: the bottom of an empty inline-block sits on it. */
      var probe = document.createElement("i");
      probe.style.cssText = "display:inline-block;width:0;height:0;vertical-align:baseline";
      el.insertBefore(probe, node.nextSibling);
      var base = probe.getBoundingClientRect().bottom - hr.top;
      el.removeChild(probe);
      var mg = g || measureCtx();
      mg.font = cs.fontWeight + " " + size * s + "px " + cs.fontFamily;
      if ("fontStretch" in mg) mg.fontStretch = STRETCH[cs.fontStretch] || "normal";
      cap = mg.measureText("H").actualBoundingBoxAscent / s || size * 0.7;
      var text = node.data, up = cs.textTransform === "uppercase";
      for (var i = 0; i < text.length; i++) {
        var ch = up ? text[i].toUpperCase() : text[i];
        if (ch === " ") continue;
        range.setStart(node, i); range.setEnd(node, i + 1);
        var r = range.getBoundingClientRect(), x = r.left - hr.left;
        if (g) {
          var w = g.measureText(ch).width;
          /* A browser whose canvas ignores fontStretch draws wider glyphs: squeeze them to fit. */
          var sx = w > 0 && M.abs(r.width * s / w - 1) > 0.05 ? r.width * s / w : 1;
          g.save(); g.translate((x - ox) * s, (base - oy) * s); g.scale(sx, 1); g.fillText(ch, 0, 0); g.restore();
        }
        var b = { x0: x, x1: x + r.width, y0: base - cap, y1: base };
        box = box ? { x0: M.min(box.x0, b.x0), x1: M.max(box.x1, b.x1), y0: M.min(box.y0, b.y0), y1: M.max(box.y1, b.y1) } : b;
      }
    });
    return box;
  }
  var mctx = null;
  function measureCtx() { if (!mctx) mctx = document.createElement("canvas").getContext("2d"); return mctx; }

  /* Shi–Tomasi: the smaller eigenvalue of the local structure tensor, 5×5 window, then
     non-maximum suppression and a minimum spacing. Returns up to n points (in host px).
     The image is only the text's own box (plus a margin), not the whole host. */
  function corners(lines, host, s, n, spacing) {
    var tb = glyphs(null, lines, host, 1);
    if (!tb) return { pts: [], box: null };
    var pad = 8, ox = tb.x0 - pad, oy = tb.y0 - pad;
    var w = M.ceil((tb.x1 - tb.x0 + 2 * pad) * s) + 4, h = M.ceil((tb.y1 - tb.y0 + 2 * pad) * s) + 4;
    var c = document.createElement("canvas"); c.width = w; c.height = h;
    var g = c.getContext("2d", { willReadFrequently: true });
    g.fillStyle = "#000";
    var box = glyphs(g, lines, host, s, ox, oy);
    if (!box) return { pts: [], box: null };
    var a = g.getImageData(0, 0, w, h).data, N = w * h, I = new Float32Array(N), i, x, y;
    for (i = 0; i < N; i++) I[i] = a[i * 4 + 3] / 255;
    var xx = new Float32Array(N), yy = new Float32Array(N), xy = new Float32Array(N);
    for (y = 1; y < h - 1; y++) for (x = 1; x < w - 1; x++) {
      i = y * w + x;
      var gx = I[i - w + 1] + 2 * I[i + 1] + I[i + w + 1] - I[i - w - 1] - 2 * I[i - 1] - I[i + w - 1];
      var gy = I[i + w - 1] + 2 * I[i + w] + I[i + w + 1] - I[i - w - 1] - 2 * I[i - w] - I[i - w + 1];
      xx[i] = gx * gx; yy[i] = gy * gy; xy[i] = gx * gy;
    }
    [xx, yy, xy].forEach(function (A) { blur(A, w, h, 2); });
    var R = new Float32Array(N), top = 0;
    for (i = 0; i < N; i++) {
      var p = (xx[i] + yy[i]) / 2, q = (xx[i] - yy[i]) / 2;
      R[i] = p - M.sqrt(q * q + xy[i] * xy[i]);
      if (R[i] > top) top = R[i];
    }
    var cand = [];
    for (y = 3; y < h - 3; y++) for (x = 3; x < w - 3; x++) {
      i = y * w + x;
      var v = R[i];
      if (v < top * 0.12) continue;
      var best = true;
      for (var dy = -3; dy <= 3 && best; dy++) for (var dx = -3; dx <= 3; dx++) if (R[i + dy * w + dx] > v) { best = false; break; }
      if (best) cand.push([v, x / s + ox, y / s + oy]);
    }
    cand.sort(function (A, B) { return B[0] - A[0]; });
    var pts = [], d2 = spacing * spacing;
    for (i = 0; i < cand.length && pts.length < n; i++) {
      var ok = true;
      for (var j = 0; j < pts.length; j++) { var ex = pts[j].x - cand[i][1], ey = pts[j].y - cand[i][2]; if (ex * ex + ey * ey < d2) { ok = false; break; } }
      if (ok) pts.push({ x: cand[i][1], y: cand[i][2] });
    }
    return { pts: pts, box: box };
  }
  /* In-place box blur (radius r), horizontal then vertical. */
  function blur(A, w, h, r) {
    var T = new Float32Array(A.length), x, y, k, s;
    for (y = 0; y < h; y++) for (x = 0; x < w; x++) {
      s = 0; for (k = -r; k <= r; k++) s += A[y * w + M.min(w - 1, M.max(0, x + k))];
      T[y * w + x] = s;
    }
    for (y = 0; y < h; y++) for (x = 0; x < w; x++) {
      s = 0; for (k = -r; k <= r; k++) s += T[M.min(h - 1, M.max(0, y + k)) * w + x];
      A[y * w + x] = s;
    }
  }

  /* Fonts first: features found on the stand-in font would sit in the wrong places. The Google
     stylesheet arrives asynchronously, so wait until an 800-weight Archivo face has actually
     loaded (or give up after 2.5 s and use whatever is there; a later font swap re-runs it). */
  function archivoLoaded() {
    var ok = false;
    if (document.fonts && document.fonts.forEach) document.fonts.forEach(function (f) {
      if (f.family.replace(/["']/g, "") === "Archivo" && f.status === "loaded" && /800/.test(f.weight)) ok = true;
    });
    return ok;
  }
  var fontsReady = new Promise(function (resolve) {
    var t0 = Date.now();
    if (!document.fonts) return resolve();
    (function poll() {
      if (archivoLoaded() || Date.now() - t0 > 2500) resolve();
      else setTimeout(poll, 30);
    })();
  });
  var onFonts = [];
  if (document.fonts && document.fonts.addEventListener) document.fonts.addEventListener("loadingdone", function () {
    onFonts.forEach(function (f) { f(); });
  });
  window.rbwFeat = { glyphs: glyphs, corners: corners, fontsReady: fontsReady, onFonts: onFonts, archivoLoaded: archivoLoaded };

  /* ---------- Feature points on marked words (static SVG, computed once each) ----------
     [data-feat]: the 02 title (Honors) and the footer reprise. --o is a shuffled order, used when the
     reprise loses its features one by one. */
  var marked = [].slice.call(document.querySelectorAll("[data-feat]"));
  function markTitle(el) {
    var old = el.querySelector(".feat");
    if (old) old.remove();
    var r = el.getBoundingClientRect(), f = corners([el], el, 0.5, M.round(14 + el.firstChild.data.length * 4), M.max(8, r.height * 0.07));
    var order = f.pts.map(function (p, i) { return i; }).sort(function () { return M.random() - 0.5; });
    var svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("class", "feat"); svg.setAttribute("aria-hidden", "true");
    svg.setAttribute("width", r.width); svg.setAttribute("height", r.height);
    svg.innerHTML = f.pts.map(function (p, i) {
      return '<circle cx="' + p.x.toFixed(1) + '" cy="' + p.y.toFixed(1) + '" r="' + (r.height < 120 ? 2.4 : 3) + '" style="--d:' + (i * 0.018).toFixed(3) + "s;--o:" + order[i] + '"/>';
    }).join("");
    el.appendChild(svg);
    el._marked = true;
  }
  if (marked.length && "IntersectionObserver" in window) fontsReady.then(function () {
    var near = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { near.unobserve(e.target); idle(function () { markTitle(e.target); }); } });
    }, { rootMargin: "300px 0px" });
    marked.forEach(function (t) { near.observe(t); });
    onFonts.push(function () { marked.forEach(function (t) { if (t._marked) markTitle(t); }); });
    var rt = 0, lastW = innerWidth;
    addEventListener("resize", function () {
      if (innerWidth === lastW) return; /* phones fire resize when the URL bar slides */
      lastW = innerWidth; clearTimeout(rt);
      rt = setTimeout(function () { marked.forEach(function (t) { if (t._marked) markTitle(t); }); }, 250);
    });
  });

  /* ---------- 2. The hero ---------- */
  var hero = document.querySelector(".hero"), wrap = hero && hero.querySelector("[data-feed]");
  var name = wrap && wrap.querySelector(".name"), ghost = wrap && wrap.querySelector(".name-ghost");
  var cv = document.createElement("canvas"), ctx = cv.getContext && cv.getContext("2d");
  if (!hero || !name || !ghost || !ctx) return;
  cv.className = "feed-cv";
  cv.setAttribute("aria-hidden", "true");
  hero.appendChild(cv);
  if (fine) wrap.classList.add("grab");

  var out = {};
  ["status", "roll", "shift", "bias"].forEach(function (k) { out[k] = hero.querySelector("[data-" + k + "]"); });

  var W, H, dpr, feats = [], O = { x: 0, y: 0 }, ready = false;
  var P = { x: 0, y: 0, r: 0, s: 1 }, V = { x: 0, y: 0, r: 0, s: 0 };
  var raf = 0, last = 0, born = 0, onScreen = true, ptr = null, lastMove = 0, readT = 0, lastScroll = scrollY;
  var drag = null, downType = "mouse";
  var status = "Locked", lowSince = 0, lockedAt = 0; /* the status readout, with hysteresis (see readouts) */
  var rings = 0; /* how visible the feature rings on the name are: 1 while knocked, fading to 0 once locked */
  var col = { sig: "#d4ff3a", paper: "#f1efe8", ink: "#0a0a0b", muted: "#a4a29a" };
  var NEAR = 120; /* px: the reticle lights up features this close */

  function layout() {
    var hr = hero.getBoundingClientRect();
    W = hr.width; H = hr.height;
    dpr = M.min(window.devicePixelRatio || 1, 2);
    cv.width = M.round(W * dpr); cv.height = M.round(H * dpr);
    cv.style.width = W + "px"; cv.style.height = H + "px";
    var small = W < 700;
    var f = corners([].slice.call(name.querySelectorAll(".l")), hero, small ? 0.6 : 0.5, small ? 34 : 80, small ? 10 : 15);
    feats = f.pts;
    if (f.box) {
      var b = f.box;
      O = { x: (b.x0 + b.x1) / 2, y: (b.y0 + b.y1) / 2 };
      /* The ghost turns about the same point the canvas does. */
      var gr = ghost.getBoundingClientRect();
      ghost.style.transformOrigin = (O.x - (gr.left - hr.left)) + "px " + (O.y - (gr.top - hr.top)) + "px";
    }
    feats.forEach(function (p, i) { p.t = 60 + i * (small ? 9 : 5); }); /* detection order: strongest first */
    ready = true;
  }

  /* Pose -> where a point of the corrected view lands in the raw (knocked) view. */
  function raw(px, py) {
    var c = M.cos(P.r) * P.s, s = M.sin(P.r) * P.s, dx = px - O.x, dy = py - O.y;
    return { x: O.x + c * dx - s * dy + P.x, y: O.y + s * dx + c * dy + P.y };
  }
  function err() { return M.min(1, (M.abs(P.x) + M.abs(P.y)) / 26 + M.abs(P.r) / 0.035 + M.abs(P.s - 1) / 0.03); }

  /* The spring: stiffness k, damping ratio 0.8 (a hard knock wobbles once, gently). */
  function step(dt) {
    var k = 70, c = 2 * 0.8 * M.sqrt(k);
    V.x += (-k * P.x - c * V.x) * dt; V.y += (-k * P.y - c * V.y) * dt;
    V.r += (-k * P.r - c * V.r) * dt; V.s += (-k * (P.s - 1) - c * V.s) * dt;
    P.x += V.x * dt; P.y += V.y * dt; P.r += V.r * dt; P.s += V.s * dt;
    P.x = M.max(-70, M.min(70, P.x)); P.y = M.max(-60, M.min(60, P.y)); P.r = M.max(-0.14, M.min(0.14, P.r));
  }
  function moving() {
    return M.abs(P.x) + M.abs(P.y) > 0.15 || M.abs(P.r) > 0.0004 || M.abs(P.s - 1) > 0.0004 ||
      M.abs(V.x) + M.abs(V.y) > 1 || M.abs(V.r) > 0.002;
  }

  function draw(now) {
    var e = err(), age = now - born, i, p, q;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    if (!ready) return;
    ctx.lineCap = "round";
    var hover = ptr && fine && !drag && !still();

    /* Flow lines: raw feature -> corrected feature. */
    if (e > 0.02) {
      ctx.strokeStyle = col.sig; ctx.globalAlpha = 0.5 * e; ctx.lineWidth = 1;
      ctx.beginPath();
      for (i = 0; i < feats.length; i++) {
        p = feats[i]; if (age < p.t) continue;
        q = raw(p.x, p.y);
        ctx.moveTo(q.x, q.y); ctx.lineTo(p.x, p.y);
      }
      ctx.stroke();
      /* Raw features: small dots on the knocked outline. */
      ctx.globalAlpha = 0.9 * e; ctx.fillStyle = col.sig;
      ctx.beginPath();
      for (i = 0; i < feats.length; i++) { p = feats[i]; if (age < p.t) continue; q = raw(p.x, p.y); ctx.moveTo(q.x + 1.6, q.y); ctx.arc(q.x, q.y, 1.6, 0, 6.2832); }
      ctx.fill();
    }
    /* Corrected features: rings on the real letters; each pops in a little large when found.
       They clear once the pose is locked (rings -> 0). Under a resting mouse, the ones within
       reach of the reticle light up and are joined to it. */
    var near = [];
    if (rings > 0.01 || hover) {
      ctx.strokeStyle = col.sig; ctx.lineWidth = 1.25; ctx.globalAlpha = rings * (hover ? 0.55 : 1);
      ctx.beginPath();
      for (i = 0; i < feats.length; i++) {
        p = feats[i]; if (age < p.t) continue;
        if (hover && M.abs(p.x - ptr.x) < NEAR && M.abs(p.y - ptr.y) < NEAR && M.hypot(p.x - ptr.x, p.y - ptr.y) < NEAR) { near.push(p); continue; }
        var rr = 3.2 + 5 * M.max(0, 1 - (age - p.t) / 220);
        ctx.moveTo(p.x + rr, p.y); ctx.arc(p.x, p.y, rr, 0, 6.2832);
      }
      if (rings > 0.01) ctx.stroke();
    }

    /* The reticle under a mouse pointer, joined to the features near it. */
    if (hover) {
      ctx.globalAlpha = 1; ctx.lineWidth = 1.5;
      ctx.beginPath();
      near.forEach(function (n) { ctx.moveTo(n.x + 5.5, n.y); ctx.arc(n.x, n.y, 5.5, 0, 6.2832); });
      ctx.stroke();
      ctx.globalAlpha = 0.45; ctx.lineWidth = 1;
      ctx.beginPath();
      near.forEach(function (n) { ctx.moveTo(ptr.x, ptr.y); ctx.lineTo(n.x, n.y); });
      ctx.stroke();
      ctx.globalAlpha = 0.95; ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(ptr.x - 22, ptr.y); ctx.lineTo(ptr.x - 7, ptr.y); ctx.moveTo(ptr.x + 7, ptr.y); ctx.lineTo(ptr.x + 22, ptr.y);
      ctx.moveTo(ptr.x, ptr.y - 22); ctx.lineTo(ptr.x, ptr.y - 7); ctx.moveTo(ptr.x, ptr.y + 7); ctx.lineTo(ptr.x, ptr.y + 22);
      ctx.stroke();
      ctx.font = '400 11px "Martian Mono", ui-monospace, monospace';
      var label = near.length + " feat · " + M.round(ptr.x) + "," + M.round(ptr.y), tw = ctx.measureText(label).width;
      ctx.globalAlpha = 1; ctx.fillStyle = col.ink; ctx.fillRect(ptr.x + 9, ptr.y + 9, tw + 10, 18);
      ctx.fillStyle = col.sig; ctx.fillText(label, ptr.x + 14, ptr.y + 22);
    }
    ctx.globalAlpha = 1;

    /* Ghost outline = the raw view. */
    ghost.style.opacity = M.min(1, e * 1.5).toFixed(3);
    ghost.style.transform = "translate(" + P.x.toFixed(2) + "px," + P.y.toFixed(2) + "px) rotate(" + P.r.toFixed(4) + "rad) scale(" + P.s.toFixed(4) + ")";

    if (now - readT > 90) { readT = now; readouts(e, now); }
  }
  /* Readouts. The status has hysteresis so an overshoot can't make it flicker: it reads
     "Calibrating" above 0.08 error, and "Locked" only after 120 ms below 0.03. */
  function readouts(e, now) {
    if (out.roll) out.roll.textContent = (P.r * 57.2958).toFixed(1).replace("-0.0", "0.0") + "°";
    if (out.shift) out.shift.textContent = M.round(M.hypot(P.x, P.y)) + " px";
    var was = status;
    if (e > 0.08 || drag) { status = "Calibrating"; lowSince = 0; }
    else if (e < 0.03) { if (!lowSince) lowSince = now; if (now - lowSince >= 120) status = "Locked"; }
    else lowSince = 0;
    if (status === "Locked" && was !== "Locked") lockedAt = now;
    if (out.status && out.status.textContent !== status) out.status.textContent = status;
    if (out.bias) out.bias.textContent = status === "Locked" ? "corrected" : "correcting";
    hero.classList.toggle("knocked", status !== "Locked");
  }

  /* ---------- 3. The loop ---------- */
  function frame(now) {
    raf = 0;
    var dt = last ? M.min(0.034, (now - last) / 1000) : 1 / 60;
    last = now;
    if (!drag) step(dt);
    /* rings: on while knocked; 400 ms after the lock they fade out over 0.6 s */
    if (status !== "Locked" || drag) rings = 1;
    else if (now - lockedAt > 400) rings = M.max(0, rings - dt / 0.6);
    draw(now);
    var appearing = feats.length && now - born < feats[feats.length - 1].t + 260;
    var hovering = ptr && fine && now - lastMove < 150; /* a resting mouse lets the loop sleep */
    if (drag || moving() || appearing || hovering || status !== "Locked" || rings > 0) raf = requestAnimationFrame(frame);
    else { last = 0; if (!moving()) { P.x = P.y = P.r = 0; P.s = 1; V.x = V.y = V.r = V.s = 0; } draw(now); }
  }
  function kick() {
    if (!raf && onScreen && !document.hidden && !still() && ready) { last = 0; raf = requestAnimationFrame(frame); }
  }
  function settle() { /* still frame: locked, the name clean */
    if (raf) cancelAnimationFrame(raf), raf = 0;
    P.x = P.y = P.r = 0; P.s = 1; V.x = V.y = V.r = V.s = 0; ptr = null; drag = null;
    hero.classList.remove("grabbing");
    born = -1e9; status = "Locked"; rings = 0;
    draw(performance.now());
    readouts(0, performance.now());
  }
  function knock() { /* a sharp, random knock: click or tap */
    var sgn = function () { return M.random() < 0.5 ? -1 : 1; };
    V.x += sgn() * (260 + M.random() * 200); V.y += sgn() * (160 + M.random() * 160);
    V.r += sgn() * (0.5 + M.random() * 0.5); V.s += 0.25;
    rings = 1; status = "Calibrating";
    kick();
  }
  function local(e) { var r = hero.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; }
  function ignore(e) { return still() || !ready || (e.target.closest && e.target.closest("a, button, input, .hero-info")); }

  /* Hover: the reticle only. */
  hero.addEventListener("pointermove", function (e) {
    if (e.pointerType === "touch" || still()) return;
    var q = local(e);
    ptr = q; lastMove = performance.now();
    if (drag) {
      /* Grabbed: the camera follows the hand with a rubber-band resistance, and turns with the
         torque of the drag about the name's centre. Velocity is kept for the fling. */
      var dx = e.clientX - drag.cx, dy = e.clientY - drag.cy, now = performance.now();
      drag.moved = M.max(drag.moved, M.hypot(dx, dy));
      var rub = function (d, lim) { return (d < 0 ? -1 : 1) * lim * (1 - M.exp(-M.abs(d) / (lim * 1.5))); };
      var px = P.x, py = P.y, pr = P.r;
      P.x = drag.px + rub(dx, 64); P.y = drag.py + rub(dy, 54);
      P.r = drag.pr + rub(((drag.x - O.x) * dy - (drag.y - O.y) * dx) * 0.0000075, 0.13);
      var dt = M.max(0.008, (now - drag.t) / 1000); drag.t = now;
      drag.vx = drag.vx * 0.5 + 0.5 * (P.x - px) / dt; drag.vy = drag.vy * 0.5 + 0.5 * (P.y - py) / dt; drag.vr = drag.vr * 0.5 + 0.5 * (P.r - pr) / dt;
    }
    kick();
  });
  hero.addEventListener("pointerleave", function () { if (!drag) { ptr = null; kick(); if (ready) draw(performance.now()); } });
  /* Grab and fling (mouse or pen), or click for a sharp knock. */
  hero.addEventListener("pointerdown", function (e) {
    downType = e.pointerType;
    if (e.pointerType === "touch" || e.button !== 0 || ignore(e)) return;
    var q = local(e);
    drag = { cx: e.clientX, cy: e.clientY, x: q.x, y: q.y, px: P.x, py: P.y, pr: P.r, t: performance.now(), vx: 0, vy: 0, vr: 0, moved: 0, id: e.pointerId };
    V.x = V.y = V.r = V.s = 0; rings = 1;
    try { hero.setPointerCapture(e.pointerId); } catch (err) {}
    hero.classList.add("grabbing");
    e.preventDefault(); /* no text selection while grabbing */
    kick();
  });
  function release(e) {
    if (!drag || (e && e.pointerId !== drag.id)) return;
    var d = drag; drag = null;
    hero.classList.remove("grabbing");
    if (d.moved < 5) { P.x = d.px; P.y = d.py; P.r = d.pr; knock(); return; }
    V.x = M.max(-900, M.min(900, d.vx)); V.y = M.max(-900, M.min(900, d.vy)); V.r = M.max(-3, M.min(3, d.vr));
    kick();
  }
  hero.addEventListener("pointerup", release);
  hero.addEventListener("pointercancel", release);
  /* Touch: a tap knocks (a click, so a scroll never does). */
  hero.addEventListener("click", function (e) {
    if (downType !== "touch" || ignore(e)) return;
    knock();
  });
  /* Scrolling drags the camera a little (the outline only; the name's rings stay clear). */
  addEventListener("scroll", function () {
    var d = scrollY - lastScroll; lastScroll = scrollY;
    if (!onScreen || still() || !ready || drag) return;
    V.y -= M.max(-80, M.min(80, d)) * 4.5;
    V.r += M.max(-80, M.min(80, d)) * 0.002;
    kick();
  }, { passive: true });

  if ("IntersectionObserver" in window) new IntersectionObserver(function (es) {
    onScreen = es[es.length - 1].isIntersecting;
    if (onScreen) { kick(); floor.go(); } else { if (raf) { cancelAnimationFrame(raf); raf = 0; } floor.stop(); }
  }).observe(hero);
  document.addEventListener("visibilitychange", function () {
    if (document.hidden) { if (raf) { cancelAnimationFrame(raf); raf = 0; } floor.stop(); } else { kick(); floor.go(); }
  });
  document.addEventListener("rbw:motion", function () {
    if (still()) { settle(); floor.stop(); } else { kick(); floor.go(); }
  });

  /* Rebuild after a resize (width changes only: a phone's URL bar doesn't count). */
  var lastW = 0, queued = 0;
  function relayout() {
    if (queued) return;
    queued = requestAnimationFrame(function () {
      queued = 0;
      if (M.abs(hero.getBoundingClientRect().width - lastW) < 1 && cv.width) { H = hero.getBoundingClientRect().height; cv.height = M.round(H * dpr); cv.style.height = H + "px"; draw(performance.now()); floor.layout(); return; }
      lastW = hero.getBoundingClientRect().width;
      layout(); floor.layout();
      if (still() || !born) settle(); else draw(performance.now());
    });
  }

  /* ---------- 4. The floor: a sparse depth view of the field ----------
     Camera model: a pinhole camera 16 in above the floor (CAMH), looking level, focal length f px,
     the horizon at y = yh. A floor point X in right, Z in ahead lands at (cx + f·X/Z, yh + f·16/Z).
     Three layers:
     - the depth samples: fixed scan rows (Z geometric from 26 to 700 in: ZN to ZF), a sample
       every ~10 px, tinted by distance on the inferno ramp; drawn once into a static layer.
     - the field's 24-inch tile seams in world coordinates: the camera rolls forward at 10 in/s
       (SPEED) and sways a little, so the seams drift toward it. Each frame they are stroked as dotted
       lines (a round-capped dash) with one vertical gradient for the depth tint: two strokes a
       frame, whatever the size of the screen.
     - a few tracked tile corners: a ring, and the optical flow of the last 0.4 s. */
  var floor = (function () {
    var fc = document.createElement("canvas"), g = fc.getContext("2d");
    var api = { go: function () {}, stop: function () {}, layout: function () {} };
    if (!g) return api;
    fc.className = "hero-field"; fc.setAttribute("aria-hidden", "true");
    hero.insertBefore(fc, hero.firstChild);
    var base = document.createElement("canvas"), bg = base.getContext("2d");
    var CAMH = 16, TILE = 24, SPEED = 10, ZN = 26, ZF = 700;
    var fW = 0, fH = 0, fd = 1, yh = 0, cx = 0, f = 1, grad = null, rafF = 0, lastF = 0, t = 0, built = false;
    /* inferno, reversed: near amber -> red -> maroon -> violet far */
    var RAMP = [[252, 165, 10], [221, 81, 58], [147, 38, 103], [66, 10, 104]];
    function ramp(u) {
      u = M.max(0, M.min(1, u)) * (RAMP.length - 1);
      var i = M.min(RAMP.length - 2, M.floor(u)), k = u - i, a = RAMP[i], b = RAMP[i + 1];
      return [M.round(a[0] + (b[0] - a[0]) * k), M.round(a[1] + (b[1] - a[1]) * k), M.round(a[2] + (b[2] - a[2]) * k)];
    }
    function depthAt(y) { return f * CAMH / M.max(0.5, y - yh); }
    function uOf(Z) { return M.log(M.max(ZN, Z) / ZN) / M.log(ZF / ZN); }
    function rgba(c, a) { return "rgba(" + c[0] + "," + c[1] + "," + c[2] + "," + a.toFixed(3) + ")"; }
    function build() {
      var hr = hero.getBoundingClientRect(), info = hero.querySelector(".hero-info"), bar = hero.querySelector(".feed-bar");
      if (!info || !bar) return false;
      var top = bar.getBoundingClientRect().bottom - hr.top, bot = info.getBoundingClientRect().top - hr.top - 2;
      if (bot - top < 80) return false;
      var small = hr.width < 700;
      yh = top + (bot - top) * (small ? 0.14 : 0.2);   /* the horizon, just under the feed bar */
      fW = hr.width; fH = bot;                         /* the canvas covers the hero down to the info row */
      fd = M.min(window.devicePixelRatio || 1, 1.5);
      fc.width = M.round(fW * fd); fc.height = M.round(fH * fd);
      fc.style.width = fW + "px"; fc.style.height = fH + "px";
      base.width = fc.width; base.height = fc.height;
      cx = fW * (small ? 0.62 : 0.6);
      f = ZN * (fH - yh) / CAMH;                       /* so the nearest row sits on the info row */
      /* the depth tint, as one vertical gradient (screen y <-> distance), fading at the horizon
         and just above the info row */
      grad = g.createLinearGradient(0, yh, 0, fH);
      for (var i = 0; i <= 10; i++) {
        var y = yh + (fH - yh) * i / 10, u = uOf(depthAt(y)), c = ramp(u);
        var a = M.min(1, 0.95 - 0.55 * u) * M.min(1, (y - yh) / ((fH - yh) * 0.06)) * (i === 10 ? 0.5 : 1);
        grad.addColorStop(i / 10, rgba(c, a));
      }
      /* the static layer: the depth samples on their scan rows */
      bg.setTransform(fd, 0, 0, fd, 0, 0); bg.clearRect(0, 0, fW, fH);
      var Z = ZN, q = small ? 1.16 : 1.12, sp = small ? 9 : 11, k = 0;
      while (Z < ZF) {
        var yr = yh + f * CAMH / Z, u = uOf(Z), c = ramp(u);
        bg.fillStyle = rgba(c, (0.42 - 0.24 * u) * M.min(1, (fH - yr) / 30 + 0.3));
        for (var x = (k % 2 ? sp / 2 : 0); x <= fW; x += sp) bg.fillRect(x - 0.6, yr - 0.6, 1.2, 1.2);
        Z *= q; k++;
      }
      built = true;
      return true;
    }
    function camX(tt) { return 9 * M.sin(tt * 0.11) + 4 * M.sin(tt * 0.047 + 1); }
    function render() {
      if (!built) return;
      g.setTransform(1, 0, 0, 1, 0, 0);
      g.clearRect(0, 0, fc.width, fc.height);
      g.drawImage(base, 0, 0);
      g.setTransform(fd, 0, 0, fd, 0, 0);
      var zc = t * SPEED, xc = camX(t), i, Zr, y, x0, x1;
      /* tile seams as dotted lines: across (constant Z) and along (constant X, to the vanishing point) */
      g.strokeStyle = grad; g.lineCap = "round"; g.lineWidth = 1.9; g.setLineDash([0, 5]);
      g.beginPath();
      for (i = M.ceil((zc + ZN) / TILE); i * TILE - zc < ZF * 0.6; i++) {
        Zr = i * TILE - zc; y = yh + f * CAMH / Zr;
        g.moveTo(0, y); g.lineTo(fW, y);
      }
      var Xmax = (fW + 40) * ZF / f;
      for (i = M.floor((xc - Xmax) / TILE); i * TILE - xc < Xmax; i++) {
        var Xr = i * TILE - xc;
        x0 = cx + f * Xr / ZF; x1 = cx + f * Xr / ZN;
        g.moveTo(x0, yh + f * CAMH / ZF); g.lineTo(x1, fH);
      }
      g.stroke();
      g.setLineDash([]);
      /* tracked corners: a ring on the tile corner, and its optical flow over the last 0.4 s */
      var j0 = M.floor(zc / TILE), i0 = M.round(xc / TILE);
      g.lineWidth = 1;
      for (var jj = 1; jj <= 6; jj++) for (var ii = -5; ii <= 5; ii++) {
        if ((ii * 7 + jj * 3 + j0 * 5 + 100) % 4) continue; /* a sparse, stable subset of corners */
        var Zw = (j0 + jj) * TILE, Xw = (i0 + ii) * TILE, Zc = Zw - zc, Xc = Xw - xc;
        if (Zc < 28 || Zc > 220) continue;
        var sx = cx + f * Xc / Zc, sy = yh + f * CAMH / Zc;
        if (sx < -10 || sx > fW + 10 || sy > fH - 6) continue;
        var Zp = Zc + SPEED * 0.4, Xp = Xw - camX(t - 0.4);
        var px = cx + f * Xp / Zp, py = yh + f * CAMH / Zp;
        var u = uOf(Zc), c = ramp(u), al = M.min(1, (fH - sy) / 50) * (0.85 - 0.45 * u);
        g.strokeStyle = rgba(c, al * 0.9);
        g.beginPath(); g.moveTo(px, py); g.lineTo(sx, sy); g.stroke();
        g.strokeStyle = "rgba(241,239,232," + (al * 0.75).toFixed(3) + ")";
        g.beginPath(); g.arc(sx, sy, 2.4 + 3 * (1 - u), 0, 6.2832); g.stroke();
      }
    }
    function tickF(now) {
      rafF = 0;
      if (!lastF) lastF = now;
      var dt = (now - lastF) / 1000;
      if (dt >= 1 / 31) { lastF = now; t += M.min(dt, 0.1); render(); }
      if (onScreen && !document.hidden && !still()) rafF = requestAnimationFrame(tickF);
    }
    api.layout = function () { if (build()) { render(); fc.classList.add("on"); } };
    api.go = function () { if (built && !rafF && onScreen && !document.hidden && !still()) { lastF = 0; rafF = requestAnimationFrame(tickF); } };
    api.stop = function () { if (rafF) { cancelAnimationFrame(rafF); rafF = 0; } };
    return api;
  })();

  /* Start, after the first paint: find the features, lay the floor, and (once the typeface has
     landed) play the knock: the camera comes up knocked (shifted, rolled, a touch zoomed) and
     calibrates. */
  fontsReady.then(function () {
    idle(function () {
      lastW = hero.getBoundingClientRect().width;
      layout();
      floor.layout();
      onFonts.push(function () { lastW = 0; relayout(); });
      if (window.ResizeObserver) new ResizeObserver(relayout).observe(hero);
      else addEventListener("resize", relayout);
      if (still()) return settle();
      floor.go();
      born = performance.now();
      P.x = -M.min(48, W * 0.035); P.y = M.min(30, H * 0.03); P.r = -0.055; P.s = 1.045;
      V.x = V.y = V.r = V.s = 0;
      rings = 1; status = "Calibrating";
      if (out.status) out.status.textContent = status;
      kick();
    });
  });
})();
