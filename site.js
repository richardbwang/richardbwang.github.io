/* ==========================================================================
   richardbwang.github.io — site.js
   Everything here enhances a page that already reads and works without it.
    1. State: reduced motion, the "motion" switch (it stops everything that moves)
    2. Reveals (what scrolls into view gets .is-in)
    3. Email link, live star count
    4. Scroll: the perception stack (rail, strip, HUD stage), nav
    5. Clips: lazy, in-view autoplay, play/pause buttons, timecode, auton timers, tracked boxes
    6. Annotation tags: keep each one inside its frame and off its neighbours
    7. False-colour lens on photos
    8. The conditions viewer (papers)
    9. Team videos, copy BibTeX
   10. The clock, and the end of the feed
   11. Chapter titles: measure each word once its typeface is in (--r); a deep link lands again
   The hero art is feed.js; the stages acted out in chapters 01, 03 and 06 are stages.js.
   ========================================================================== */
(function () {
  "use strict";

  var root = document.documentElement;
  var idle = window.requestIdleCallback ? function (f) { requestIdleCallback(f, { timeout: 600 }); } : function (f) { setTimeout(f, 120); };
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  window.rbwSite = true; /* tells the <head> failsafe we're running */

  /* ---------- 1. State ---------- */
  var rm = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)");
  var io = "IntersectionObserver" in window;
  /* rbw.still(): true with reduced motion or after "Pause motion". feed.js and stages.js listen for "rbw:motion". */
  var still = function () { return (rm && rm.matches) || root.classList.contains("still"); };
  window.rbw = { still: still };
  var onMotion = []; /* this file's own reactions to the switch (clips, viewer, clock) */

  /* The button's label ("Pause motion" / "Resume motion") follows html.still in CSS, and its
     accessible name is that visible label, so there is nothing to sync here. It shows only once
     it works (html.motion-ok): if this file never runs, feed.js and stages.js hold still. */
  var motionBtn = $("[data-motion]");
  function setStill(off) {
    root.classList.toggle("still", off);
    if (off) showAll();
    try { sessionStorage.setItem("rbw-still", off ? "1" : "0"); } catch (e) {}
    onMotion.forEach(function (f) { f(); });
    document.dispatchEvent(new CustomEvent("rbw:motion"));
  }
  if (motionBtn && !(rm && rm.matches)) {
    motionBtn.addEventListener("click", function () { setStill(!root.classList.contains("still")); });
    root.classList.add("motion-ok");
  }
  if (rm && rm.addEventListener) rm.addEventListener("change", function () {
    root.classList.toggle("rm", rm.matches);
    if (rm.matches) showAll();
    onMotion.forEach(function (f) { f(); });
    document.dispatchEvent(new CustomEvent("rbw:motion"));
  });

  /* ---------- 2. Reveals ----------
     Only when the <head> script set html.anim (motion allowed). Neighbours that arrive together
     are staggered a little (--d). Keyboard focus never waits for a reveal. */
  var seen = null;
  function showAll() {
    if (seen) seen.disconnect();
    $$("[data-reveal]").forEach(function (el) { el.classList.add("is-in"); });
    root.classList.remove("anim");
  }
  if (root.classList.contains("anim")) {
    if (!io || still()) showAll();
    else {
      var batch = [], flush = 0, waiting = $$("[data-reveal]"), sweepF = 0;
      /* Read a block out, asking for its pictures first: a deep link can read a block out before
         the sweep below has had a chance to ask for them. */
      var reveal = function (el) {
        $$('img[loading="lazy"]', el).forEach(function (img) { if (!img.closest(".r3d")) img.loading = "eager"; });
        el.classList.add("is-in");
      };
      var queue = function (el) {
        if (el._queued) return;
        el._queued = true; seen.unobserve(el); batch.push(el);
        if (!flush) flush = requestAnimationFrame(function () {
          batch.sort(function (a, b) { return a.getBoundingClientRect().top - b.getBoundingClientRect().top; });
          batch.forEach(function (el, i) { el.style.setProperty("--d", Math.min(i, 6) * 0.07 + "s"); reveal(el); });
          batch = []; flush = 0;
        });
      };
      seen = new IntersectionObserver(function (es) {
        es.forEach(function (e) { if (e.isIntersecting) queue(e.target); });
      }, { rootMargin: "0px 0px -7% 0px" });
      waiting.forEach(function (el) { seen.observe(el); });
      /* A lazy picture inside a waiting block is clipped away with it, so the browser's own lazy
         loading only asks for it once the block is read out: the readout would open on an empty
         mat. So the sweep below asks for it instead, about where the browser's lazy loading would
         have: once its frame is within 1200px of the screen. It measures the waiting block's own
         box (getBoundingClientRect ignores clip-path), cut to the picture's: a tall block keeps
         its picture well below its top (RW-Template's screenshot), and a picture taller than its
         frame starts above it (the Dome's). A picture with no box (display: none) is left alone,
         and one whose blocks are all read out is the browser's again. The 3D robot's stills are
         stages.js's business. */
      var early = $$('[data-reveal] img[loading="lazy"]').filter(function (img) { return !img.closest(".r3d"); });
      var ask = function (img) {
        if (img.loading !== "lazy" || !img.closest("[data-reveal]:not(.is-in)")) return true;
        var b = img.closest("[data-reveal]").getBoundingClientRect(), i = img.getBoundingClientRect();
        if (!i.height) return false;
        if (Math.max(b.top, i.top) < innerHeight + 1200 && Math.min(b.bottom, i.bottom) > -1200) { img.loading = "eager"; return true; }
        return false;
      };
      /* The hidden state clips a block down to its top edge (clip-path), and Chrome's observer
         measures that clipped edge: a block whose top is already above the screen (a jump or a
         restored scroll into the middle of a tall one) would never be read out. So on scroll,
         any block still waiting whose own box is on screen is read out too. The same pass asks for
         the pictures above. Stops once all the blocks are in and all the pictures asked for. */
      var sweep = function () {
        sweepF = 0;
        early = early.filter(function (img) { return !ask(img); });
        waiting = waiting.filter(function (el) {
          if (el._queued || el.classList.contains("is-in")) return false;
          var r = el.getBoundingClientRect();
          if (r.bottom > 0 && r.top < innerHeight * 0.93) { queue(el); return false; }
          return true;
        });
        if (!waiting.length && !early.length) { removeEventListener("scroll", onSweep); removeEventListener("resize", onSweep); }
      };
      var onSweep = function () { if (!sweepF) sweepF = requestAnimationFrame(sweep); };
      addEventListener("scroll", onSweep, { passive: true });
      addEventListener("resize", onSweep);
      addEventListener("load", onSweep);
      document.addEventListener("focusin", function (e) {
        var r = e.target.closest && e.target.closest("[data-reveal]");
        var ch = e.target.closest && e.target.closest(".ch");
        if (r) reveal(r);
        if (ch) $$("[data-reveal]", ch).forEach(reveal);
      });
    }
  }

  /* ---------- 3a. Email: the address is only assembled here, never written in the HTML ----------
     It is stored once (data-user + data-domain on the contact link); every [data-mail] link gets it. */
  var mailSrc = $("[data-user][data-domain]");
  if (mailSrc) {
    var mailto = "mailto:" + mailSrc.getAttribute("data-user") + "@" + mailSrc.getAttribute("data-domain");
    $$("a[data-mail]").forEach(function (a) {
      a.href = mailto;
      var t = a.getAttribute("data-mail-label");
      if (t) a.textContent = t;
    });
    /* No-JS hints say "via GitHub". With JS: reword them (data-js-text) or hide them. */
    $$("[data-mail-hint]").forEach(function (el) {
      var t = el.getAttribute("data-js-text");
      if (t) el.textContent = t; else el.hidden = true;
    });
    /* The visible address, for recruiters who'd rather copy it than open a mail app. */
    var address = mailto.slice(7), addrBox = $("[data-mail-addr]");
    if (addrBox && window.Promise) {
      $("[data-mail-text]", addrBox).textContent = address;
      addrBox.hidden = false;
      var copyBtn = $("[data-copy-mail]", addrBox), copyTimer = null;
      if (copyBtn) copyBtn.addEventListener("click", function () {
        var done = function (msg) {
          copyBtn.textContent = msg;
          var live = $("[data-copy-status]");
          if (live) live.textContent = "Email address " + msg + ".";
          clearTimeout(copyTimer);
          copyTimer = setTimeout(function () { copyBtn.textContent = "copy"; }, 1600);
        };
        copyText(address).then(function () { done("copied"); }, function () { done("copy failed"); });
      });
    }
  }

  /* ---------- 3b. Live star count for RW-Template (falls back to the static number) ---------- */
  var starEls = $$("[data-stars]");
  if (starEls.length && window.fetch) {
    var KEY = "rw-template-stars";
    var showStars = function (n) {
      if (typeof n !== "number" || !isFinite(n) || n <= 0) return;
      starEls.forEach(function (el) { el.textContent = n.toLocaleString("en-US"); });
    };
    var cached = null;
    try { cached = sessionStorage.getItem(KEY); } catch (e) {}
    if (cached) showStars(Number(cached));
    else fetch("https://api.github.com/repos/richardbwang/RW-Template")
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (d) {
        if (!d || typeof d.stargazers_count !== "number") return;
        showStars(d.stargazers_count);
        try { sessionStorage.setItem(KEY, String(d.stargazers_count)); } catch (e) {}
      })
      .catch(function () { /* offline or rate-limited: keep the static count */ });
  }

  /* ---------- 4. Scroll: the perception stack, nav ----------
     Every <section id> in <main> is a stage (data-stage / data-short name it). The rail (wide
     screens) and the strip (phones) show the stack: a stage switches on when you reach its
     chapter and stays on; the stage you're furthest into fills as you read it. At the footer
     the whole stack reads complete and the HUD powers down (section 10). */
  var sections = $$("main > section[id]");
  var navLinks = $$(".hud-nav a");
  var stageS = $("[data-stage-s]");
  var stackItems = $$(".rail li, .strip li");
  var lastId = null, ticking = false, pinned = null, reached = 0, ended = false, lastP = -1;

  function setStage(short) { if (stageS) stageS.textContent = short; }
  function paintStack(cur, p) {
    stackItems.forEach(function (li) {
      var i = sections.indexOf(document.getElementById(li.getAttribute("data-for")));
      var done = ended || i < reached || (i === reached && i !== cur);
      li.classList.toggle("done", done);
      li.classList.toggle("on", !ended && i === cur);
      if (!done && i === cur) li.style.setProperty("--p", p.toFixed(3)); else li.style.removeProperty("--p");
    });
  }
  function spy() {
    ticking = false;
    var line = Math.min(innerHeight * 0.4, 320), ci = 0;
    sections.forEach(function (s, i) { if (s.getBoundingClientRect().top <= line) ci = i; });
    if (scrollY > 0 && innerHeight + scrollY >= document.documentElement.scrollHeight - 2) {
      var pin = pinned && document.getElementById(pinned);
      ci = pin && sections.indexOf(pin) !== -1 ? sections.indexOf(pin) : sections.length - 1;
    }
    var cur = sections[ci], r = cur.getBoundingClientRect();
    var p = Math.max(0, Math.min(1, (line - r.top) / Math.max(1, r.height)));
    if (ci > reached) reached = ci;
    if (cur.id !== lastId || Math.abs(p - lastP) > 0.004) { lastP = p; paintStack(ci, p); }
    if (cur.id === lastId) return;
    lastId = cur.id;
    navLinks.forEach(function (a) {
      if (a.getAttribute("href") === "#" + cur.id) a.setAttribute("aria-current", "true");
      else a.removeAttribute("aria-current");
    });
    if (!ended) setStage(cur.getAttribute("data-short") || "");
  }
  navLinks.forEach(function (a) {
    a.addEventListener("click", function () { pinned = a.getAttribute("href").slice(1); lastId = null; requestAnimationFrame(spy); });
  });
  ["wheel", "touchstart", "keydown", "mousedown"].forEach(function (t) { addEventListener(t, function () { pinned = null; }, { passive: true, capture: true }); });
  addEventListener("scroll", function () { if (!ticking) { ticking = true; requestAnimationFrame(spy); } }, { passive: true });
  addEventListener("resize", spy);
  addEventListener("load", spy);
  spy();

  /* ---------- 5. Clips ----------
     Each clip is a muted, looping <video preload="none" controls> over its poster: the version
     without JS. Here the native controls give way to one play/pause button (a click on the clip
     works too). A clip that wants to play starts loading as it nears the screen, and plays only
     while at least 40% of it is in view and the tab is visible. With reduced motion or "Motion
     off", clips wait for their buttons; turning motion back on resumes the ones it paused. */
  /* Offline colour-track of the drone clip, keyed by the clip's data-name. One box per 0.1 s of
     video: "x0,y0,x1,y1" in thousandths of the frame, "-" when the object is out of view. Made by
     colour-tracking the clip offline (red cans, the blue quadcopter), then smoothed. If you replace
     the clip, delete its entry here and the .src-note in index.html. */
  var TRACKS = {
    "drone-2026.mp4": {
      can: "72,0,173,381;72,3,174,388;74,13,176,403;76,25,177,412;71,22,178,423;65,12,179,432;60,1,180,445;" +
      "61,4,180,455;63,10,180,460;64,18,179,469;63,25,178,477;62,29,176,486;60,32,174,488;" +
      "58,34,172,484;54,36,170,486;48,36,166,499;43,38,161,518;36,38,155,527;30,40,148,519;" +
      "21,40,142,521;21,68,134,518;16,99,122,525;11,132,107,540;3,162,90,551;0,194,72,501;0,231,55,484;" +
      "0,251,38,455;0,290,26,514;0,325,18,495;0,356,15,531;0,364,13,536;0,367,12,567;-;-;-;-;-;-;-;-;-;" +
      "-;-;-;-;-;-;-;-;-;0,328,19,544;0,299,22,540;0,264,29,531;0,227,37,518;0,212,44,506;0,199,53,497;" +
      "0,190,62,531;0,179,71,566;0,145,81,597;0,114,90,588;3,86,101,575;3,56,113,564;7,27,122,555;" +
      "19,19,133,545;35,35,140,538;52,49,149,531;62,45,160,523;74,44,170,518;87,40,182,510;" +
      "95,34,190,506;104,29,198,501;110,29,205,497;117,27,211,494;124,25,218,490;131,21,224,488;" +
      "137,19,231,486;142,21,236,486;147,23,242,486;152,27,246,486;155,31,249,488;158,32,251,490;" +
      "160,31,253,490;161,29,255,490;161,31,256,492;161,34,256,494;161,38,255,494;161,40,255,495;" +
      "161,42,254,499;160,44,253,503;158,30,252,505;156,31,251,506;155,31,249,508;153,31,248,508;" +
      "149,16,247,506;146,18,246,508;144,18,244,508;143,18,243,510;143,0,243,510;145,0,245,510;" +
      "148,0,248,512;153,0,252,510;158,0,256,510;165,0,262,506;176,0,271,505;186,0,282,501;" +
      "197,0,292,499;209,18,303,495;223,33,315,492;243,56,334,473;264,62,354,464;288,71,377,455;" +
      "311,73,398,451;333,64,421,445;353,44,441,434;366,23,455,434;379,9,464,425;387,50,470,421;" +
      "397,59,478,410;408,66,488,401;417,23,501,388;427,10,513,381;436,4,524,369;448,1,537,356;" +
      "460,0,551,331;469,0,560,299;474,0,566,275;480,0,570,258;489,0,582,249;506,0,597,245;" +
      "520,0,612,244;528,0,619,247",
      drone: "472,314,555,394;473,323,555,403;476,342,556,418;479,356,559,432;483,368,562,444;488,377,566,453;" +
      "492,384,569,458;495,390,573,462;499,395,577,464;503,397,581,464;508,395,586,460;514,384,591,453;" +
      "521,373,595,442;527,362,599,429;530,353,605,418;532,342,609,406;534,332,612,397;537,323,614,388;" +
      "540,316,618,381;542,308,621,377;542,305,623,373;540,305,620,373;536,306,613,375;529,318,604,384;" +
      "519,331,596,399;509,347,588,416;499,362,581,432;493,375,572,445;491,388,569,458;491,397,568,469;" +
      "493,405,570,479;494,414,572,486;496,419,574,492;497,427,577,495;498,429,579,499;498,432,580,503;" +
      "499,434,580,506;501,438,583,510;503,440,586,512;504,442,590,512;505,440,591,510;505,438,592,508;" +
      "504,436,592,510;503,438,592,512;502,440,592,516;502,442,593,518;501,445,593,523;499,451,593,531;" +
      "498,460,593,540;497,471,594,551;496,484,594,564;507,501,594,582;513,516,594,597;512,531,594,614;" +
      "504,544,593,627;499,558,592,644;503,573,592,658;497,582,591,671;492,590,589,682;497,597,587,690;" +
      "504,606,585,697;503,608,584,701;490,606,582,703;491,606,580,703;499,610,578,701;497,608,576,697;" +
      "486,599,574,692;477,588,574,686;480,577,576,679;482,564,577,669;484,551,578,658;485,540,579,649;" +
      "487,532,581,640;489,523,582,629;492,516,584,619;495,508,586,612;499,503,590,610;504,497,594,605;" +
      "510,492,601,599;515,488,606,594;520,486,612,590;524,486,616,590;530,486,620,592;536,490,624,597;" +
      "541,494,629,601;546,501,633,606;551,508,637,610;555,518,641,619;559,527,647,627;564,534,652,638;" +
      "569,544,657,647;574,553,661,656;578,562,666,664;581,569,671,671;582,575,674,677;581,577,676,681;" +
      "579,577,672,681;574,573,668,679;570,568,662,673;564,560,656,662;556,553,647,653;545,545,637,644;" +
      "533,536,624,636;519,523,609,621;508,510,594,608;495,497,579,594;485,486,564,581;471,473,549,564;" +
      "461,456,537,544;454,438,529,521;452,416,523,497;451,395,522,471;447,371,515,442;440,338,505,399;" +
      "436,319,495,378;-;-;-;-;-;-;-;245,303,284,358;245,303,284,358;-;-;-;-;-;-;-"
    }
  };
  var clips = $$(".clip video");
  function mark(v) { /* the button is named after its clip: "Pause dome-2026 clip" */
    v._fig.setAttribute("data-state", v._want ? "on" : "off");
    v._btn.setAttribute("aria-label", (v._want ? "Pause " : "Play ") + (v._fig.getAttribute("data-name") || "the").replace(/\.\w+$/, "") + " clip");
  }
  function run(v) {
    if (v._want && v._in && !document.hidden) {
      var p = v.paused && v.play();
      if (p && p.catch) p.catch(function (err) { /* autoplay refused (e.g. battery saver): wait for the button */
        if (err && err.name === "NotAllowedError") { v._want = false; mark(v); }
      });
    } else if (!v.paused) v.pause();
  }
  function toggle(v) {
    v._want = !v._want; v._user = true; v._held = false;
    if (v._want) { v._in = true; v.preload = "auto"; } /* asked for by hand: play now, even half in view */
    mark(v); run(v);
  }
  function tc(t) { /* seconds -> MM:SS:FF at 30 fps */
    var f = Math.floor(t * 30), pad = function (n) { return (n < 10 ? "0" : "") + n; };
    return pad(Math.floor(f / 1800)) + ":" + pad(Math.floor(f / 30) % 60) + ":" + pad(f % 30);
  }
  if (clips.length && io) {
    var soon = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting && e.target._want) { e.target.preload = "auto"; soon.unobserve(e.target); } });
    }, { rootMargin: "50% 0px" });
    var inView = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        var h = Math.min(e.boundingClientRect.height, e.rootBounds ? e.rootBounds.height : innerHeight);
        e.target._in = e.isIntersecting && e.intersectionRect.height >= 0.4 * h;
        run(e.target);
      });
    }, { threshold: [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1] });
    clips.forEach(function (v, i) {
      var fig = v.closest(".clip"), cap = $("figcaption", fig), b = document.createElement("button"), tcEl = $("[data-tc]", fig);
      v._fig = fig; v._btn = b; v._want = !still(); v._in = false;
      v.removeAttribute("controls");
      v.muted = true;
      b.type = "button"; b.className = "clip-btn";
      if (cap) { cap.id = cap.id || "clip-cap-" + i; b.setAttribute("aria-describedby", cap.id); }
      v.parentNode.appendChild(b);
      b.addEventListener("click", function () { toggle(v); });
      v.addEventListener("click", function () { toggle(v); });
      if (tcEl) v.addEventListener("timeupdate", function () { tcEl.textContent = tc(v.currentTime); });
      /* The auton pair: a timeline under each clip (bar + elapsed seconds), in its alliance colour. */
      var at = $(".atimer", fig), atBar = at && $("i", at), atRead = at && $("[data-at]", at);
      if (at) v.addEventListener("timeupdate", function () {
        var d = v.duration || 15, t = v.currentTime;
        atBar.style.setProperty("--p", Math.min(1, t / d).toFixed(3));
        atRead.textContent = Math.floor(t / 60) + ":" + ("0" + (t % 60).toFixed(1)).slice(-4);
      });
      mark(v);
      soon.observe(v); inView.observe(v);
      if (fig.classList.contains("tracked")) track(fig, v);
    });
    document.addEventListener("visibilitychange", function () { clips.forEach(run); });
    /* Pausing motion pauses every clip that was playing on its own; resuming restarts them (and starts
       the ones nobody has touched). A clip you paused or played by hand keeps your choice. */
    onMotion.push(function () {
      clips.forEach(function (v) {
        if (still()) { if (v._want && !v._user) { v._want = false; v._held = true; } }
        else if (v._held || !v._user) { v._want = true; v._held = false; }
        mark(v); run(v);
      });
    });
  }



  /* Tracked boxes over a clip (the drone), from TRACKS above. Drawn only while playing. The boxes
     come from an offline colour tracker, and the frame says so (.src-note). */
  function track(fig, v) {
    var box = $(".clip-box", fig), tracks = [], data = TRACKS[fig.getAttribute("data-name")] || {};
    ["can", "drone"].forEach(function (name) {
      var raw = data[name];
      if (!raw) return;
      var el = document.createElement("span");
      el.className = "trk-box " + name + "-box";
      el.setAttribute("aria-hidden", "true");
      el.innerHTML = "<b>" + name + "</b>";
      box.appendChild(el);
      tracks.push({ el: el, pts: raw.split(";").map(function (s) { return s === "-" ? null : s.split(",").map(Number); }) });
    });
    var going = false;
    function draw() {
      var t = v.currentTime * 10, i = Math.floor(t), f = t - i;
      tracks.forEach(function (k) {
        var a = k.pts[i], b = k.pts[i + 1] || a;
        if (!a || !b) { k.el.style.display = "none"; return; }
        var x0 = a[0] + (b[0] - a[0]) * f, y0 = a[1] + (b[1] - a[1]) * f, x1 = a[2] + (b[2] - a[2]) * f, y1 = a[3] + (b[3] - a[3]) * f;
        var s = k.el.style;
        s.display = "block"; s.left = x0 / 10 + "%"; s.top = y0 / 10 + "%"; s.width = (x1 - x0) / 10 + "%"; s.height = (y1 - y0) / 10 + "%";
        k.el.classList.toggle("edge", y0 < 60);
      });
    }
    function loop() {
      if (v.paused || v.ended) { going = false; return; }
      draw();
      if (v.requestVideoFrameCallback) v.requestVideoFrameCallback(loop); else requestAnimationFrame(loop);
    }
    v.addEventListener("play", function () { if (!going) { going = true; loop(); } });
    v.addEventListener("seeked", draw);
  }

  /* ---------- 6. Annotation tags ----------
     Each box's tag tries its authored spot first, then above / below / inside, left- or right-
     aligned, and takes the first that stays inside the visible frame and clear of the tags
     already placed. A box narrower than its tag (or with nowhere to put it) keeps its outline
     and drops the tag. Re-run on resize and once the fonts are in. Uses layout offsets, so the
     reveal animations don't disturb it. */
  var CANDS = ["", "r", "d", "d r", "u", "u r"];
  function layoutTags() {
    $$(".bxs").forEach(function (layer) {
      if (layer.closest(".vs")) return; /* the viewer places its own */
      var host = layer.parentNode, fi = host.closest(".crop-win, .fi") || host;
      var hr = host.getBoundingClientRect(), fr = fi.getBoundingClientRect();
      if (!hr.width) return;
      var vis = { x0: fr.left - hr.left, y0: fr.top - hr.top, x1: fr.right - hr.left, y1: fr.bottom - hr.top };
      var placed = [];
      $$(".bx", layer).forEach(function (bx) {
        var b = $("b", bx);
        if (!b) return;
        if (b._pref == null) b._pref = b.className;
        bx.classList.remove("notag");
        b.className = b._pref;
        var x = bx.offsetLeft, y = bx.offsetTop, w = bx.offsetWidth, h = bx.offsetHeight, tw = b.offsetWidth, th = b.offsetHeight;
        if (w < tw * 0.9) { bx.classList.add("notag"); return; }
        var order = [b._pref].concat(CANDS.filter(function (c) { return c !== b._pref; }));
        for (var k = 0; k < order.length; k++) {
          var c = " " + order[k] + " ", up = c.indexOf(" u ") > -1, dn = c.indexOf(" d ") > -1, rt = c.indexOf(" r ") > -1;
          var tx = rt ? (up ? x + w - 3 - tw : x + w + 1.5 - tw) : (up ? x + 3 : x - 1.5);
          var ty = dn ? y + h + 1.5 : up ? y + 3 : y - th - 1.5;
          var ok = tx >= vis.x0 && ty >= vis.y0 && tx + tw <= vis.x1 && ty + th <= vis.y1;
          for (var j = 0; ok && j < placed.length; j++) {
            var o = placed[j];
            if (tx < o.x + o.w + 2 && tx + tw + 2 > o.x && ty < o.y + o.h + 2 && ty + th + 2 > o.y) ok = false;
          }
          if (ok) { b.className = order[k]; placed.push({ x: tx, y: ty, w: tw, h: th }); return; }
        }
        bx.classList.add("notag");
      });
    });
  }
  var tagT = 0, tagW = innerWidth;
  idle(layoutTags); /* after first paint: none of the labelled photos is in the first screen */
  addEventListener("load", function () { idle(layoutTags); });
  addEventListener("resize", function () { if (innerWidth === tagW) return; tagW = innerWidth; clearTimeout(tagT); tagT = setTimeout(layoutTags, 150); });
  if (document.fonts && document.fonts.addEventListener) document.fonts.addEventListener("loadingdone", function () { clearTimeout(tagT); tagT = setTimeout(layoutTags, 60); });

  /* ---------- 7. False-colour lens ----------
     Hover a photo (mouse or pen only): a circle follows the pointer and shows that patch in false
     colour, luminance mapped through the inferno ramp (the #heat filter in index.html). Never on
     the portrait or a photo marked data-no-fx (Richard's own face). */
  if (matchMedia && matchMedia("(hover: hover) and (pointer: fine)").matches) {
    $$(".frame .fi").forEach(function (fi) {
      if (fi.classList.contains("clip-box") || fi.closest(".viewer") || fi.closest("[data-cal]") || fi.closest("[data-no-fx]")) return;
      var lens = null, ring = null, R = 0, raf = 0, px = 0, py = 0;
      function place() {
        raf = 0;
        lens.style.clipPath = "circle(" + R + "px at " + px + "px " + py + "px)";
        ring.style.transform = "translate(" + px + "px," + py + "px)";
      }
      fi.addEventListener("pointerenter", function (e) {
        var img = $("img", fi);
        if (!img || !img.complete) return;
        var host = $(".crop-in", fi) || fi, r = host.getBoundingClientRect();
        R = Math.max(54, Math.min(110, r.width * 0.13));
        lens = document.createElement("div"); lens.className = "lens"; lens.setAttribute("aria-hidden", "true");
        var copy = document.createElement("img"); copy.alt = ""; copy.src = img.currentSrc || img.src; copy.decoding = "async";
        lens.appendChild(copy);
        ring = document.createElement("div"); ring.className = "lens-ring"; ring.setAttribute("aria-hidden", "true"); ring.style.setProperty("--r", R + "px");
        host.appendChild(lens); host.appendChild(ring);
        move(e);
      });
      function move(e) {
        if (!lens) return;
        var r = ($(".crop-in", fi) || fi).getBoundingClientRect();
        px = e.clientX - r.left; py = e.clientY - r.top;
        if (!raf) raf = requestAnimationFrame(place);
      }
      fi.addEventListener("pointermove", move);
      fi.addEventListener("pointerleave", function () {
        if (raf) cancelAnimationFrame(raf), raf = 0;
        if (lens) { lens.remove(); ring.remove(); lens = ring = null; }
      });
    });
  }

  /* ---------- 8. The conditions viewer ----------
     Buttons pick the condition (a class on the figure). The correction amount --c (0 = raw,
     1 = corrected) follows the slider, a mouse moving across the frame (left = raw, right =
     corrected) or a finger dragging on it. With motion allowed, the correction plays once when
     the viewer comes into view and again on each new condition. The panel beside the frame
     reads out the condition, its paper, the view and the correction. */
  var viewer = $("[data-viewer]");
  if (viewer) {
    var stage = $(".vs", viewer), range = $("[data-fix]", viewer), condName = $("[data-cond-name]", viewer);
    var readC = $("[data-c-read]", viewer), mode = $(".vs-mode", viewer), vCond = $("[data-v-cond]", viewer), vPaper = $("[data-v-paper]", viewer);
    var names = { knock: "a knocked camera", dark: "darkness", dim: "dim artificial light", glare: "glare" };
    var short = { knock: "camera knocked", dark: "darkness", dim: "dim artificial light", glare: "glare" };
    var papers = { knock: "IEEE ICCAS 2025", dark: "IEEE WRC SARA 2025", dim: "IEEE WRC SARA 2025", glare: "IEEE WRC SARA 2025" };
    var ctrl = $(".viewer-ctrl", viewer), tween = 0, played = false;
    ctrl.hidden = false; range.closest("label").hidden = false;
    var setC = function (c) {
      c = Math.max(0, Math.min(1, c));
      stage.style.setProperty("--c", c.toFixed(3));
      range.value = Math.round(c * 100);
      if (readC) readC.textContent = Math.round(c * 100) + "%";
      if (mode) mode.textContent = c > 0.97 ? "corrected" : c < 0.03 ? "raw" : "correcting";
      stage.classList.toggle("is-fixed", c > 0.97);
    };
    var play = function () { /* raw -> corrected over 1.6 s (eased); any hand on the controls stops it */
      cancelAnimationFrame(tween);
      if (still()) return setC(1);
      var t0 = 0;
      setC(0);
      tween = requestAnimationFrame(function f(now) {
        t0 = t0 || now + 350;
        var p = Math.max(0, Math.min(1, (now - t0) / 1600));
        setC(1 - Math.pow(1 - p, 3));
        if (p < 1) tween = requestAnimationFrame(f);
      });
    };
    var hand = function (c) { cancelAnimationFrame(tween); setC(c); };
    $$("button", ctrl).forEach(function (b) {
      b.addEventListener("click", function () {
        var c = b.getAttribute("data-cond");
        $$("button", ctrl).forEach(function (o) { o.setAttribute("aria-pressed", o === b ? "true" : "false"); });
        viewer.className = viewer.className.replace(/\bcond-\w+/g, "").replace(/\s+/g, " ").trim() + " cond-" + c;
        if (condName) condName.textContent = names[c];
        if (vCond) vCond.textContent = short[c];
        if (vPaper) vPaper.textContent = papers[c];
        placeRaw();
        play();
      });
    });
    /* The estimate's tag moves with its box, from where each condition puts it (--r*) to the
       robot (--t*). Per condition, it takes the first spot (below, below right, above, above
       right, inside) that stays in the frame and clear of the ground-truth tags at the raw end
       and halfway, so it never lands on "goal" or "robot" (the layout in section 6 skips the
       viewer). Run on every condition change, on resize and once the fonts are in. */
    var raw = $(".bx-raw", stage), rawTag = raw && $("b", raw), gtTags = $$(".bx-true b", stage);
    var RAW_CANDS = ["d", "d r", "", "r", "u", "u r"];
    function placeRaw() {
      if (!rawTag) return;
      var layer = raw.parentNode, L = layer.getBoundingClientRect(), V = stage.getBoundingClientRect();
      if (!L.width) return;
      var cs = getComputedStyle(raw), v = function (n, d) { return parseFloat(cs.getPropertyValue(n)) / 100 * d; };
      var R = [v("--rx", L.width), v("--ry", L.height), v("--rw", L.width), v("--rh", L.height)];
      var T = [v("--tx", L.width), v("--ty", L.height), v("--tw", L.width), v("--th", L.height)];
      var tw = rawTag.offsetWidth, th = rawTag.offsetHeight;
      var gt = gtTags.map(function (b) { var q = b.getBoundingClientRect(); return { x: q.left - L.left, y: q.top - L.top, w: q.width, h: q.height }; });
      var vis = { x0: V.left - L.left, y0: V.top - L.top, x1: V.right - L.left, y1: V.bottom - L.top };
      for (var k = 0; k < RAW_CANDS.length; k++) {
        var c = " " + RAW_CANDS[k] + " ", up = c.indexOf(" u ") > -1, dn = c.indexOf(" d ") > -1, rt = c.indexOf(" r ") > -1, ok = true;
        for (var f = 0; ok && f <= 0.5; f += 0.5) {
          var x = R[0] + (T[0] - R[0]) * f, y = R[1] + (T[1] - R[1]) * f, w = R[2] + (T[2] - R[2]) * f, h = R[3] + (T[3] - R[3]) * f;
          var tx = rt ? (up ? x + w - 3 - tw : x + w + 1.5 - tw) : (up ? x + 3 : x - 1.5);
          var ty = dn ? y + h + 1.5 : up ? y + 3 : y - th - 1.5;
          ok = tx >= vis.x0 && ty >= vis.y0 && tx + tw <= vis.x1 && ty + th <= vis.y1;
          for (var j = 0; ok && j < gt.length; j++) {
            var o = gt[j];
            if (tx < o.x + o.w + 3 && tx + tw + 3 > o.x && ty < o.y + o.h + 3 && ty + th + 3 > o.y) ok = false;
          }
        }
        if (ok) { rawTag.className = RAW_CANDS[k]; return; }
      }
      rawTag.className = "u";
    }
    idle(placeRaw);
    var rawT = 0;
    addEventListener("resize", function () { clearTimeout(rawT); rawT = setTimeout(placeRaw, 150); });
    if (document.fonts && document.fonts.addEventListener) document.fonts.addEventListener("loadingdone", function () { clearTimeout(rawT); rawT = setTimeout(placeRaw, 60); });
    range.addEventListener("input", function () { hand(range.value / 100); });
    var dragging = false, at = function (e) { var r = stage.getBoundingClientRect(); return (e.clientX - r.left) / r.width; };
    stage.addEventListener("pointermove", function (e) { if (e.pointerType === "mouse" || dragging) hand(at(e)); });
    stage.addEventListener("pointerdown", function (e) { if (e.pointerType !== "mouse") { dragging = true; hand(at(e)); } });
    ["pointerup", "pointercancel"].forEach(function (t) { addEventListener(t, function () { dragging = false; }); });
    setC(still() ? 1 : 0); /* with motion, it waits raw and plays the correction when seen */
    if (io) new IntersectionObserver(function (es, o) {
      if (es[0].isIntersecting && !played) { played = true; o.disconnect(); play(); }
    }, { threshold: 0.6 }).observe(stage);
    onMotion.push(function () { if (still()) { cancelAnimationFrame(tween); setC(1); played = true; } });
  }

  /* ---------- 9a. Team videos: click a thumbnail to play it in place ----------
     Each thumbnail is a plain link to YouTube (what you get without JS, on a new-tab click, and
     from file://). Otherwise a click swaps in the youtube-nocookie player. */
  if (/^https?:$/.test(location.protocol)) {
    $$("a[data-yt]").forEach(function (a) {
      a.addEventListener("click", function (e) {
        if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
        var id = a.getAttribute("data-yt") || "";
        if (!/^[\w-]{11}$/.test(id)) return;
        e.preventDefault();
        var card = a.closest(".vid"), title = card && $(".vid-title", card);
        var frame = document.createElement("iframe");
        frame.className = "vid-frame";
        frame.src = "https://www.youtube-nocookie.com/embed/" + id + "?autoplay=1";
        frame.title = title ? title.textContent.trim() : "YouTube video";
        frame.setAttribute("allow", "autoplay; encrypted-media; picture-in-picture");
        frame.setAttribute("allowfullscreen", "");
        frame.setAttribute("referrerpolicy", "strict-origin-when-cross-origin");
        a.parentNode.replaceChild(frame, a);
        frame.focus();
      });
    });
  }

  /* ---------- 9b. "copy bibtex": built from the visible fields of each paper ----------
     Reads data-bib-key on the <li> and the elements marked data-bib="title|author|booktitle|year|pages". */
  var status = $("[data-copy-status]");
  function field(paper, name) { var el = $('[data-bib="' + name + '"]', paper); return el ? el.textContent.replace(/\s+/g, " ").trim() : ""; }
  function bibAuthors(list) { /* "Richard B. Wang, Xing Wei*" -> "Wang, Richard B. and Wei, Xing" */
    return list.replace(/\*/g, "").split(",").map(function (n) {
      var parts = n.trim().split(" "), last = parts.pop();
      return parts.length ? last + ", " + parts.join(" ") : last;
    }).filter(Boolean).join(" and ");
  }
  function bibtex(paper) {
    var rows = [
      ["title", field(paper, "title")],
      ["author", bibAuthors(field(paper, "author"))],
      ["booktitle", field(paper, "booktitle")],
      ["year", field(paper, "year")],
      ["pages", field(paper, "pages").replace(/\s*[–—-]+\s*/g, "--")]
    ].filter(function (r) { return r[1]; });
    return "@inproceedings{" + (paper.getAttribute("data-bib-key") || "paper") + ",\n" +
      rows.map(function (r) { return "  " + (r[0] + "          ").slice(0, 9) + " = {" + r[1] + "}"; }).join(",\n") + "\n}";
  }
  function legacyCopy(text) {
    return new Promise(function (resolve, reject) {
      var prev = document.activeElement, ta = document.createElement("textarea");
      ta.value = text; ta.setAttribute("readonly", ""); ta.setAttribute("aria-hidden", "true");
      ta.style.cssText = "position:fixed;top:0;left:0;opacity:0";
      document.body.appendChild(ta); ta.select();
      try { if (document.execCommand("copy")) resolve(); else reject(); } catch (e) { reject(e); }
      finally { document.body.removeChild(ta); if (prev && prev.focus) prev.focus({ preventScroll: true }); }
    });
  }
  function copyText(text) {
    if (navigator.clipboard && window.isSecureContext) return navigator.clipboard.writeText(text).catch(function () { return legacyCopy(text); });
    return legacyCopy(text);
  }
  $$("[data-copy-bib]").forEach(function (btn) {
    var paper = btn.closest(".paper");
    if (!paper || !window.Promise) return;
    var original = btn.textContent, timer = null, li = btn.closest("li");
    if (li) li.hidden = false;
    btn.addEventListener("click", function () {
      var done = function (msg) {
        btn.textContent = msg;
        if (status) status.textContent = "BibTeX " + msg + ".";
        clearTimeout(timer);
        timer = setTimeout(function () { btn.textContent = original; }, 1600);
      };
      copyText(bibtex(paper)).then(function () { done("copied"); }, function () { done("copy failed"); });
    });
  });

  /* ---------- 10. The clock, and the end of the feed ----------
     The clock counts how long this feed has been running (1 Hz). It holds while the tab is in the
     background, while motion is off (showing the time it stopped at), and never runs with reduced
     motion. When the footer comes into view the feed ends: the REC light goes out, the clock
     stops, the HUD reads "Feed stopped" and the whole stack reads complete. Scroll back up and
     it powers on again. */
  var clocks = $$("[data-clock]"), clock = clocks[0], eof = $("[data-eof]"), elapsed = 0, since = 0, clockTimer = 0, lastTxt = "";
  function fmt(ms) { var s = Math.floor(ms / 1000); return (s < 600 ? "0" : "") + Math.floor(s / 60) + ":" + (s % 60 < 10 ? "0" : "") + (s % 60); }
  function now() { return elapsed + (since ? Date.now() - since : 0); }
  function tick() {
    var t = fmt(now());
    if (t === lastTxt) return;
    lastTxt = t;
    clocks.forEach(function (c) { c.textContent = t; });
  }
  function clockRun(on) {
    if (on && !since) { since = Date.now(); clockTimer = setInterval(tick, 1000); }
    else if (!on && since) { elapsed += Date.now() - since; since = 0; clearInterval(clockTimer); clockTimer = 0; }
    tick();
  }
  function clockSync() { clockRun(!document.hidden && !still() && !ended); }
  if (clock) {
    clockSync();
    document.addEventListener("visibilitychange", clockSync);
    onMotion.push(clockSync);
  }
  var foot = $(".foot");
  if (foot && io) new IntersectionObserver(function (es) {
    var on = es[0].isIntersecting;
    if (on === ended) return;
    ended = on;
    root.classList.toggle("feed-stopped", on);
    clockSync();
    lastId = null; lastP = -1; spy(); /* repaint the stack (complete while ended) and the stage name */
    if (on) {
      if (eof) eof.textContent = now() >= 1000 ? "Stopped at " + fmt(now()) : "Stopped";
      setStage("Stopped");
    }
  }, { rootMargin: "0px 0px -12% 0px" }).observe($(".eof", foot) || foot);

  /* ---------- 11. Chapter titles ----------
     Each giant title's size comes from --r, the word's width in ems (style.css, section 4). Here
     it is measured from the word itself (width ÷ font size), once Archivo has arrived, so a new
     word fits its columns without anyone measuring it. The CSS values are the first-frame / no-JS
     fallback; they were measured the same way, so on a normal load nothing moves. Measuring on the
     stand-in font would be wrong, so it waits for Archivo (feed.js tells us). */
  function fitTitles() {
    var feat = window.rbwFeat;
    if (feat && feat.archivoLoaded && !feat.archivoLoaded()) return;
    $$(".giant").forEach(function (h) {
      var w = $(".giant-w", h);
      if (!w) return;
      var fs = parseFloat(getComputedStyle(h).fontSize), width = 0, kids = w.childNodes;
      /* the word's own text only (tags, boxes and canvases inside are absolutely placed) */
      var range = document.createRange();
      for (var i = 0; i < kids.length; i++) if (kids[i].nodeType === 3) { range.selectNodeContents(kids[i]); width += range.getBoundingClientRect().width; }
      if (!fs || !width) return;
      var r = (width / fs).toFixed(3);
      if (h.style.getPropertyValue("--r") !== r) h.style.setProperty("--r", r);
    });
  }
  window.rbwFitTitles = fitTitles;

  /* A deep link (/#papers) is scrolled to before the webfonts are in; Archivo, and the chapter
     titles fitted to it, then change the heights above the target, and on a cold load the
     landing ends up 70–100px short. So, when the page was entered with a hash (a fresh visit, not
     a reload or back/forward, where the browser restores its own scroll) and the reader hasn't
     touched the page since, land on the target again when the page has loaded and each time the
     fonts (and so the titles) change, for the first 10 s of the visit. Meanwhile the page's
     smooth scroll is off (html.deep, set in <head>), so the browser's own jump to the hash is
     instant and a landing never starts while that jump is still moving (it would overshoot);
     the first touch of the page turns it back on. */
  var deep = null, deepT = 0;
  if (location.hash.length > 1) {
    try { deep = document.getElementById(decodeURIComponent(location.hash.slice(1))); } catch (e) { deep = null; }
    var navT = window.performance && performance.getEntriesByType ? performance.getEntriesByType("navigation")[0] : null;
    if (navT && navT.type && navT.type !== "navigate") deep = null;
  }
  function undeep() { deep = null; root.classList.remove("deep"); }
  if (deep) {
    ["wheel", "touchstart", "keydown", "mousedown"].forEach(function (t) { addEventListener(t, undeep, { passive: true, capture: true }); });
    setTimeout(undeep, 10000);
  } else undeep();
  function reland() { if (deep) deep.scrollIntoView({ behavior: "instant", block: "start" }); } /* (already there: nothing moves) */
  function relandSoon() {
    if (!deep) return;
    clearTimeout(deepT);
    deepT = setTimeout(function () { fitTitles(); reland(); }, 80); /* the titles first: their sizes are part of the shift */
  }
  if (deep && document.fonts && document.fonts.addEventListener) document.fonts.addEventListener("loadingdone", relandSoon);
  if (deep) addEventListener("load", relandSoon); /* (and once the page has loaded, whatever the fonts are doing) */

  /* Printing: ask for every lazy image now (style.css section 17 is the print layout). */
  addEventListener("beforeprint", function () { $$('img[loading="lazy"]').forEach(function (i) { i.loading = "eager"; }); });
  /* feed.js (which knows when Archivo is in) runs after this file: hook up once all have run. */
  document.addEventListener("DOMContentLoaded", function () {
    var fr = window.rbwFeat && window.rbwFeat.fontsReady;
    if (fr) fr.then(function () { idle(fitTitles); });
    if (deep && window.Promise) (fr || Promise.resolve()).then(function () { return document.fonts && document.fonts.ready; }).then(relandSoon);
  });
  if (document.fonts && document.fonts.addEventListener) document.fonts.addEventListener("loadingdone", function () { idle(fitTitles); });
})();
