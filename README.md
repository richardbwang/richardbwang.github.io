# richardbwang.github.io: "Perception"

Richard B. Wang's personal site, seen through a robot's camera. The page opens on a live feed:
his name, standing on the camera's depth view of a VEX field floor. Scrolling builds a perception
stack one stage at a time, and each chapter acts out its own stage on its own content: the lens
around the portrait is calibrated, the detector switches on over the honors, the projects are
tracked, the roles are classified, the papers' conditions are corrected, the robotics title is
localized from a particle cloud and a robot is localized on a Push Back field. At the footer the
feed stops. The order is the one a tech recruiter skims in: who he is, what he has won, what he
has built, where he has worked, then the papers and the robotics record.

Plain HTML, CSS and vanilla JS. There's no build step and no npm. The one library is three.js
(r170, MIT), vendored into `assets/vendor/three/` for the 3D robot and loaded only when that robot
is about to be seen. GitHub Pages serves the repo root as is.

```
index.html     all the content
style.css      all the styling (tokens at the top)
site.js        behaviour: mail link, stars, the stack/nav/HUD, clips (+ the drone's track data), tag
               layout, lens, viewer, BibTeX, clock, chapter-title sizing, a deep link's second landing
feed.js        the hero: the depth floor, the knock, and the corner detector the other files borrow
stages.js      the chapters that act out their stage: calibration (01), tracking (03), localization (06),
               and the boot of the 06 opener's 3D robot (which mode, when to load)
robot3d.js     the 3D robot itself (an ES module, imported on demand): scene, scroll act, controls
404.html       "No signal" page (inline CSS, absolute paths)
favicon.svg    a detection box
assets/        photos (+ small/ copies), videos (+ posters/), the portrait and the Startup School photo
assets/projects/  the two project screenshots (RW-Template's simulator, Toph's dashboard), WebP + JPEG,
               1200 and 640 wide
assets/robot/  robot-hs.glb (the 1698V High Stakes CAD, 1.9 MB) and its stills (WebP + PNG fallback)
assets/vendor/three/  three.js r170, only the 4 files the robot needs, plus its LICENSE
```

## The idea in one paragraph

Two voices share the page. **Human** text (everything Richard says) is set in Archivo, a
variable grotesk used at three widths: 62.5% condensed and 800 weight for the giant titles, 112%
wide for statements, and normal width for reading. The **machine** layer (everything the "robot"
draws) uses Martian Mono 400 in small capitals, never below 11px, and one signal colour, lime
`#d4ff3a`. The page is one 12-column, 1360px measure (the hero included) under a fixed camera HUD,
with fine grain and a soft vignette over everything, so the whole page stays a camera's view.

**Colour.** Lime is the signature: everything the machine draws. The second voice is the plum of
the vignette, lifted to **rose** `#ea74a4` (7.1:1 on ink) where it has to read on ink: it marks the human hand
(hand-placed ground-truth labels, the viewer's ground-truth key) and, with violet and amber, the
depth ramp (the hero floor, the openers' glow). **VEX red and blue** appear only in robotics: the
06 stage chip, the alliance frames on the auton pair, the Dome's title card, the results card.

**Honest marks.** Nothing on the page shows an invented confidence score. A **solid lime** tag is
machine output: the hero's corner detector, the tracker on the project titles, the offline colour
tracker on the drone clip (the frame says so). A **hollow rose** tag on a box with four corner
handles is a hand-placed ground-truth label. The viewer and the MCL panel are labelled as
illustrations. **Never a box or a label on a person, and nothing on Richard's own face:** the
About calibration happens around the portrait, never on it, and the photos that show his face
(the portrait, Startup School: `data-no-fx`) get no focus hunt and no lens (nor do the two
project screenshots or the robot's thumbnail in Experience: they're `data-no-fx` too, to stay clean). The one effect that
can pass over people elsewhere is the false-colour lens, and only while a mouse hovers a photo.

**One home for live status.** The REC light, the stage and the clock live in the top bar below
1024px, and at the foot of the side rail from 1024px (never both). Frame counters, ground-truth
counts and per-title tracker readouts were cut.

## Section map

| # | Stage | Section (`id`) | What the stage does | What's in it |
|---|---|---|---|---|
| 00 | Raw feed | `#top` (hero) | the depth floor behind the name; the knock when the typeface lands; grab and fling | name (`h1`), tagline, readout (study · now · papers · record: the #1 Autonomous Skills rank and the World Finalist result, 2nd of 20,000+ teams), email · GitHub · LinkedIn (all in the first frame) |
| 01 | Calibration | `#about` | graticule and frame edges bowed by a lens, around the portrait; checkerboard corners found; lines straighten | portrait (always clean), statement, then the proof paragraph: 1698V's two world-level results, RW-Template's numbers, the two IEEE papers, iLab |
| 02 | Detection | `#honors` | the first boxes on the page: the title is detected (a dashed guess that snaps on, its `text` tag, corner features on the word); each honor carries its class | the short list, strongest first (#1 Autonomous Skills, World Finalist, USACO Gold, 2× division champion, National Merit Finalist, 2× California State Champion): two columns of three on wide screens (title + all six in one 1280×800 screen) |
| 03 | Tracking | `#projects` | the title trails a tracked box as you scroll; each project name's box shows on hover/focus; the drone clip's tracked boxes | RW-Template (live stars, its simulator's replay as a framed screenshot that opens the replays; below 900px it comes right after the stats, before the lede), drone-perception (tracked clip), Toph (`#toph`: the LavaLab role links to it; its dashboard as a framed screenshot that opens the live demo, a closer crop on phones and at 900–1149px, where the whole dashboard would be too small to read or too short for its column), DueSync (compact, text only), also on GitHub (Competitive-Programming, one line). Media alternates sides: right, left, right |
| 04 | Classification | `#experience` | the classifier's label set lands under the title, one tag at a time; every role carries its class tag (research, engineering, startup, robotics), landing just after its line | four roles, newest first (iLab, LavaLab, YC Startup School, 1698V), two lines each from 1100px (at most three at 900–1099px and on a 390px phone, four at 320–360px); Startup School with its photo and 1698V with its robot (it jumps to the robot in Robotics) as small side figures; from 900px every role is set the same way (dates in columns 1–2, the role, its lines and its chips in 3–9, a figure in 10–12); then "Leadership", two lighter one-liners (Power Beans Foundation, varsity football) |
| 05 | Robustness | `#papers` | the title arrives lightly degraded and clears in under a second; the conditions viewer | viewer + readout panel, both papers with "copy bibtex" |
| 06 | Localization | `#robotics` | the opener: the 1698V robot in 3D, read out of a depth point cloud by a scan line, detected, turned under tracked features and a depth pass, taken apart into an exploded drawing and driven off as you scroll; the title is localized from particles; MCL on a Push Back field beside the results | the 3D robot + its parts list and caption, then the log's lede, log + totals, links (the log is `#results`: the "Results below" and "further down" links land on it), MCL, autons (the Dome R16 clip, then the red/blue pair), two team videos, a four-photo strip (F01–F04), then the Worlds 2026 sub-head straight into the Dome |
| 07 | Handshake | `#contact` | plain, compact: the email link is in the first screen after a nav click | email (assembled by JS), GitHub, LinkedIn, results card (headed by the 2025 World Finals result) |
| — | Feed stopped | footer | REC light out, clock stopped, stack complete, the name loses its features | © line, back to top |

Nav (top on desktop, bottom on phones): Honors, Projects, Experience, Papers, Robotics, Contact
(on phones each tab is as wide as its label plus an equal share, set a little condensed, so all six
fit from 320px). The stack
shows as eight labelled segments down the right edge (1024px and up) or an 8-segment strip under
the HUD (narrower). Stage names come from each section's `data-short`. A nav jump lands on the
chapter's stage label (a negative `scroll-margin-top` skips the empty pause above each chapter).
Experience was "Now" (`#now`) on the previous site: an empty `<span class="old-id" id="now">` at
the top of Experience's opener takes an old `/#now` link or bookmark there (also without JS, and
when the hash changes on the page), landing exactly where `/#experience` does; with JS the
`<head>` script also rewrites the address to `/#experience`.

**Phones: one beat per stage.** Below 700px each chapter opener from 02 to 06 is a full-bleed title
card that fills exactly the screen between the bars: viewfinder corner marks, a faint detector
cell grid and the plum depth glow, the stage named large at the top ("02 Detection · detector
on"), the giant title, the lede at the foot. It sits in the flow, so scrolling on skips it; with
motion, a scan line reads it out once as it arrives. About (right after the hero) and Contact
(email must be in the first screen) don't get one.

### The 3D robot (06 opener)

The Robotics opener is one composition a screen tall. On wide screens the stage label, the title,
the list of the robot's main assemblies, its caption and its controls are on the left (columns
1–5) and the 3D view takes the full height of columns 6–12 (7–12 below 1200px). The robot's frame
hugs the right of the view, so column 6, under the end of the title, is bleed that only the
exploded drawing and its callouts use (the callouts keep off the title). On phones the beat is
the stage label, the title, then the robot with its buttons and caption. The robot is the 1698V
High Stakes robot (2024–25), from its Onshape CAD.

**The still is the picture.** `index.html` holds a still (lazy `<img>`, WebP with a PNG fallback,
real alt text), a lime detector box with its tag on it, an exploded still with eight callouts
(hidden until "Explode"), the parts list and the facts caption. That is everything without JS,
with reduced motion, and wherever WebGL can't run. On a narrow screen the frame is small but the
tags aren't, so `stages.js` keeps the tag and the callouts inside the view and stacks each side's
callouts at least 5 px apart, bending their leaders to follow (under 400px the tag is set at
11px so it fits at all; without JS, under 480px, it is centred on the box, which keeps it inside
the view). The stills are rendered by `robot3d.js` itself
at the 3D view's opening pose and its exploded view, so the live view takes over without the
robot moving.

**The act** (desktop with motion; `robot3d.js`). The opener is pinned (`html.r3d-pinned` gives
`.r3d-track` about 2 screens of scroll; it's set as the page boots, far below the first screen, so
nothing visible moves; and with `stages.js` running the wide opener has the pinned layout whether
pinned or not, `html.r3d-js`, as does the view in a 700–999px desktop window where it can pin,
`html.r3d-pinnable` (not where the robot stays a still: reduced motion, no WebGL), so pinning or
unpinning it in place moves nothing either; in that window the opener's depth glow is drawn on
the view's sticky box, so it rides with the view; the pin only changes where nothing after the
pinned part is on screen) and the scroll plays it, one full turn in all (`ACT` in `robot3d.js` holds
the timeline):

1. *Reconstruct* (first 16% of the pin) — while the opener scrolls in, the robot is a depth point
   cloud (26k points sampled from its surfaces by area, coloured by depth on the hero floor's
   inferno ramp, amber near to violet far; opaque, so it reads as a depth image). Pinned, a lime
   scan line (a hairline across the view, ticks at the frame's edges) reads it out into the solid
   model, top to bottom, over the dotted 24-inch tile seams. A nod to the monocular-depth papers.
   If the 3D arrives while you are already looking at the still (a nav jump, a slow network), the
   first pinned scroll (or a touch, or 2 s of rest) runs the same scan line once over the still,
   swapping it for the live model under the line. Read out that way (or when motion resumes with
   the solid robot on screen) it stays read out, and from the pin's start the scroll then begins
   at the turn, so no stretch of the pin is left with nothing to show.
2. *Detect* — once it is whole, a detector box locks on (a loose dashed guess that snaps on, as in
   02) with a solid lime tag, `ROBOT · 1698V · HIGH STAKES 2024–25`. Machine output, no score.
3. *Inspect* (20–42%) — it turns 255° from its opening view (low, on its left side, a little in
   front: the X-braced lift, the big sprocket, the six wheels) to its front right, the camera
   rising a little. The hero's feature rings ride on it with their optical flow over the last
   0.4 s (24 points spread over its outside, only those facing the camera), and for a moment the
   camera switches to depth: the robot in the ramp's false colour, the readout naming the range
   (`DEPTH · 1.4–2.2 M`).
4. *Explode* (42–56%), then *hold* (56–80%, the longest beat, drifting 10°) — an exploded
   drawing: each group moves along its own authored vector (`explode` in `ROBOTS`), outer parts
   first, in three waves: the wheel stacks out along their axles, the drive rails out, the lift
   towers up and apart, the hook conveyor forward and up, the arm high, the intake forward and
   low, the goal clamp back, the odometry pod down out of the chassis; the chassis stays as the
   anchor. Faint dashed rose assembly lines run from each part's home to where it is. Eight
   callouts (lift arm, lift towers, hook conveyor, goal clamp, intake, drivetrain, wheels,
   odometry pod) arrive with the parts and light up the parts list beside it; each has a fixed
   side and a fixed place down its column, chosen once from the view the explode is heading for
   (4 and 4, at least 6 px apart), so the same scroll always gives the same layout and the drift
   never swaps two tags; after you turn it by hand they glide (250 ms) to new places, never
   jump. The detector lets go while it is apart.
5. *Assemble* (80–92%) — it comes back together on its opening view (the camera backs off while a
   part still on its way home would reach the view's edge: every part stays 12 px inside) and the
   box locks again with a second line, `WORLD FINALIST 2025 · 2ND OF 20,000+` (facts from the caption). Then, as the pin lets
   go, it drives a tile forward: the wheels roll and the seams slide under it, and the results
   log takes over.

The frame's readout (`CAM 06 · CAD · 1698V`) says what is happening: the download (`ACQUIRING
MODEL · 1.2 / 1.9 MB`, real bytes), `POINT CLOUD · 26K POINTS`, `RECONSTRUCTING · 64%`, `LOCKED ·
1698V`, `INSPECTING · 128°`, `DEPTH · 1.4–2.2 M`, `EXPLODED · 23 GROUPS`, `DRIVING · 0.3 M`. On a small phone the row keeps the
camera's name whole (`CAM 06 · 1698V` under 480px) and the longest readouts have short forms
under 400px (`MODEL · 1.2 / 1.9 MB`, `POINT CLOUD · 14K`, `MODEL READY`, `STILL · NO 3D HERE`).
Hands on: drag to turn it (pitch clamped, with inertia; on touch a sideways drag turns it, a
vertical swipe still scrolls the page and two fingers still zoom it), ←/→ (Shift+↑/↓ for pitch,
Home) when the view got its focus from the keyboard, **Explode / Assemble** (swings to the nearest drawing view
and takes over from the scroll until you scroll on; while paused it stays), **Reset view**, and
**Pause motion** (the same switch as the HUD's, wide screens only). The light is low-key and
neutral with the CAD's real colours (aluminium, VEX red sprockets, black motors); the depth ramp
only tints the silhouette's rim. It's a CAD model: the caption says the polycarbonate and the
chains aren't modelled.

**When it loads** (`stages.js`, section 3c):

| Situation | What you get |
|---|---|
| no JS | the still, its box, the parts list and the caption |
| reduced motion, Save-Data, `navigator.deviceMemory` ≤ 2, no WebGL 2, only a software WebGL (SwiftShader, WARP, llvmpipe: `failIfMajorPerformanceCaveat`, and the renderer's own name, since some browsers hand out SwiftShader without the caveat) or no import maps | the still + **Explode** (swaps in the exploded still with its callouts, and lights the parts list); no scroll-driven motion, nothing 3D downloads |
| phones and touch screens (< 700px, coarse pointer or no hover), or motion paused | the still + **Load 3D model · 2.1 MB**; on a press the view is pinned (full screen between the bars), the 3D loads, sweeps in, eases closer to fill the upright screen (never closer than 12 px from its edges), and touch-drag and the scroll-driven act work; turning the phone mid-act keeps you at the same point of the act |
| a desktop with motion | pinned from the start; when the opener is within ~1.5 screens a WebGL 2 context is probed (and then handed to three.js: one context, not two), three.js, `robot3d.js` and the model download side by side (`modulepreload`); the 3D takes over from the still |
| the reader stops well into the pin (18%), with the opener filling the screen, before the 3D is ready | once the scroll has stopped, the opener unpins in place (no scrolling past a still that isn't doing anything); the 3D comes in at rest, and the opener pins again once it is off screen below, or where you next stop with it filling the screen |
| a jump past the opener (a nav link, a deep link such as `/#contact`, End, Page Down, a restored scroll) | the pin never changes while the page is scrolling (an instant scroll would cancel the smooth one on its way), so the jump lands where it was going; a jump that only passes the opener doesn't start the download: where it lands decides |
| a pin change (a failure, Pause motion, a re-pin) while you're past the opener, or where what follows it is on screen | it waits: whatever follows the pinned part would move by the track's length, and even a move the scroll makes up for counts as a layout shift. It happens where you next stop with the pinned part filling the screen, or with the opener still below it |
| WebGL context lost | the still shows at once; if the context comes back within 3 s the 3D resumes, otherwise back to the still (+ Explode), unpinned without moving what you're looking at, focus moved to Explode |
| a load error or a shader that won't compile | the still (+ Explode), unpinned in place |
| a reload later in the same visit | the 3D isn't tried again where it failed (sessionStorage `rbw-r3d`); a page left unpinned comes back unpinned, so the browser restores the scroll into the same layout, and pins again as after a late arrival (once the 3D is in and the opener off screen) |
| Pause motion (or reduced motion turned on) while it's live, or while it loads | it rests on its opening view and only moves when you move it; the opener unpins in place (and pins again on resume, still solid: it doesn't dissolve back into the point cloud in front of you); reduced motion turned on during the load keeps the still |

2.1 MB is what crosses the wire on GitHub Pages (the model is 1.9 MB; three.js is 0.69 MB, about
0.17 MB gzipped). To test the 3D on a software renderer (headless Chrome), add `?r3d=force` to the
URL.

**Performance.** It renders only when something changed (scroll, drag, a key, an easing still
settling), never off screen or in a background tab, at a DPR capped at 1.75 (1.5 on phones; it
follows a move to a screen of another density), with MSAA only below 1.5× (above that the
pixels are small enough). The overlay (box, tags, scan line, callouts, feature tracks, assembly
lines) is plain DOM and SVG moved by transforms; nothing is allocated per frame but its path
strings. Booting yields to the page between its slices (surface sampling in 8 ms slices, the
framing table, the shaders compiled in parallel where the driver can, the geometry uploaded a
few groups at a time, off screen and invisible); `teardown()` disposes everything. 397k
triangles, ~89 draw calls.

**Vendored files** (three.js r170, MIT, `assets/vendor/three/LICENSE`), wired by the
`<script type="importmap">` in `<head>` (`three` and `three/addons/`):
`build/three.module.min.js`, `examples/jsm/loaders/GLTFLoader.js`,
`examples/jsm/utils/BufferGeometryUtils.js` (GLTFLoader needs it), `examples/jsm/libs/meshopt_decoder.module.js`
(the model uses EXT_meshopt_compression, KHR_mesh_quantization and EXT_mesh_gpu_instancing). To
update three.js, replace these files with the same paths from the new release (and check the
shader chunk names `robot3d.js` patches: `worldpos_vertex`, `clipping_planes_fragment`,
`emissivemap_fragment`, `opaque_fragment`).

**Swap in another robot** (another season's):

1. Drop its GLB in `assets/robot/` (Y-up, metres, centred on x/z with its lowest point at y = 0,
   front facing −z; the scene root's children are its groups, named `g00`, `g01`, … with each
   group's translation at its bbox centre).
2. Add one entry to `ROBOTS` at the top of `robot3d.js`: its tag (and the second line after the
   act, facts only), the opening view (az/el, also the still's), how far the scroll turns it, the
   exploded still's view (exAz/exEl), its exploded drawing (`explode`: each group's move in metres
   and its wave; groups left out stay put), its wheel groups and radius (they roll when it drives
   off), its labels (`["intake", ["g12"]]`: a word and the groups it may anchor to, optionally with
   where on the group the ring sits) and its material colours (`palette`, by material name).
   Keep each label's word the same as its `data-part` in the parts list.
3. In `index.html`, point the figure at it: `data-r3d` (the entry's key), `data-glb` and
   `data-bytes` (the file's size), and swap the stills, their alt text, the box's
   `--x0/--y0/--x1/--y1`, the exploded callouts (`.r3d-slabs`), the parts list and the caption.
4. Render its stills with `robot3d.js` (so they match the live view): serve the site, open a blank
   page on it with the importmap, and run, with the figure markup present:

   ```js
   const { start } = await import("./robot3d.js");
   const buf = await (await fetch("assets/robot/robot-xx.glb")).arrayBuffer();
   const c = await start(fig, buf, { still: () => true, status() {}, exploded() {}, fail() {}, pinEls: () => null, debug: true });
   c.debug.pose({ scan: 1, k: 0, az: 250, el: 6, lock: 0 }); c.debug.grab();   // the 3/4 still (PNG data URL)
   c.debug.pose({ scan: 1, k: 1, az: 215, el: 20, lock: 0 }); c.debug.grab();  // the exploded still
   c.debug.box(); c.debug.labels();  // where the box and the callouts go, in fractions of the frame
   ```

   with the view sized to the still's frame (aspect 0.8, e.g. 2080 × 2600, then scaled down to
   1040 × 1300 and 640 × 800; read the box and callouts with the view at 520 × 650, about the
   size the page shows it, since the tags are 11px whatever the size).

## How to edit

* **Text:** edit `index.html` directly. Each section starts with a banner comment.
* **A role, honor or result:** copy a whole `<li>…</li>` in its list and edit it. An honor's or a
  role's class tag is the `<span class="cls">` at the start of its line (a role's sits with its
  dates in `.xp-k`). Keep a role to one or two lines on a wide screen (check 1280 and 390: three
  is the most a 390px phone should get). A current role's end date is
  `<span class="is-now">now</span>`.
* **A role's side figure:** give the `<li>` `class="has-fig"` and end it with a
  `<figure class="frame xp-fig" style="--ar: 1.333">` (copy the Startup School one). Both figures
  are 4:3 frames of one height; a picture of another shape sits in the middle of its frame on a
  dark ground (as the robot does, `.xp-robot`). A photo with Richard's face gets `data-no-fx`.
  From 900px every role, with a figure or without, sets its role, lines and chips one under the
  other in columns 3–9 (its dates in 1–2), and a figure at the top of 10–12, level with the role;
  so the roles, the lines and the chips each start on one edge all the way down, and Leadership's
  lines on it too.
* **Leadership:** the lighter list after the roles (`.xp-lead`): dates, then one sentence (`.xl`):
  the role in bold running on into its line after an em dash, lowercase (`— a nonprofit …`).
* **A project screenshot:** a `<figure class="frame ui-shot">` (the dark mat and the corner marks
  come with the class) whose picture is a link. Put a WebP and a JPEG at 1200 and 640 wide in
  `assets/projects/` (strip metadata), set `width`/`height` to the 1200 file's size, keep
  `loading="lazy"`, and caption it with what it shows. Light UIs are shown as they are, never dimmed.
  If a wide UI gets too small to read on a phone, add a closer crop as `<source media>` lines in its
  `<picture>` (WebP, then JPEG, each with its own `width`/`height`), as Toph's does
  (`toph-dashboard-m`, 692×598, the source's own pixels: no upscaling).
* **Stars:** `data-stars` holds the fallback (83, Oct 2026); `site.js` fetches the live count
  from GitHub (cached for the session).
* **Email:** the address lives once, split as `data-user` + `data-domain` on the contact link.
  `site.js` builds the `mailto:` for every `[data-mail]` link. It never appears in full in any file.
  Without JS those links go to GitHub, with a "via GitHub" hint.
* **BibTeX:** built from the visible fields marked `data-bib="title|author|booktitle|year|pages"`
  plus `data-bib-key` on the paper's `<li>`, so each fact is written only once.
* **Team videos:** each thumbnail is a link to YouTube. `data-yt="<11-char id>"` lets a click
  swap in the youtube-nocookie player. Leave it out if a video can't be embedded.
* **A chapter title (`--r`):** its size comes from the measure and `--r`, the word's width in ems,
  up to a cap (`--cap`: 150px on phones, where the title card frames it; 240px on tablets,
  700–999px, 300px for Honors; 250–420px on wide screens).
  `site.js` ("fitTitles") measures every title once Archivo has loaded and sets `--r` on it, so a
  new word fits its columns by itself. The values in `style.css` (`#honors-h { --r: 3.05 }` …) are only
  the first-frame / no-JS fallback. To regenerate them after changing a word, open the page, wait
  for the fonts, and run in the console:
  `document.querySelectorAll('.giant').forEach(h => console.log('#' + h.id, h.style.getPropertyValue('--r')))`
  then paste the numbers into section 4 of `style.css`.
* **Results card (Contact):** built only from the robotics record, claiming nothing it doesn't
  (its "7 tournament wins" are the record's 7 Tournament Champions titles). Its headline is the
  biggest result, "World finalists, 2nd of 20,000+ teams, VEX Worlds 2025" (the owner's framing,
  as on his resume and everywhere else on the page). If a total changes, change it in both
  places (the `.totals` line in ROBOTICS and `.rcard` in CONTACT).

### Add a photo (with or without labels)

Copy a `<li>` in `.strip-photos`. Put the full file in `assets/photos/` and a ~640px copy in
`assets/photos/small/`, set `width`/`height` to the full file's pixel size, and `--ar` on the
`<li>` to width ÷ height. The strip is justified rows: photos in a row share a height and nothing
is cropped, so labels stay on their objects. It is sized for its four frames (two rows of two
below 900px, one row from 900px, each filling the measure; style.css section 11): with a fifth,
check the rows, and if a short last row would stretch, add back the filler the comment there
gives. Number the meta strip (`F05 · name.jpg`). If the
photo shows Richard's face, add `data-no-fx` to its `<figure>` (no lens, no `af` focus hunt).

Labels are plain spans, positioned in percent of the photo:

```html
<span class="bxs" aria-hidden="true">
  <span class="bx" style="--x:29.5%;--y:23%;--w:14.5%;--h:20%"><b>robot</b></span>
</span>
```

`--x/--y` give the top-left corner, `--w/--h` the size (they draw in rose: a human label). The tag's preferred spot is above-left;
`<b class="u">` puts it inside the top edge, `class="r"` flush right, `class="d"` under the box.
`site.js` then moves any tag that would leave the frame or hit another tag, and drops the tag (not
the box) on an object narrower than its tag. **House rules: label objects only** (robot, field,
goal, banner, screen, trophy, can, text). **Never put a box on a person or a face. Never add a
confidence number:** these are hand-placed. Keep labels to a few key frames; most photos are clean.

### Add an auton clip

Copy a `<figure class="frame clip">`. Use an H.264 MP4 with no audio, and a poster JPG of its
first frame in `assets/videos/posters/`. Set `width`/`height` on both the `<img>` and the
`<video>` to the clip's real pixel size. Keep `muted loop playsinline preload="none" controls`.
The button's accessible name comes from `data-name` ("Pause dome-2026 clip"), so keep that unique.
Add `af` to the figure's class for the autofocus-hunt entrance (keep that for key frames only).

### The tracked drone clip

The "can" and "drone" boxes over `drone-2026.mp4` come from the `TRACKS` table at the top of
section 5 in `site.js` (keyed by the figure's `data-name`): one box every 0.1 s of video
(`x0,y0,x1,y1` in thousandths of the frame, `-` when the object is out of view). The data was made
offline by colour-tracking the clip (red cans, the blue quadcopter), then smoothed. `site.js`
interpolates between samples and draws the boxes only while the clip plays. The in-frame note
(`.src-note`) says they come from an offline colour tracker, not the drone's YOLO (on phones it is
shorter and sits bottom left, the corner the boxes never reach). If you replace
the clip, delete its `TRACKS` entry and the note.

### The auton pair

"Same auton, both sides" frames the two clips in alliance colours (`.side-red` / `.side-blue` on
the `<li>`), names the side in the meta strip, and puts a timeline under each (`.atimer`: a bar
and the elapsed time, set by `site.js` as the clip plays). A dashed mirror line runs down the seam.

## How the art and animation work

**The hero feed (`feed.js`).** The name is real text, painted in the first frame (with the facts
and the links) in a metric-matched condensed stand-in: Helvetica Neue Condensed Black, Impact,
Arial Narrow or Roboto Condensed, whichever the device has, each scaled to set the name within a
few % of Archivo's width, with Archivo's baseline (style.css §1). Line heights are in em, so the
swap to Archivo moves nothing. Nothing in the first screen waits for anything.
The facts under the name are a camera's parameter readout, four lines: study, now, papers and
record (the #1 Autonomous Skills rank and the World Finalist result, 2nd of 20,000+ teams,
linking to Honors). From 1100px they take six of the info row's twelve columns and the links the
last two, so from 1280px study, now and papers each set on one line and the record on two, broken
at its "·" (in the stand-in font as in Archivo), and the row ends inside a 1280×800 first screen
(at y = 788). The record line's second half ("World Finalist, 2nd of 20,000+ teams") is kept
whole; only under 390px, where it is wider than its column, it may break once, after "Finalist,".
On short phones (520px wide or less, 760px tall or less) the decorative "tap the frame" hint is
left out, so EMAIL ME stays above the bottom nav at 360×740.

1. *The floor (the resting signature).* Behind the name, the robot camera's view of a VEX field
   floor as a sparse depth image: a pinhole camera 16 in above the floor; fixed rows of depth
   samples (drawn once), and the 24-inch tile seams as dotted lines in perspective, tinted by
   distance on the inferno ramp (amber near, violet far) with one vertical gradient. The camera
   rolls forward at 10 in/s and sways a little, so the seams drift toward it; a few tile corners
   are tracked, with a ring and their optical flow over the last 0.4 s. Two dashed strokes and a
   handful of rings a frame, at most 30 frames a second, only while the hero is on screen.
   "Pause motion" freezes it; reduced motion gets one still frame. It fades out above the info row,
   so nothing moves behind reading text.
2. *Features.* Each letter is drawn into an offscreen canvas (cropped to the text's own box)
   exactly where the browser put it (one `Range` per character). A **Shi–Tomasi corner detector**
   finds "good features to track": Sobel gradients, a 5×5 structure tensor, the minimum
   eigenvalue, non-maximum suppression and a minimum spacing. It runs after first paint
   (`requestIdleCallback`), with fewer features on phones.
3. *The knock.* Once the typeface has landed the camera comes up knocked and calibrates: the lime
   outline is the raw, misaligned view, flow lines join each raw feature to where it belongs, and
   a damped spring (damping ratio 0.8) is the "bias correction" (his ICCAS 2025 paper). Press on
   the name and drag to grab the camera; let go to fling it, or click for a sharp knock (a tap on
   phones). The pose readout (roll, shift, bias) shows only while knocked, on wide screens.
4. *Locked means clean.* Status has hysteresis ("Calibrating" above 0.08 error, "Locked" only after
   120 ms below 0.03). 0.4 s after the lock the feature rings fade off the name; a resting mouse
   lights only the features near the reticle.
5. *The loop* runs only while something moves; a resting mouse lets it sleep after 150 ms. It also
   stops off screen and in background tabs.

**Calibration (`stages.js`, 01) — around the portrait, never on it.** An SVG overlay covers the
photo plus a margin: a rose graticule (masked out of the photo and its label strip, so it only
draws in the margin) and the frame's own four edges in lime, both drawn through a radial lens
model (a point at radius r from the centre lands at r·(1 + k·r²)/(1 + k); k = −0.2 bows the lines
outward and keeps the corners put). When a third of the portrait is in view, the checkerboard's
54 inner corners are found one by one (an SVG polyline joins them in detection order), then k
eases to 0: the lines straighten, the edges hand over to four registration marks, and the
graticule settles faint. Nothing is drawn before the run starts; if the portrait leaves the
screen (or is jumped past) before it's done, it is finished at once. The bio beside it is never
dimmed.

**Detection (02).** The detector switches on at Honors: the title's box arrives as a loose dashed
guess and snaps on, then its `text` tag, then the corner features (`feed.js`'s Shi–Tomasi
detector) light on the word; each honor's class tag lands just after its line.

**Tracking (03).** One exponentially smoothed copy of the scroll position is the "tracker"; each
tracked box is drawn at it, so it trails its word by the tracker's lag (capped at 80px) and settles
when you stop. The chapter title's box is always on; a project name's box shows on hover or focus.

**Classification (04).** Experience's title is set right with its lede on the left, and under it
the classifier's label set (research, engineering, startup, robotics, leadership) lands one tag at a
time; each role's own class tag lands just after its line. The two side figures are 4:3 frames of
one height (the photo whole; the robot's transparent render standing on the openers' depth glow,
its floor's seams fading out at the picture's sides). From 900px every role is built the same
way: the dates in columns 1–2, the role, its lines and its chips stacked in 3–9, a figure (if any)
in 10–12, so each starts on one edge all the way down. On wide screens the opener is compact (as
Honors'), so a nav jump shows the first two roles whole. The robot's caption
("Up close in Robotics") and its alt text promise only what every mode has: no-JS, reduced motion
and Save-Data visitors get the still, not the 3D.

**The project screenshots.** RW-Template's simulator and Toph's dashboard are light UIs, so each
sits on a dark mat inside its frame, under four lime viewfinder corner marks, with a soft shadow
under the picture; the picture itself is never dimmed or tinted. On hover the mat's edge lights and
the marks close in.

**Robustness (05).** The title arrives slightly soft, with a colour channel misregistered, glare at
its top edge and sensor noise; it clears within about 0.9 s of the reveal (CSS only, no pointer
needed) and stays readable in every frame. The conditions viewer degrades one frame from a team
practice run four ways with CSS filters (its caption and readout say plainly that it is an
illustration, not the papers' camera footage or data); `--c` (0 raw → 1 corrected) moves the dashed estimate onto the rose
ground-truth box. It's shown at its native 960px with a readout panel.

**Localization (06).** The title: ~300 particles start scattered over its area and converge on
points sampled inside its own letters, which solidify as they do. The points are prepared just
before the title nears the screen, but the word only goes faint when the run starts (the moment
any of it is on screen, with its reveal), and the run always plays to its end: the resting state
is always the solid word. The MCL panel is a real particle
filter on a simulated robot, on a top-down **Push Back** field (the 2025–26 game, Worlds 2026): 6 × 6
foam tiles of 24 in inside an aluminium perimeter, the red alliance wall on the left and blue on
the right, their park zones at the middle of those walls with two loaders each, the two long
goals in line with the loaders, the two centre goals crossed in the middle. The robot drives a
loop round the centre goals by **pure pursuit** (16 in lookahead), so when it is moved it drives
itself back. It knows its heading (IMU), has noisy odometry and four 80 in distance sensors that
read the walls. Particles move with the odometry, are weighted by how well their expected readings
match, and are resampled (systematic). The measurement noise anneals and the likelihood is
tempered, so the first convergence takes about 2 s; then the robot is **kidnapped once on its own**
(the readings stop making sense, random guesses are injected — augmented MCL — and it relocalizes),
and it holds. "Kidnap the robot", dragging the robot (mouse) or tapping the field (touch) moves it
again. "Converged" means a tight cloud *on the robot* (the sim knows the truth). It's labelled as
an illustration of a method RW-Template uses, not robot data.

**Detection everywhere else.** Key photos (`.af`) arrive out of focus and the autofocus hunts;
other frames fade up. Hover a photo with a mouse for a **false-colour** lens (luminance through the
inferno ramp: the SVG filter `#heat`); never on the portrait or a `data-no-fx` photo.

**Reveals.** Not fades: a rolling-shutter readout. Each block is read out top to bottom (a clip
that opens downward) as it rises 14px, so any text you can see is at full contrast in every frame.
A waiting block is clipped down to its top edge, and Chrome's IntersectionObserver measures that
clipped edge, so a block whose top is already above the screen (a jump or a restored scroll into
the middle of a tall one, such as RW-Template's) would never be read out: `site.js` also checks,
on scroll, any block still waiting whose own box is on screen. The same clip hides a lazy picture
inside a waiting block from the browser's own lazy loading (it would only be asked for once the
readout had started, so the readout would open on an empty mat): the same scroll check asks for
such a picture itself once its frame is within 1200px of the screen, measured on the waiting
block's own box (`getBoundingClientRect` ignores the clip) cut to the picture's own box, which is
about where the browser's lazy loading would have asked.

**HUD and the end.** The clock counts this visit (1 Hz). It holds in background tabs and while
motion is off, and never runs with reduced motion. When the footer comes into view the feed stops:
the REC light goes out, the clock and stage read "stopped", the stack reads complete, and the name
reprised in the footer loses its feature points one by one. The "Stopped at 00:12" line has its
width reserved from the first paint, so it never moves the footer.

## How to turn it down

* **Pause motion:** the HUD button ("Pause motion", then "Resume motion"; pause bars, then a play
  triangle; "Pause" / "Resume" alone on phones under 381px) pauses everything that moves: the hero
  floor and knock, reveals, the stage acts (shown finished), the MCL simulation, the viewer's
  correction, every autoplaying clip, the 3D robot (it rests on its opening view and the opener
  unpins; it still turns when you drag it, and Explode stays exploded) and the clock. Resuming
  restarts the clips it paused. It's remembered for the visit. Its accessible name is its visible label (no `aria-pressed`).
* **`prefers-reduced-motion`:** a still, finished composition. The hero is drawn once, locked, with
  one still frame of the floor; the portrait's surround is already calibrated; the MCL panel shows
  one converged frame (Kidnap still works, instantly); clips wait for their play buttons; the clock
  doesn't run; the phone title cards have no scan line; the 3D robot never loads: its still and
  an Explode button that swaps in the exploded still. The motion button is hidden.
* **No JS:** all content is visible. Clips are plain `<video controls>` over their posters, the
  viewer rests corrected, the MCL panel is hidden, the robot is its still (with its box, the parts
  list and the caption; the controls are hidden), and the email link goes to GitHub.
* **Failsafe:** hidden "before" states exist only under `html.anim` (set in `<head>`), and the
  stage acts' only under `html.anim.stg` (set by `stages.js`). A script error, or `site.js` not
  starting within 1.5 s, removes `anim`. If `site.js` doesn't run, `feed.js` and `stages.js` hold
  still (finished states, one still frame of the floor) and the Motion button stays hidden (it
  shows only under `html.motion-ok`, set by `site.js`); if `stages.js` doesn't run, the MCL panel
  stays hidden (it shows only under `html.stg`).
* **Dial it down further:** to keep the robot a still everywhere, delete section 3c of `stages.js`
  (the boot); to drop it, delete the `<figure class="r3d">` (and the `.r3d-track` wrapper can stay).
  Delete `<script src="stages.js">` to keep the stack but drop the acts;
  delete `feed.js` to drop the hero art (floor and knock); in `style.css` section 14, delete the
  `af-hunt` line for no focus pulls; in section 16, delete the "one full-bleed beat" block to give
  phones the plain openers.
* **Print:** `style.css` section 17. White paper, no HUD, rail, canvases, overlays or clip
  controls, every reveal shown (with the class tags, in grey, and the key photos in focus), clips
  as their posters, the robot as its still on a small dark ground (light aluminium vanishes on
  white), external links print their address.

## Performance notes

* No `.mp4` (and no poster) loads at page load. Clips use `preload="none"` until they near the
  viewport; posters are lazy `<img>`s.
* The project screenshots and Experience's two side figures are lazy too, with `width`/`height`
  set and `srcset`/`sizes`, so a screen gets the 640 or the 1200 file it needs (the screenshots:
  WebP 15–35 KB, JPEG fallback; Toph's closer crop 18 KB; the Startup School thumbnail 44 KB; the
  robot's 400px WebP). Inside a block that hasn't been read out yet the browser can't see them, so
  `site.js` asks for them 1200px ahead (see "Reveals"). Checked in headless Chrome (Oct 26, 2026,
  scrolling in 100px steps, down and back up): each, the Dome photo, the gallery strip, the project
  screenshots, the Experience figures and the clip posters, is requested 1,050–1,210px before its
  frame comes on screen, at 1280×800 and 390×844, and the first load is unchanged (the page, CSS, 3 scripts, the font CSS and files, the GitHub star
  count, me.jpg).
* Every loop runs on `requestAnimationFrame` only while it has something to do and is visible:
  the hero knock sleeps 150 ms after the mouse rests; the hero floor (30 fps cap, DPR ≤ 1.5) runs
  only while the hero is on screen; the calibration (~2 s), title particles (~2 s) and MCL (about
  7 s: converge, kidnap, relocalize, hold) stop on their own; the tracker stops when the scroll
  does. DPR is capped at 2 and phones get fewer features and particles.
* First paint does no heavy work: the corner detection and the annotation-tag layout run in idle
  time after it.
* Measured (headless Chrome, Oct 2026): CLS 0.0008 at 1280×800, 0.0004 at 768×1024, 0 at 390×844;
  main-thread CPU about 1.3% idle at the top (floor running), 0% with motion paused, about 4% while
  scrolling; 10 network requests at load (page, CSS, 3 scripts, font CSS + 2 font files, the GitHub
  star count, me.jpg), no video.
* The 3D robot (06): nothing 3D loads with the page (still the same 10 network requests). three.js,
  `robot3d.js` and the model (2.1 MB over the wire) are requested together when the opener is
  ~1.3–1.5 screens away; on phones only after "Load 3D model". One WebGL context is made (the
  probe's, handed to three.js). Measured in headless Chrome on SwiftShader with `?r3d=force`
  (software GL, which real visitors don't get: read these as relative): scrubbing the whole act
  (51 steps, 13 s) drew 59 frames at ~89 draw calls, with ~0.6 ms of script per frame; SwiftShader
  itself takes ~220 ms a frame (vertex-bound on 397k triangles). At rest on the pinned opener, off
  screen and at the top of the page it draws nothing (0 frames in 3 s); resting on the exploded
  hold the main thread is 0.5% busy. Booting, the site's own JS runs in slices (surface sampling
  ~40 ms in 8 ms slices, the framing table in six); SwiftShader's context creation (~6 s) and
  extension setup (~3 s) are what a software renderer costs, which is why it gets the still. JS
  heap +3 MB once loaded. CLS 0.0006 at 1280×800 over a full scroll (the HUD nav at load), 0 at
  390×844 including "Load 3D model" (the pin is added during the tap). Every pin change (a deep
  link to `/#results` or `/#contact` with or without the 3D, "Results below", a late arrival,
  Pause, a re-pin after scrolling past) adds nothing at 1280×800, 700–999×800 or 390×844.
* The fallback fonts have `size-adjust` and ascent/descent overrides measured against Archivo
  and Martian Mono, so the font swap causes no layout shift.
* Fonts: 2 Google families, 4 weights (Archivo 400/600/800 from one variable file, Martian Mono
  400), `display=swap`, preconnected.

## Accessibility

One `h1`, then `h2` per section and `h3` inside. Skip link, landmarks (header/nav/main/footer),
visible lime focus rings (on photo links the ring is drawn inside the link, over the picture,
because the frame clips anything outside it), keyboard access to everything (the viewer's buttons and slider, the
Kidnap button, every clip's play/pause). All decoration (canvases, boxes, tags, readouts, the
stack, the HUD clock) is `aria-hidden`, and alt text is kept from the previous site. Nothing
flashes faster than 3 times a second.

* Heading names are clean: the 02 title's "text" tag is an `aria-hidden` span (the heading reads
  "Honors"), and the arrows after links are CSS content with empty alt text (`content: "↗" / ""`).
* Linked pictures are named by their alt text, which ends with where they go: the two project
  screenshots ("… Opens the simulator replays." / "… Opens the live demo.") and the robot's
  thumbnail in Experience ("… Opens the robot in Robotics."). The class tags and the label set
  are `aria-hidden`.
* Each "copy bibtex" button has its own name ("Copy BibTeX for the IEEE ICCAS 2025 paper").
* `scroll-padding-top` clears the HUD and `scroll-padding-bottom` clears the phone nav, so keyboard
  focus never lands under a fixed bar.
* Reading text is 16px and up; mono labels that carry content (dates, chips, link buttons, field
  names, the About heading, project languages, the Motion button) are 13–14px; 11px is used only
  for `aria-hidden` readouts.
* The HUD mark's name starts with what it shows ("RBW, Richard B. Wang, back to top"), and the
  Motion button's name is its visible label, so voice control ("click Pause motion") works.
* Each project's language is read out ("Language: TypeScript"); its track number is decoration.
* The 3D robot: its canvas and overlay are `aria-hidden`; the still underneath keeps its alt text
  (it describes the robot; once the 3D has it, the still is only transparent, never hidden, so
  the description stays in the accessibility tree), the parts list is real text (it is the exploded view's text
  alternative, lit in step with the callouts) and the figure keeps its caption. Once live, the view
  is focusable (`role="group"`, named "The 1698V robot in 3D: drag it, or use the left and right
  arrow keys, to turn it"); when its focus came from the keyboard (Tab, or Load 3D model pressed
  with a key) ←/→ turn it, Shift+↑/↓ tilt it and Home resets it. A mouse press also focuses it,
  but then the page keeps all its keys until focus leaves it (Home scrolls to the top), and ↑/↓
  always scroll the page. Explode / Assemble, Reset view and Pause motion are real buttons whose
  names are their labels. Nothing traps focus or the scroll: a vertical swipe on the view scrolls
  the page, two fingers zoom it, and the pin is ordinary page scroll. If the 3D fails while the
  view has focus, focus moves to Explode.

## Checks before publishing

- **Widths:** 320, 360, 390, 768, 1024, 1280 and 1440 px: no sideways scrolling anywhere.
- **First screen:** at 390×844 and 1280×800 (and 360×740), the name, all four facts and EMAIL ME /
  github / linkedin are visible in the first frame (throttle the network: the name shows in the
  stand-in font).
- **Nav jumps:** at 1280×800 and 390×844, "Contact" shows the email link without scrolling, also on
  a first visit while the 3D is still downloading and from a deep link (`/#contact`); at 1280×800
  "Honors" shows all six honors; "Results below" (Experience) lands on the results log. A deep link on a
  cold load (`/#papers`, fonts not cached) ends on the stage label: once the fonts and the titles
  are in, `site.js` lands it again if the reader hasn't touched the page. The old `/#now` lands
  on Experience exactly as `/#experience` does: on a fresh load, with JS off, and when the hash
  changes on the page (a typed `#now`, or a link to it).
- **The portrait:** never distorted, never boxed. Jump from the top straight to "Projects", then scroll
  back up slowly: the portrait's surround must already read "rectified".
- **Keyboard:** skip link, nav, every link and button reachable with a visible focus ring, never
  hidden under the top bar or the phone nav.
- **Reduced motion** (System Settings → Accessibility → Display → Reduce motion) and **JS off**
  both look finished; clips show posters (play buttons, or native controls without JS).
- **Pause motion** (HUD button): nothing moves, the CPU goes quiet, the clips pause.
- **Network:** nothing from `assets/videos/*.mp4` loads until you scroll near a clip, and nothing
  3D (`assets/vendor/three/`, `robot3d.js`, `robot-hs.glb`) until the Robotics opener is within
  ~1.5 screens (on phones: until "Load 3D model").
- **3D robot:** at 1280×800 scroll the Robotics opener through (point cloud, scan line, box
  locks, it turns with its tracked features and the depth pass, comes apart into the drawing with
  its 8 callouts and the parts list lit, holds, assembles and re-locks with the second line,
  drives a tile, hands over to the log); drag it, Tab to it and ←/→, Explode / Reset view; Pause
  motion mid-way and during the download (it rests and unpins in place); jump to Robotics from the
  nav (the scan line swaps the still for the 3D on the first scroll); at 1024 and 1440 the robot
  clears the title; at 390×844 the still, Explode, then Load 3D model, then a sideways drag; with
  reduced motion and with WebGL off (`--disable-webgl`) the stills. In headless Chrome add
  `?r3d=force` (its software renderer, SwiftShader, is refused otherwise, by name). After a
  failed load in a tab, clear sessionStorage (`rbw-r3d`) or open a new tab: the visit keeps the
  still.
- **Console:** no errors (also from `file://`, where only the YouTube embeds and the star count
  step back to their fallbacks).
- **Privacy:** no phone number, no school email, no high-school name, no SAT/PSAT, and the email
  address never written out in any file: `grep -rn --exclude=README.md --exclude-dir=vendor "@gmail" .`
  finds nothing (this README is excluded only because the command itself contains the pattern;
  `assets/vendor/` because a third-party author's address is in meshopt_decoder's licence header).
- **Facts:** the robotics totals and the Contact results card agree; the star fallback is
  current; the RW-Template card doesn't claim team adoption numbers (it shows release downloads);
  the World Finals result reads "2nd of 20,000+ teams" everywhere (hero record line, About,
  Honors, the 3D caption and its second tag, the results log, the Contact card: the owner's
  framing, as on his resume), and "823" appears nowhere:
  `grep -rnI --exclude=README.md --exclude-dir=vendor 823 .` finds nothing.
- **Print preview:** white pages, no HUD or canvases.
