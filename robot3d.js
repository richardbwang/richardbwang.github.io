/* ==========================================================================
   richardbwang.github.io — robot3d.js (an ES module; decoration over a still that already reads)

   The 06 opener's centrepiece: the 1698V High Stakes robot, from its Onshape CAD, in WebGL
   (three.js r170, vendored in assets/vendor/three/ and wired by the importmap in index.html).
   stages.js (section 3c) decides whether to load it at all, probes the WebGL context, starts the
   model download, and imports this file only when the Robotics opener is within ~1.5 screens.
   Until it is ready (or if it never is) the still in index.html is the picture.

   1. The robot table: one entry per robot (swap the robot: README, "3D robot"), and the act's
      timeline (fractions of the pinned scroll).
   2. The scene: the robot's 23 groups; a depth point cloud sampled from its surfaces; the field's
      tile seams and a contact shadow under it. Low-key light with real colours (aluminium, VEX
      red, black motors); the hero floor's depth ramp only as a rim on the silhouette, and as the
      false colour of the depth pass. Built in slices, yielding between them, so the page keeps
      scrolling while it boots.
   3. The act, scrubbed by the scroll while the opener is pinned (one full turn in all):
        RECONSTRUCT  pinned, a scan line reads the robot out of its point cloud
        DETECT       a detector box locks on (solid lime tag: machine output, no score)
        INSPECT      it turns, low and lateral to its front right; tracked features with their
                     optical flow ride on it, and the camera switches to depth for a moment
        EXPLODE      an exploded drawing, in three waves; 8 callouts with fixed sides; a hold
        ASSEMBLE     back together on its opening view, re-locked; then it drives a tile forward
                     on the seams as the pin lets go.
      If the 3D arrives while the still is being looked at, the first pinned scroll (or a touch)
      runs one scan-line sweep that swaps the still for the live model under the line.
   4. Hands on: drag to turn it (pitch clamped, with inertia), ←/→ (Shift+↑/↓, Home) when the
      view has keyboard focus, Explode / Assemble and Reset view. Paused, it rests on the still's
      view and only moves when you move it.
   5. Rendering: only when something changed, never off screen or in a background tab; DPR capped
      at 1.75 (1.5 on phones); nothing allocated per frame but the overlay's path strings; a lost
      context gets 3 s to come back before the still takes over; everything is disposed on
      teardown.
   ========================================================================== */
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/addons/libs/meshopt_decoder.module.js";

/* ---------- 1. Robots ----------
   id (the figure's data-r3d) -> what the scene needs. The GLB's scene root holds group nodes
   g00, g01, … whose translation is the group's bbox centre.
   az/el: the opening (and closing) view, which is also the still's (degrees; az 0 looks from
   behind, 180 from the front, the intake side; 270 from its left). turn: how far the scroll turns
   it before it comes apart (the rest of a full turn brings it home). exAz/exEl: the exploded
   still's view, where the Explode button also swings to.
   explode: each group's move at full explode, [x, y, z] in metres, and its wave (0 moves first);
   groups left out (the chassis) are the anchor.
   labels: a word, the groups it may anchor to (the one nearest the camera, picked once when the
   parts come apart) and, optionally, where on that group its ring sits (from its centre, m). palette: the CAD materials' colours, by material name (sRGB). */
const ROBOTS = {
  hs: {
    tag: "Robot · 1698V · High Stakes 2024–25",
    tag2: "World finalist 2025 · 2nd of 20,000+",
    az: 250, el: 6, turn: 255,
    exAz: 215, exEl: 20,
    explode: {
      g00: [-0.12, 0, 0, 1], g01: [0.12, 0, 0, 1],                              /* drive rails: out along x */
      g02: [-0.25, 0, 0, 0], g03: [-0.25, 0, 0, 0], g04: [-0.25, 0, 0, 0],      /* wheel stacks: further, along their axles */
      g05: [0.25, 0, 0, 0], g06: [0.25, 0, 0, 0], g07: [0.25, 0, 0, 0],
      g10: [0, -0.13, 0.02, 1],                                                 /* odometry pod: down, out of the chassis */
      g11: [0, -0.02, -0.21, 1], g12: [0, -0.03, -0.36, 0],                     /* intake: forward and low */
      g13: [0, 0.1, -0.11, 2], g14: [0, 0.1, -0.11, 2],                         /* hook conveyor: forward and up */
      g15: [0, 0.07, 0.07, 2], g16: [0, 0.17, 0.12, 2],                         /* its drive, its top sprockets */
      g17: [-0.08, 0.12, 0, 1], g18: [0.08, 0.12, 0, 1],                        /* lift towers: up and apart */
      g19: [0, 0.21, -0.03, 2], g20: [0, 0.31, -0.06, 1], g21: [0, 0.41, -0.08, 0], /* arm drive, lift arm, tip plates: high */
      g22: [0, -0.01, 0.31, 1],                                                 /* goal clamp: back */
    },
    wheels: ["g02", "g03", "g04", "g05", "g06", "g07"], wheelR: 0.0413,
    labels: [
      ["lift arm", ["g20"]],
      ["lift towers", ["g17", "g18"], [0, 0.11, 0.04]],
      ["hook conveyor", ["g13", "g14"]],
      ["goal clamp", ["g22"]],
      ["intake", ["g12"]],
      ["drivetrain", ["g00", "g01"]],
      ["wheels", ["g04", "g07"]],
      ["odometry pod", ["g10"]],
    ],
    palette: { alu: "#b8bcc2", steel: "#7b8087", red: "#c8202f", black: "#121315", white: "#d4d5d1", blue: "#8fb0c6", gold: "#b8913c", other: "#4f8f66" },
  },
};
/* The still's frame: its aspect (width ÷ height), field of view, how much of the frame the robot
   fills (assembled; exploded), and how far below centre it sits (room for the tag). The live view
   frames the robot exactly like the still at the same pose, so the crossfade doesn't move it
   (stills are rendered with this file: README); where the view has room beyond that frame
   (a phone held upright), it eases in closer once it is live. */
export const FRAME = { aspect: 0.8, fov: 24, fill: 0.9, fillEx: 0.86, bias: -0.02 };
/* The act, in fractions of the pinned scroll. */
const ACT = {
  scan: 0.16,                     /* reconstruct: 0 → 0.16 */
  turn0: 0.2, turn1: 0.42,        /* inspect: the turn, rising a little */
  d0: 0.255, d1: 0.365,           /* the depth pass, mid-turn */
  ex0: 0.42, ex1: 0.56,           /* explode */
  as0: 0.8, as1: 0.9,             /* assemble (the hold is 0.56 → 0.80, drifting `drift`°) */
  home0: 0.8, home1: 0.92,        /* the rest of the turn, back to the opening view */
  roll0: 0.93,                    /* it drives a tile forward as the pin lets go */
  drift: 10,
};
const TILE = 0.6096, FLOOR_R = 1.05;

const D2R = Math.PI / 180;
const clamp01 = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);
const smooth = (a, b, x) => { const t = clamp01((x - a) / (b - a)); return t * t * (3 - 2 * t); };
const inout = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const outc = (t) => 1 - Math.pow(1 - t, 3);
const wrap180 = (a) => ((((a + 180) % 360) + 360) % 360) - 180;
const onScreen = (el) => { const r = el.getBoundingClientRect(); return r.bottom > 0 && r.top < window.innerHeight && r.width > 0; };
const yieldNow = () => new Promise((r) => (window.scheduler && scheduler.yield ? scheduler.yield().then(r) : setTimeout(r, 0)));

/* The depth ramp (inferno, as on the hero floor): amber near, rose, plum, violet far. sRGB. */
const RAMP_GLSL = `
vec3 rbwRamp(float t) {
  vec3 a = vec3(0.988, 0.647, 0.039), b = vec3(0.867, 0.318, 0.227), c = vec3(0.576, 0.149, 0.404), d = vec3(0.259, 0.039, 0.408);
  return t < 0.33 ? mix(a, b, t / 0.33) : t < 0.66 ? mix(b, c, (t - 0.33) / 0.33) : mix(c, d, (t - 0.66) / 0.34);
}`;

/* ---------- 2. The scene ----------
   start(fig, buffer, hooks) -> Promise<controller>. Rejects (having cleaned up) if WebGL, the
   model or a shader fails; stages.js then keeps the still. hooks: still() (motion off?),
   status(text), exploded(bool) (the button's label), fail(reason) (the context is gone for good),
   small (phone), pinEls() -> { track, pin } (what is pinned at this width), gl() -> the probed
   { canvas, gl } (one context, not two), keepOut() -> elements the callouts must not cover,
   eager (loaded by a press: sweep at once). */
export async function start(fig, buffer, hooks) {
  const probe = hooks.gl ? hooks.gl() : null;
  const canvas = probe ? probe.canvas : document.createElement("canvas");
  canvas.className = "r3d-gl";
  canvas.setAttribute("aria-hidden", "true");
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer(probe ? { canvas, context: probe.gl }
      : { canvas, antialias: true, alpha: true, powerPreference: "default", preserveDrawingBuffer: !!hooks.debug });
  } catch (e) {
    throw new Error("webgl");
  }
  /* what teardown undoes: listeners, observers, GPU objects, DOM */
  const R = { dead: false, raf: 0, off: [], gpu: [], dom: [canvas], timers: [] };
  const gl = renderer.getContext();
  R.kill = () => {
    if (R.dead) return;
    R.dead = true;
    cancelAnimationFrame(R.raf);
    R.timers.forEach(clearTimeout);
    R.off.forEach((f) => f());
    R.gpu.forEach((o) => o.dispose());
    renderer.dispose();
    if (!gl.isContextLost()) renderer.forceContextLoss(); /* frees the GPU now (not when GC gets to it) */
    R.dom.forEach((el) => el.remove());
    ["--live", "--still", "--cut"].forEach((p) => fig.style.removeProperty(p));
    fig.classList.remove("is-swept");
  };
  try {
    return await build(fig, buffer, hooks, renderer, canvas, R);
  } catch (e) {
    R.kill();
    throw e;
  }
}

async function build(fig, buffer, hooks, renderer, canvas, R) {
  const cfg = ROBOTS[fig.getAttribute("data-r3d")] || ROBOTS.hs;
  const view = fig.querySelector(".r3d-view");
  const small = !!hooks.small;
  const dprCap = small ? 1.5 : 1.75;
  const on = (t, type, fn, o) => { t.addEventListener(type, fn, o); R.off.push(() => t.removeEventListener(type, fn, o)); };
  let shaderErr = false;
  renderer.debug.onShaderError = () => { shaderErr = true; };
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.toneMappingExposure = 0.8;

  /* --- the model --- */
  const loader = new GLTFLoader();
  loader.setMeshoptDecoder(MeshoptDecoder);
  let gltf;
  try { gltf = await loader.parseAsync(buffer, ""); } catch (e) { throw new Error("model"); }
  if (R.dead) throw new Error("stopped");
  const model = gltf.scene;
  model.traverse((o) => { if (o.isMesh) R.gpu.push(o.geometry); });
  const groups = model.children.filter((o) => /^g\d\d$/.test(o.name));
  const G = groups.length;
  const gi = (n) => groups.findIndex((g) => g.name === n);
  const base = groups.map((g) => g.position.clone());
  const vec = groups.map((g) => { const e = cfg.explode[g.name]; return e ? new THREE.Vector3(e[0], e[1], e[2]) : new THREE.Vector3(); });
  const wave = groups.map((g) => { const e = cfg.explode[g.name]; return e ? e[3] || 0 : 0; });
  const moves = groups.map((g, i) => vec[i].lengthSq() > 0);
  const wheels = (cfg.wheels || []).map(gi).filter((i) => i >= 0);
  const gIndex = new Map(groups.map((g, i) => [g, i]));

  /* Uniforms shared by every robot material (one object each, so setting .value updates all). */
  const U = {
    uScanY: { value: 10 }, uScanOn: { value: 0 }, uRim: { value: 1.0 }, uDepthMix: { value: 0 },
    uDepth: { value: new THREE.Vector2(1, 2) },
  };
  const mats = new Set();
  model.traverse((o) => { if (o.isMesh) { mats.add(o.material); o.frustumCulled = false; } });
  mats.forEach((m) => {
    const c = cfg.palette && cfg.palette[m.name];
    if (c) m.color.set(c);
    m.roughness = m.name === "black" ? 0.5 : 0.55;
    R.gpu.push(m);
    m.onBeforeCompile = (sh) => {
      Object.assign(sh.uniforms, U);
      sh.vertexShader = sh.vertexShader
        .replace("#include <common>", "#include <common>\nvarying float vRbwY;")
        .replace("#include <worldpos_vertex>", `#include <worldpos_vertex>
  { vec4 rw = vec4(transformed, 1.0);
  #ifdef USE_INSTANCING
    rw = instanceMatrix * rw;
  #endif
    vRbwY = (modelMatrix * rw).y; }`);
      sh.fragmentShader = sh.fragmentShader
        .replace("#include <common>", `#include <common>
varying float vRbwY;
uniform float uScanY, uScanOn, uRim, uDepthMix;
uniform vec2 uDepth;${RAMP_GLSL}`)
        /* not yet read out by the scan line: not drawn */
        .replace("#include <clipping_planes_fragment>", `#include <clipping_planes_fragment>
  if (uScanOn > 0.5 && vRbwY < uScanY) discard;`)
        /* the depth-tinted rim, only on the silhouette (a high fresnel power), and the scan
           line's lime edge on the freshly read surfaces */
        .replace("#include <emissivemap_fragment>", `#include <emissivemap_fragment>
  { float f = 1.0 - clamp(dot(normal, normalize(vViewPosition)), 0.0, 1.0);
    float t = clamp((length(vViewPosition) - uDepth.x) / (uDepth.y - uDepth.x), 0.0, 1.0);
    totalEmissiveRadiance += pow(rbwRamp(t), vec3(2.2)) * pow(f, 5.5) * 1.6 * uRim;
    float b = 1.0 - smoothstep(0.0, 0.012, vRbwY - uScanY);
    totalEmissiveRadiance += vec3(0.66, 1.0, 0.04) * b * uScanOn * 2.6; }`)
        /* the depth pass: the robot as the camera's depth image, in the ramp's false colour */
        .replace("#include <opaque_fragment>", `#include <opaque_fragment>
  if (uDepthMix > 0.001) {
    float td = clamp((length(vViewPosition) - uDepth.x) / (uDepth.y - uDepth.x), 0.0, 1.0);
    float nv = clamp(dot(normal, normalize(vViewPosition)), 0.0, 1.0);
    gl_FragColor.rgb = mix(gl_FragColor.rgb, pow(rbwRamp(td), vec3(2.2)) * (0.55 + 0.45 * nv), uDepthMix);
  }`);
    };
    m.customProgramCacheKey = () => "rbw-r3d-2";
  });
  await yieldNow();

  /* --- sample the surfaces: an area-weighted point cloud, each point tagged with its group --- */
  const N = small ? 14000 : 26000;
  const cloud = await sampleSurface(model, gIndex, N, () => R.dead);
  if (R.dead) throw new Error("stopped");
  /* every 6th point is enough to box the robot and keep it framed */
  const DS = Math.ceil(cloud.n / 6);
  const det = new Float32Array(DS * 3), detG = new Uint8Array(DS);
  for (let i = 0, j = 0; j < DS; i += 6, j++) { det[j * 3] = cloud.pos[i * 3]; det[j * 3 + 1] = cloud.pos[i * 3 + 1]; det[j * 3 + 2] = cloud.pos[i * 3 + 2]; detG[j] = cloud.grp[i]; }
  let yMin = Infinity, yMax = -Infinity;
  for (let j = 0; j < DS; j++) { const y = det[j * 3 + 1]; if (y < yMin) yMin = y; if (y > yMax) yMax = y; }

  const scene = new THREE.Scene();
  scene.add(model);

  /* the point cloud: drawn where the scan line hasn't reached yet. Opaque, depth-tested points
     (not additive), so it reads as a depth image: amber near, violet far. */
  const off = Array.from({ length: G + 1 }, () => new THREE.Vector3());
  const pointsVS = `
attribute float aRand; attribute float aGroup; attribute float aFade;
uniform float uPx, uSize, uScanY, uScanOn, uDensity, uFloorR;
uniform vec2 uDepth;
uniform vec3 uOff[${G + 1}];
varying float vT; varying float vBand; varying float vKeep; varying float vFade;
void main() {
  vec3 p = position + uOff[int(aGroup + 0.5)];
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mv;
  float d = -mv.z;
  vT = clamp((d - uDepth.x) / (uDepth.y - uDepth.x), 0.0, 1.0);
  float dy = uScanY - p.y;
  vBand = uScanOn * (1.0 - smoothstep(0.0, 0.03, abs(dy)));
  vKeep = step(aRand, uDensity) * (uScanOn > 0.5 ? step(-0.004, dy) : 1.0);
  float fr = 1.0 - length(p.xz) / max(uFloorR, 0.001);
  vFade = uFloorR > 0.0 ? max(fr, 0.0) * max(fr, 0.0) : aFade;
  gl_PointSize = uSize * uPx / d * (1.0 + 0.7 * vBand);
}`;
  const pointsFS = `
uniform float uAlpha;
varying float vT; varying float vBand; varying float vKeep; varying float vFade;${RAMP_GLSL}
void main() {
  if (vKeep < 0.5 || vFade < 0.004) discard;
  vec2 c = gl_PointCoord - 0.5;
  if (dot(c, c) > 0.25) discard;
  vec3 col = mix(rbwRamp(vT), vec3(0.831, 1.0, 0.227), vBand);
  gl_FragColor = vec4(col * uAlpha * vFade, 1.0);
}`;
  const mkPoints = (size, floor) => {
    const m = new THREE.ShaderMaterial({
      uniforms: {
        uPx: { value: 1 }, uSize: { value: size }, uScanY: U.uScanY, uScanOn: floor ? { value: 0 } : U.uScanOn, uDensity: { value: 1 },
        uDepth: U.uDepth, uOff: { value: off }, uAlpha: { value: floor ? 1 : 0.92 }, uFloorR: { value: floor ? FLOOR_R : 0 },
      },
      vertexShader: pointsVS, fragmentShader: pointsFS,
      transparent: floor, depthWrite: !floor, blending: floor ? THREE.AdditiveBlending : THREE.NormalBlending,
    });
    R.gpu.push(m);
    return m;
  };
  const cloudGeo = new THREE.BufferGeometry();
  cloudGeo.setAttribute("position", new THREE.BufferAttribute(cloud.pos, 3));
  cloudGeo.setAttribute("aRand", new THREE.BufferAttribute(cloud.rnd, 1));
  cloudGeo.setAttribute("aGroup", new THREE.BufferAttribute(cloud.grpF, 1));
  cloudGeo.setAttribute("aFade", new THREE.BufferAttribute(new Float32Array(cloud.n).fill(1), 1));
  R.gpu.push(cloudGeo);
  const cloudMat = mkPoints(small ? 2.6 : 2.1, false);
  const cloudPts = new THREE.Points(cloudGeo, cloudMat);
  cloudPts.frustumCulled = false;
  scene.add(cloudPts);

  /* the floor: the 24-inch tile seams round the robot, dotted, depth-tinted, fading out (the
     same floor as the hero's, seen up close); it slides when the robot drives off */
  const floorGeo = tileSeams(G);
  R.gpu.push(floorGeo);
  const floorMat = mkPoints(small ? 3.8 : 3.3, true);
  const floorPts = new THREE.Points(floorGeo, floorMat);
  floorPts.frustumCulled = false;
  scene.add(floorPts);

  /* a soft contact shadow */
  const shadowMat = new THREE.ShaderMaterial({
    uniforms: { uA: { value: 0.6 } },
    vertexShader: "varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
    fragmentShader: "uniform float uA; varying vec2 vUv; void main() { vec2 c = (vUv - 0.5) * 2.0; float r = length(c); gl_FragColor = vec4(0.0, 0.0, 0.0, (1.0 - smoothstep(0.18, 1.0, r)) * uA); }",
    transparent: true, depthWrite: false,
  });
  const shadowGeo = new THREE.PlaneGeometry(0.62, 0.7);
  R.gpu.push(shadowMat, shadowGeo);
  const shadow = new THREE.Mesh(shadowGeo, shadowMat);
  shadow.rotation.x = -Math.PI / 2; shadow.position.y = 0.0008; shadow.renderOrder = -1;
  scene.add(shadow);

  /* lights: low-key and neutral, on a rig that turns with the camera (every side is lit the same
     way): a key from high front-left, a faint cool fill, and a strong back light for the edges */
  const rig = new THREE.Group();
  const hemi = new THREE.HemisphereLight(0xdfe4ea, 0x141416, 0.32);
  const key = new THREE.DirectionalLight(0xffffff, 2.9); key.position.set(-1.2, 1.6, 1.1);
  const fill = new THREE.DirectionalLight(0xc9d3e0, 0.28); fill.position.set(1.5, 0.3, 0.9);
  const rim = new THREE.DirectionalLight(0xffffff, 2.6); rim.position.set(0.8, 1.0, -1.7);
  [key, fill, rim].forEach((l) => { rig.add(l); l.target = rig; });
  scene.add(hemi, rig);

  const camera = new THREE.PerspectiveCamera(FRAME.fov, FRAME.aspect, 0.02, 30);
  const fitCam = new THREE.PerspectiveCamera(FRAME.fov, FRAME.aspect, 0.02, 30);

  /* --- the exploded drawing: each group's share of k (three waves, outer parts first) --- */
  const V = new THREE.Vector3(), T = new THREE.Vector3(), T2 = new THREE.Vector3(), DIR = new THREE.Vector3();
  const waveK = (k, w) => smooth(w * 0.14, w * 0.14 + 0.72, k);
  function setOffsets(k) {
    for (let i = 0; i < G; i++) off[i].copy(vec[i]).multiplyScalar(moves[i] ? waveK(k, wave[i]) : 0);
    off[G].set(0, 0, 0);
  }
  function boxCentre(target) { /* 3D bbox centre of the det samples at the current offsets */
    let x0 = Infinity, y0 = Infinity, z0 = Infinity, x1 = -Infinity, y1 = -Infinity, z1 = -Infinity;
    for (let j = 0; j < DS; j++) {
      const o = off[detG[j]], x = det[j * 3] + o.x, y = det[j * 3 + 1] + o.y, z = det[j * 3 + 2] + o.z;
      if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; if (z < z0) z0 = z; if (z > z1) z1 = z;
    }
    return target.set((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
  }
  function aim(cam, t, az, el, dist) {
    DIR.set(Math.cos(el * D2R) * Math.sin(az * D2R), Math.sin(el * D2R), Math.cos(el * D2R) * Math.cos(az * D2R));
    cam.position.copy(t).addScaledVector(DIR, dist);
    cam.lookAt(t);
    cam.updateMatrixWorld(true);
  }
  const ext = new Float32Array(4);
  function project(cam, step) { /* NDC extent of the det samples: x0, x1, y0, y1 */
    cam.updateMatrixWorld(true);
    let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
    for (let j = 0; j < DS; j += step) {
      const o = off[detG[j]];
      V.set(det[j * 3] + o.x, det[j * 3 + 1] + o.y, det[j * 3 + 2] + o.z).project(cam);
      if (V.x < x0) x0 = V.x; if (V.x > x1) x1 = V.x; if (V.y < y0) y0 = V.y; if (V.y > y1) y1 = V.y;
    }
    ext[0] = x0; ext[1] = x1; ext[2] = y0; ext[3] = y1;
    return ext;
  }

  /* --- framing: how far the camera stands to fit the robot in the still's frame, every 10°
     round it, at three heights, assembled and exploded; with the half-extents it then has, so a
     taller or wider view can bring it closer. A fixed-point iteration (the extent goes as
     1/distance), 5 steps from the neighbour's answer. --- */
  const ELS = [cfg.el, cfg.exEl, 44];
  const FIT = new Float32Array(2 * 3 * 37 * 3); /* [k][el][az] -> distance, half-width, half-height */
  for (let k = 0; k < 2; k++) {
    setOffsets(k);
    boxCentre(T);
    const lim = k ? FRAME.fillEx : FRAME.fill;
    for (let e = 0; e < 3; e++) {
      let d = 2;
      for (let a = 0; a <= 36; a++) {
        let ex = 1, ey = 1;
        for (let it = 0; it < 6; it++) {
          aim(fitCam, T, a * 10, ELS[e], d);
          const x = project(fitCam, 3);
          ex = (x[1] - x[0]) / 2; ey = (x[3] - x[2]) / 2;
          if (it < 5) d *= Math.max(ex, ey) / lim;
        }
        const o = ((k * 3 + e) * 37 + a) * 3;
        FIT[o] = d; FIT[o + 1] = ex; FIT[o + 2] = ey;
      }
      await yieldNow();
    }
  }
  if (R.dead) throw new Error("stopped");
  const centreK = [new THREE.Vector3(), new THREE.Vector3()];
  setOffsets(0); boxCentre(centreK[0]); setOffsets(1); boxCentre(centreK[1]); setOffsets(0);
  const FD = { d: 2, ex: 1, ey: 1 };
  function fitAt(az, el, k) {
    const a = ((az % 360) + 360) % 360, i = Math.min(35, Math.floor(a / 10)), f = a / 10 - i;
    const ec = Math.max(ELS[0], Math.min(ELS[2], el)), e = ec < ELS[1] ? 0 : 1, fe = (ec - ELS[e]) / (ELS[e + 1] - ELS[e]);
    FD.d = FD.ex = FD.ey = 0;
    for (let c = 0; c < 3; c++) {
      let v = 0;
      for (let kk = 0; kk < 2; kk++) {
        const wk = kk ? k : 1 - k;
        for (let ee = 0; ee < 2; ee++) {
          const we = ee ? fe : 1 - fe, o = ((kk * 3 + e + ee) * 37 + i) * 3 + c;
          v += wk * we * (FIT[o] + (FIT[o + 3] - FIT[o]) * f);
        }
      }
      if (c === 0) FD.d = v; else if (c === 1) FD.ex = v; else FD.ey = v;
    }
    return FD;
  }

  /* --- the overlay, all DOM (cheap to composite; nothing to repaint when it doesn't move): the
     detector box and its tags, the scan line (a hairline across the view, with ticks at the
     frame's edges), and one SVG for the assembly lines, the tracked features and the callouts'
     rings and leaders --- */
  const SVGNS = "http://www.w3.org/2000/svg";
  const tags = document.createElement("div");
  tags.className = "r3d-tags"; tags.setAttribute("aria-hidden", "true");
  R.dom.push(tags);
  const lines = document.createElementNS(SVGNS, "svg");
  lines.setAttribute("class", "r3d-lines");
  tags.appendChild(lines);
  const mkPath = (cls) => { const p = document.createElementNS(SVGNS, "path"); p.setAttribute("class", cls); lines.appendChild(p); return p; };
  const asmPath = mkPath("r3d-asm"), kpTrail = mkPath("r3d-kpt"), kpRing = mkPath("r3d-kpr");
  const box = document.createElement("i");
  box.className = "r3d-box";
  tags.appendChild(box);
  const scanLine = document.createElement("i");
  scanLine.className = "r3d-scanline";
  tags.appendChild(scanLine);
  const ticks = [0, 1].map(() => { const t = document.createElement("i"); t.className = "r3d-tick"; tags.appendChild(t); return t; });
  const detTag = document.createElement("b");
  detTag.className = "r3d-dtag"; detTag.textContent = cfg.tag;
  tags.appendChild(detTag);
  const detTag2 = document.createElement("b");
  detTag2.className = "r3d-dtag r3d-dtag2"; detTag2.textContent = cfg.tag2 || "";
  tags.appendChild(detTag2);
  const partEls = Array.from(fig.querySelectorAll("[data-part]"));
  const labels = cfg.labels.map(([text, names, at]) => {
    const el = document.createElement("span");
    el.className = "r3d-tag"; el.textContent = text;
    tags.appendChild(el);
    const path = document.createElementNS(SVGNS, "path"), ring = document.createElementNS(SVGNS, "circle");
    ring.setAttribute("r", "4.5");
    lines.appendChild(path); lines.appendChild(ring);
    return {
      el, path, ring, li: partEls.find((p) => p.getAttribute("data-part") === text) || null, on: false,
      idx: names.map(gi).filter((i) => i >= 0), ao: new THREE.Vector3().fromArray(at || [0, 0, 0]), at: -1, was: -1, side: 1, a: 0,
      x: 0, y: 0, w: 0, h: 0, lx: 0, ly: 0, tx: 0, ty: 0, fx: 0, fy: 0, fpx: 0, fpy: 0, flip: 0,
      px: NaN, py: NaN, pa: -1, la: -1, d: "", rc: "", ord: 0, ny: 0,
    };
  }).filter((l) => l.idx.length);
  view.appendChild(canvas);
  view.appendChild(tags);

  /* tracked features: 24 points spread over the robot's outside (farthest-point sampling, from
     the top down), drawn as the hero's feature rings with their optical flow over the last 0.4 s
     while it turns */
  const KP = 24, KM = 16;
  const kpJ = new Int32Array(KP);
  {
    const cx = (centreK[0].x), cz = centreK[0].z, cand = [];
    for (let j = 0; j < DS; j++) { const x = det[j * 3] - cx, z = det[j * 3 + 2] - cz; if (Math.hypot(x, z) > 0.13 || det[j * 3 + 1] > 0.46) cand.push(j); }
    const dmin = new Float32Array(cand.length).fill(1e9);
    let cur = 0;
    for (let c = 1; c < cand.length; c++) if (det[cand[c] * 3 + 1] > det[cand[cur] * 3 + 1]) cur = c;
    for (let k = 0; k < KP; k++) {
      const j = cand[cur]; kpJ[k] = j;
      let best = 0;
      for (let c = 0; c < cand.length; c++) {
        const q = cand[c], dx = det[q * 3] - det[j * 3], dy = det[q * 3 + 1] - det[j * 3 + 1], dz = det[q * 3 + 2] - det[j * 3 + 2];
        const dd = dx * dx + dy * dy + dz * dz;
        if (dd < dmin[c]) dmin[c] = dd;
        if (dmin[c] > dmin[best]) best = c;
      }
      cur = best;
    }
  }
  const kpXY = new Float32Array(KP * KM * 2), kpVis = new Uint8Array(KP * KM), kpTime = new Float64Array(KM);
  let kpHead = 0, kpCount = 0;

  /* --- state --- */
  const S = {
    w: 1, h: 1, dpr: 1, dprRaw: 1, fx: 0, fy: 0, fw: 1, fh: 1, /* view size; the still's frame inside it */
    q: 0, p: 0, pinned: false, scrolled: false,     /* scroll: entering (0..1), through the pin (0..1) */
    scan: 1, dens: 1, k: 0, az: cfg.az, el: cfg.el, zoom: 1, depth: 0, roll: 0, /* what is drawn (eased) */
    yawOff: 0, pitchOff: 0, yawV: 0,                /* hands on: drag offsets, inertia */
    yawGoal: null, pitchGoal: null,                 /* keyboard / reset tweens */
    ovK: null, ovAt: 0, ovSwing: 0,                 /* the Explode button's override, where it was pressed, its swing */
    lock: 0, lockOn: false, tag2: 0, labOn: false, relabel: false,
    kpA: 0, kpHold: 0, azWas: NaN,                  /* tracked features: opacity, linger, last azimuth */
    fade: 0, sweep: "none",                         /* crossfade from the still; the sweep: none | wait | run | done */
    done: false, lead: false, pa: 0,                /* read out for good (a sweep, or resumed on screen); the act then starts at the turn */
    frozen: !!hooks.still(), visible: true, lost: false, last: 0, status: "", exState: null, manual: false,
    keep: [],                                       /* keep-out rects for the callouts, in view px */
  };

  /* --- sizes --- */
  let mqDpr = null;
  const onDpr = () => { resize(); request(); };
  function watchDpr() { /* a window moved to a screen of another density: no resize, but this fires */
    if (mqDpr) mqDpr.removeEventListener("change", onDpr);
    mqDpr = window.matchMedia ? matchMedia("(resolution: " + (window.devicePixelRatio || 1) + "dppx)") : null;
    if (mqDpr) mqDpr.addEventListener("change", onDpr);
  }
  R.off.push(() => { if (mqDpr) mqDpr.removeEventListener("change", onDpr); });
  function resize() {
    if (R.dead) return;
    const r = view.getBoundingClientRect();
    S.w = Math.max(1, Math.round(r.width)); S.h = Math.max(1, Math.round(r.height));
    S.dprRaw = window.devicePixelRatio || 1;
    S.dpr = Math.min(S.dprRaw, dprCap);
    renderer.setPixelRatio(S.dpr);
    renderer.setSize(S.w, S.h, false);
    /* the still's frame, contained in the view: centred, or hugging its right edge (--fa: 1, wide
       screens: the view's first column is bleed for the exploded drawing). style.css places the
       <img> the same way. */
    if (S.w / S.h > FRAME.aspect) { S.fh = S.h; S.fw = S.h * FRAME.aspect; } else { S.fw = S.w; S.fh = S.w / FRAME.aspect; }
    const fa = parseFloat(getComputedStyle(view).getPropertyValue("--fa"));
    S.fx = (S.w - S.fw) * (Number.isNaN(fa) ? 0.5 : fa); S.fy = (S.h - S.fh) / 2;
    camera.aspect = FRAME.aspect;
    camera.setViewOffset(S.fw, S.fh, -S.fx, -S.fy, S.w, S.h);
    const px = S.fh * S.dpr / (2 * Math.tan(FRAME.fov * D2R / 2));
    cloudMat.uniforms.uPx.value = px / 900; floorMat.uniforms.uPx.value = px / 900;
    labels.forEach((l) => { l.w = l.el.offsetWidth; l.h = l.el.offsetHeight; });
    S.dtw = detTag.offsetWidth; S.dth = detTag.offsetHeight; S.dt2w = detTag2.offsetWidth; S.dt2h = detTag2.offsetHeight;
    /* what the callouts keep off (the chapter title beside the view on wide screens) */
    S.keep.length = 0;
    (hooks.keepOut ? hooks.keepOut() : []).forEach((el) => {
      if (!el) return;
      const k = el.getBoundingClientRect();
      if (k.width && k.right > r.left && k.left < r.right && k.bottom > r.top && k.top < r.bottom) S.keep.push({ x0: k.left - r.left - 8, y0: k.top - r.top - 6, x1: k.right - r.left + 8, y1: k.bottom - r.top + 6 });
    });
    watchDpr();
    dirty = true;
  }

  /* --- the scroll: where the pinned box is in its track --- */
  let hud = 52;
  function readScroll() {
    const els = hooks.pinEls();
    if (!els) { S.pinned = false; S.p = 0; const r = view.getBoundingClientRect(), vh = window.innerHeight; S.q = clamp01((vh - r.top) / Math.max(1, Math.min(vh, r.height))); actAt(); return; }
    const tr = els.track.getBoundingClientRect(), pr = els.pin.getBoundingClientRect();
    const vh = window.innerHeight, range = tr.height - pr.height;
    S.pinned = range > 40;
    S.q = clamp01((vh - tr.top) / Math.max(1, vh - hud));
    S.p = S.pinned ? clamp01((hud - tr.top) / range) : 0;
    actAt();
  }
  /* Once it has been read out for good (a sweep ran, or motion resumed with it on screen), the
     reconstruct has nothing left to show: the pinned scroll then starts at the turn. The switch is
     made only near the pin's start, where both timelines show the same opening view. */
  function actAt() {
    if (S.done && !S.lead && S.p < 0.06) S.lead = true;
    S.pa = S.lead ? ACT.turn0 + S.p * (1 - ACT.turn0) : S.p;
  }

  /* --- the act, as targets for the eased state (one object, filled in place) --- */
  const t = { scan: 1, dens: 1, k: 0, az: 0, swing: 0, el: 0, depth: 0, roll: 0, lockable: false, tag2: false };
  function targets() {
    const fr = S.frozen, p = fr ? 0 : S.pa, q = fr ? 1 : S.q;
    /* (once read out for good, it stays read out) */
    t.scan = fr || S.done ? 1 : S.pinned ? clamp01(p / ACT.scan) : smooth(0.45, 0.95, q);
    t.dens = fr ? 1 : 0.28 + 0.72 * smooth(0.05, 0.85, q);
    /* one full turn: out to its front right, a slow drift while it is apart, and home */
    const tt = inout(clamp01((p - ACT.turn0) / (ACT.turn1 - ACT.turn0)));
    const th = inout(clamp01((p - ACT.home0) / (ACT.home1 - ACT.home0)));
    const td = clamp01((p - ACT.turn1) / (ACT.home0 - ACT.turn1));
    t.az = cfg.az + cfg.turn * tt + ACT.drift * td + (360 - cfg.turn - ACT.drift) * th;
    t.el = cfg.el + (cfg.exEl - cfg.el) * (tt - th);
    if (S.ovK !== null && !fr && Math.abs(window.scrollY - S.ovAt) > window.innerHeight * 0.35) S.ovK = null;
    t.k = S.ovK !== null ? S.ovK : smooth(ACT.ex0, ACT.ex1, p) - smooth(ACT.as0, ACT.as1, p);
    t.swing = S.ovK === 1 ? S.ovSwing : 0;
    t.depth = fr || S.ovK !== null ? 0 : smooth(ACT.d0, ACT.d0 + 0.03, p) - smooth(ACT.d1 - 0.03, ACT.d1, p);
    t.roll = fr ? 0 : inout(clamp01((p - ACT.roll0) / (1 - ACT.roll0)));
    t.lockable = fr || S.pinned || q > 0.86;
    t.tag2 = !fr && S.pinned && p > ACT.as1;
    if (S.sweep === "wait" || S.sweep === "run") { t.k = 0; t.az = cfg.az; t.el = cfg.el; t.depth = 0; t.roll = 0; t.swing = 0; }
  }

  /* --- one frame: ease the state, decide whether anything changed, draw --- */
  let dirty = true, odirty = false, A = 1, moving = false, now = 0;
  function request() { if (!R.raf && !R.dead && !S.lost && S.visible && !document.hidden) R.raf = requestAnimationFrame(frame); }
  function ease(key, goal, eps) {
    const v = S[key], nv = v + (goal - v) * A;
    if (Math.abs(goal - nv) < eps) { if (v !== goal) { S[key] = goal; dirty = true; } return; }
    S[key] = nv; dirty = true; moving = true;
  }
  function tween(cur, goal) { return cur + (goal - cur) * (S.frozen ? 1 : A * 1.1 > 1 ? 1 : A * 1.1); }
  function frame(ts) {
    R.raf = 0;
    if (R.dead || S.lost) return;
    if (S.manual) { if (dirty) { draw(); dirty = false; } return; } /* debug poses */
    now = ts;
    const dt = Math.min(0.2, S.last ? (ts - S.last) / 1000 : 0.016); /* real time, so a slow device keeps up with the scroll */
    S.last = ts;
    if ((window.devicePixelRatio || 1) !== S.dprRaw) resize(); /* (the media query below can miss it) */
    readScroll();
    if (S.sweep === "wait" && (!S.pinned || S.scrolled)) startSweep();
    targets();
    const snap = S.frozen;
    A = snap ? 1 : 1 - Math.exp(-dt * 9);
    moving = false;
    /* the sweep: a time-driven scan line that swaps the still for the live model */
    if (S.sweep === "run") {
      S.scan = Math.min(1, S.scan + dt / 1.1); dirty = true;
      if (S.scan >= 1) endSweep(); else moving = true;
    } else if (S.sweep !== "wait") ease("scan", t.scan, 0.002);
    ease("dens", t.dens, 0.004); ease("k", t.k, 0.001);
    ease("az", t.az + t.swing * S.k, 0.02);
    ease("el", Math.max(t.el, cfg.el + (cfg.exEl - cfg.el) * S.k), 0.02);
    ease("depth", t.depth, 0.004); ease("roll", t.roll, 0.0005);
    /* hands on: inertia, then the keyboard / reset tweens */
    if (!snap && Math.abs(S.yawV) > 0.5) { S.yawOff += S.yawV * dt; S.yawV *= Math.exp(-dt * 3.2); dirty = true; moving = true; }
    else if (S.yawV) { S.yawV = 0; wrapYaw(); S.relabel = true; }
    if (S.yawGoal !== null) { const v = tween(S.yawOff, S.yawGoal); if (Math.abs(S.yawGoal - v) < 0.05) { S.yawOff = S.yawGoal; S.yawGoal = null; S.relabel = true; } else { S.yawOff = v; moving = true; } dirty = true; }
    if (S.pitchGoal !== null) { const v = tween(S.pitchOff, S.pitchGoal); if (Math.abs(S.pitchGoal - v) < 0.05) { S.pitchOff = S.pitchGoal; S.pitchGoal = null; } else { S.pitchOff = v; moving = true; } dirty = true; }
    /* closer where the view has room for it (a phone held upright), never on the opening still's view on a wide screen */
    const az = S.az + S.yawOff, el = elNow();
    fitAt(az, el, S.k);
    ease("zoom", S.fade < 1 || S.sweep === "wait" || S.sweep === "run" ? 1 : zoomFor(), 0.0008); /* the still's framing until the still is gone */
    /* the detector: locks on once the robot is read out and whole; lets go while it is apart */
    S.lockOn = S.sweep !== "wait" && S.sweep !== "run" && t.lockable && S.scan > 0.999 && S.k < 0.12;
    const lockGoal = S.lockOn ? 1 : 0;
    if (S.lock !== lockGoal) { S.lock = snap ? lockGoal : clamp01(S.lock + (lockGoal ? dt / 0.55 : -dt / 0.25)); odirty = true; if (S.lock !== lockGoal) moving = true; }
    const t2 = t.tag2 && S.lock > 0.95 ? 1 : 0;
    if (S.tag2 !== t2) { S.tag2 = snap ? t2 : clamp01(S.tag2 + (t2 ? dt / 0.3 : -dt / 0.2)); odirty = true; if (S.tag2 !== t2) moving = true; }
    /* the callouts: anchors and sides picked once, from the view the explode is heading for */
    const labOn = S.k > 0.5;
    if (labOn && !S.labOn) pickLabels(t.az + t.swing + S.yawOff, Math.max(t.el, cfg.exEl) + S.pitchOff, false);
    else if (labOn && S.relabel && !drag && S.yawGoal === null && Math.abs(S.yawV) <= 0.5) pickLabels(az, el, true);
    S.labOn = labOn; S.relabel = false;
    for (let i = 0; i < labels.length; i++) {
      const l = labels[i];
      if (l.flip > 0) { l.flip = Math.max(0, l.flip - dt); odirty = true; moving = true; }
    }
    /* tracked features: on while it turns (assembled), linger 0.4 s after it stops, then fade */
    const spin = Number.isNaN(S.azWas) ? 0 : Math.abs(az - S.azWas) / Math.max(dt, 0.001);
    S.azWas = az;
    const kpOn = spin > 12 && S.k < 0.04 && S.scan > 0.999 && S.sweep !== "run";
    if (kpOn) { S.kpHold = 0.4; if (S.kpA < 1) S.kpA = Math.min(1, S.kpA + dt / 0.15); }
    else if (S.kpHold > 0) S.kpHold -= dt;
    else if (S.kpA > 0) S.kpA = Math.max(0, S.kpA - dt / 0.3);
    if (S.kpA > 0 || kpCount) { odirty = true; if (S.kpA > 0) moving = true; }
    /* the crossfade from the still */
    if (S.fade < 1 && S.sweep !== "wait" && S.sweep !== "run") { S.fade = snap ? 1 : Math.min(1, S.fade + dt / 0.45); paint(); dirty = true; if (S.fade < 1) moving = true; }
    if (dirty) { draw(); dirty = false; odirty = false; } else if (odirty) { overlay(); odirty = false; }
    if (moving) request(); else S.last = 0;
    status();
  }
  const elNow = () => Math.max(2, Math.min(48, S.el + S.pitchOff));
  function wrapYaw() { /* whole turns dropped: no visible change (and no spin for the feature tracker) */
    const w = wrap180(S.yawOff), d = w - S.yawOff;
    S.yawOff = w; S.azWas += d; if (S.yawGoal !== null) S.yawGoal += d;
  }
  function zoomFor() {
    const kk = S.k, lim = FRAME.fill + (FRAME.fillEx - FRAME.fill) * kk;
    const room = small ? 0 : 56 * kk; /* exploded on a wide view: leave the callouts a column each side */
    const xs = Math.max(0.6, (S.w - 2 * room) / S.fw), ys = S.h / S.fh;
    const s = Math.min(xs * lim / FD.ex, ys * lim / FD.ey);
    return Math.max(0.82, Math.min(1.45, s));
  }

  /* --- the sweep, and the figure's crossfade state (--live: the canvas and overlay, --still:
     the still, --cut: how much of the still the scan line has taken; is-swept hides it) --- */
  const css = { live: "", still: "", cut: "", swept: null };
  function setVar(name, key, v) { if (css[key] !== v) { css[key] = v; fig.style.setProperty(name, v); } }
  function paint(cutPx) {
    const sw = S.sweep === "wait" || S.sweep === "run";
    setVar("--live", "live", S.lost ? "0" : sw ? "1" : S.fade.toFixed(3));
    setVar("--still", "still", S.lost || sw ? "1" : (1 - S.fade).toFixed(3));
    setVar("--cut", "cut", sw && cutPx > 0 ? Math.round(cutPx) + "px" : "0px");
    const swept = !S.lost && !sw && S.fade >= 1;
    if (css.swept !== swept) { css.swept = swept; fig.classList.toggle("is-swept", swept); }
  }
  function startSweep() {
    if (S.sweep !== "wait") return;
    S.sweep = "run"; S.scan = 0; S.last = 0; dirty = true; request();
  }
  function endSweep() {
    S.sweep = "done"; S.done = true; S.scan = 1; S.fade = 1; S.lock = 1; paint(0);
  }

  /* --- draw: pose the robot and the camera, render, then the overlays --- */
  const B = { x0: 0, y0: 0, x1: 0, y1: 0 };
  function draw() {
    setOffsets(S.k);
    for (let i = 0; i < G; i++) groups[i].position.copy(base[i]).add(off[i]);
    /* driving off: the floor slides under it, the wheels roll */
    const slide = S.roll * TILE;
    off[G].set(0, 0, slide);
    for (let i = 0; i < wheels.length; i++) groups[wheels[i]].rotation.x = -slide / (cfg.wheelR || 0.04);
    const az = S.az + S.yawOff, el = elNow();
    T.copy(centreK[0]).lerp(centreK[1], S.k);
    fitAt(az, el, S.k);
    let dist = FD.d / S.zoom;
    aim(camera, T, az, el, dist);
    /* where its centre goes: the still's frame (a hair low, so the tag has room); apart, the view */
    const fcx = (S.fx + S.fw / 2) / S.w * 2 - 1, gx = fcx * (1 - S.k), gy = FRAME.bias * S.fh / S.h;
    let e = project(camera, 4);
    /* The framing table is exact assembled and apart (and at its 10° steps); in between, each wave
       of parts moves at its own pace and can reach past it (the arm's tip plates, high, are the
       last home). Never let a part touch the view's edge: back off until it all fits, 12 px in. */
    for (let it = 0; it < 2; it++) {
      const over = Math.max((e[1] - e[0]) / 2 / (1 - 24 / S.w - Math.abs(gx)), (e[3] - e[2]) / 2 / (1 - 24 / S.h - Math.abs(gy)));
      if (!(over > 1)) break;
      dist *= over * 1.01;
      aim(camera, T, az, el, dist);
      e = project(camera, 4);
    }
    /* keep it centred there */
    const cx = (e[0] + e[1]) / 2, cy = (e[2] + e[3]) / 2;
    const halfH = Math.tan(FRAME.fov * D2R / 2) * dist * (S.h / S.fh), halfW = halfH * S.w / S.h;
    V.setFromMatrixColumn(camera.matrixWorld, 0); camera.position.addScaledVector(V, (cx - gx) * halfW);
    V.setFromMatrixColumn(camera.matrixWorld, 1); camera.position.addScaledVector(V, (cy - gy) * halfH);
    camera.updateMatrixWorld(true);
    rig.position.copy(T); rig.rotation.y = az * D2R;
    /* depth range for the tint and the depth pass: the near and far side of the robot */
    const Rr = 0.4 + 0.3 * S.k;
    U.uDepth.value.set(dist - Rr, dist + Rr);
    U.uDepthMix.value = S.depth;
    /* the scan line: from the top of the robot to its floor */
    const scanning = S.scan < 0.999;
    U.uScanOn.value = scanning ? 1 : 0;
    U.uScanY.value = yMax + 0.01 - (yMax - yMin + 0.02) * S.scan;
    const sweeping = S.sweep === "wait" || S.sweep === "run";
    cloudPts.visible = scanning && !sweeping;
    cloudMat.uniforms.uDensity.value = S.dens;
    const floorA = (1 - smooth(0, 0.5, S.k)) * (sweeping ? S.scan : 1);
    floorPts.visible = floorA > 0.01; floorMat.uniforms.uAlpha.value = floorA * (0.4 + 0.6 * S.dens);
    shadow.visible = floorA > 0.01; shadowMat.uniforms.uA.value = 0.66 * floorA * (scanning && !sweeping ? S.scan : 1);
    renderer.render(scene, camera);
    overlay();
  }

  function toPx(x, y, z) { V.set(x, y, z).project(camera); V.x = (V.x + 1) / 2 * S.w; V.y = (1 - V.y) / 2 * S.h; return V; }
  const BX = { x: NaN, y: NaN, w: NaN, h: NaN, a: -1, dash: null }, TK = { y: NaN, a: -1 }, DT = { px: NaN, py: NaN, pa: -1 }, DT2 = { px: NaN, py: NaN, pa: -1 };
  const r2 = (v) => Math.round(v * 2) / 2;
  const PA = { asm: -1, kp: -1 };
  function overlay() {
    const w = S.w, h = S.h;
    /* the detector box, from the projected samples; it arrives as a loose dashed guess and snaps on */
    const e = project(camera, 2);
    const pad = 0.012 * S.fh;
    B.x0 = (e[0] + 1) / 2 * w - pad; B.x1 = (e[1] + 1) / 2 * w + pad;
    B.y0 = (1 - e[3]) / 2 * h - pad; B.y1 = (1 - e[2]) / 2 * h + pad;
    const L = S.lock;
    const s = 1 - outc(Math.min(1, L / 0.8)), cx = (B.x0 + B.x1) / 2, cy = (B.y0 + B.y1) / 2;
    const hw = (B.x1 - B.x0) / 2 * (1 + 0.1 * s), hh = (B.y1 - B.y0) / 2 * (1 + 0.07 * s);
    const bx = r2(cx - hw + 0.04 * s * (B.x1 - B.x0)), by = r2(cy - hh - 0.05 * s * (B.y1 - B.y0)), bw = r2(hw * 2), bh = r2(hh * 2);
    const ba = L > 0 ? Math.round(Math.min(1, L * 2.2) * 50) / 50 : 0, dash = L < 0.8;
    if (ba !== BX.a) { box.style.opacity = ba; BX.a = ba; }
    if (ba > 0) {
      if (bx !== BX.x || by !== BX.y) { box.style.transform = "translate(" + bx + "px," + by + "px)"; BX.x = bx; BX.y = by; }
      if (bw !== BX.w) { box.style.width = bw + "px"; BX.w = bw; }
      if (bh !== BX.h) { box.style.height = bh + "px"; BX.h = bh; }
      if (dash !== BX.dash) { box.classList.toggle("is-guess", dash); BX.dash = dash; }
    }
    /* the tag: above the box's top-left corner (inside it if there's no room); the second line,
       after the act, under the box */
    const ta = L > 0.85 ? (L - 0.85) / 0.15 : 0;
    let tx = B.x0 - 0.75, ty = B.y0 - S.dth;
    if (ty < 2) { ty = B.y0 + 3; tx = B.x0 + 3; }
    if (tx + S.dtw > w - 2) tx = Math.max(2, w - 2 - S.dtw);
    place(detTag, tx, ty, ta, DT);
    let t2x = B.x0 - 0.75, t2y = B.y1 + 1;
    if (t2y + S.dt2h > h - 2) { t2y = B.y1 - S.dt2h - 3; t2x = B.x0 + 3; }
    if (t2x + S.dt2w > w - 2) t2x = Math.max(2, w - 2 - S.dt2w);
    place(detTag2, t2x, t2y, S.tag2 * ta, DT2);
    /* the scan line: a hairline across the view, ticks at the frame's edges */
    const scanning = S.scan > 0.001 && S.scan < 0.999;
    const sy = scanning ? r2(toPx(T.x, U.uScanY.value, T.z).y) : TK.y, sa = scanning ? 1 : 0;
    if (sa !== TK.a) { ticks.forEach((k) => { k.style.opacity = sa; }); scanLine.style.opacity = sa; TK.a = sa; }
    if (scanning && sy !== TK.y) {
      ticks[0].style.transform = "translate(" + r2(S.fx) + "px," + sy + "px)"; ticks[1].style.transform = "translate(" + r2(S.fx + S.fw - 14) + "px," + sy + "px)";
      scanLine.style.transform = "translateY(" + sy + "px)";
      TK.y = sy;
    }
    if (S.sweep === "run") paint(sy - S.fy);
    /* the exploded drawing's assembly lines: each moved part, from home to where it is */
    const aa = Math.round(smooth(0.03, 0.3, S.k) * 50) / 50;
    if (aa !== PA.asm) { asmPath.style.opacity = aa; PA.asm = aa; }
    if (aa > 0) {
      let d = "";
      for (let i = 0; i < G; i++) {
        if (!moves[i] || off[i].lengthSq() < 1e-6) continue;
        const p0 = toPx(base[i].x, base[i].y, base[i].z), x0 = r2(p0.x), y0 = r2(p0.y);
        const p1 = toPx(base[i].x + off[i].x, base[i].y + off[i].y, base[i].z + off[i].z);
        d += "M" + x0 + " " + y0 + "L" + r2(p1.x) + " " + r2(p1.y);
      }
      asmPath.setAttribute("d", d);
    }
    keypoints();
    /* the callouts: a ring on the part, a leader out to its column, the tag at its end */
    if (S.k > 0.55 && labels.length && labels[0].at >= 0) layoutLabels();
    for (let i = 0; i < labels.length; i++) {
      const l = labels[i];
      l.a = clamp01((S.k - 0.55 - i * 0.035) / 0.18);
      const al = l.a > 0 ? outc(l.a) : 0, la = Math.round(al * 50) / 50;
      if (la !== l.la) { l.path.style.opacity = la; l.ring.style.opacity = la; l.la = la; }
      const lit = l.a > 0.5;
      if (l.li && lit !== l.on) { l.on = lit; l.li.classList.toggle("is-on", lit); }
      if (al <= 0) { place(l.el, l.px, l.py, 0, l); continue; }
      const dx = l.lx - l.x, dy = l.ly - l.y, dl = Math.hypot(dx, dy) || 1;
      const sx = l.x + dx / dl * 5.5, syy = l.y + dy / dl * 5.5;
      let d = "M" + r2(sx) + " " + r2(syy) + "L" + r2(sx + (l.lx - sx) * al) + " " + r2(syy + (l.ly - syy) * al);
      if (al > 0.98) d += "L" + r2(l.side > 0 ? l.tx : l.tx + l.w) + " " + r2(l.ly);
      if (d !== l.d) { l.path.setAttribute("d", d); l.d = d; }
      const rc = r2(l.x) + "," + r2(l.y);
      if (rc !== l.rc) { l.ring.setAttribute("cx", r2(l.x)); l.ring.setAttribute("cy", r2(l.y)); l.rc = rc; }
      place(l.el, l.tx, l.ty, al > 0.6 ? (al - 0.6) / 0.4 : 0, l);
    }
  }
  function place(el, x, y, a, memo) { /* move a DOM tag only when it actually moved */
    const rx = r2(x), ry = r2(y), ra = Math.round(a * 50) / 50;
    if (ra !== memo.pa) { el.style.opacity = ra; memo.pa = ra; }
    if (ra > 0 && (rx !== memo.px || ry !== memo.py)) { el.style.transform = "translate(" + rx + "px," + ry + "px)"; memo.px = rx; memo.py = ry; }
  }

  /* Tracked features: project, keep those on the side facing the camera, record the flow. */
  function keypoints() {
    const ka = Math.round(S.kpA * 50) / 50;
    if (ka !== PA.kp) { kpTrail.style.opacity = ka; kpRing.style.opacity = ka; PA.kp = ka; }
    if (ka <= 0) { if (kpCount) { kpCount = 0; kpTrail.setAttribute("d", ""); kpRing.setAttribute("d", ""); } return; }
    const cdx = camera.position.x - T.x, cdz = camera.position.z - T.z, cl = Math.hypot(cdx, cdz) || 1;
    kpHead = (kpHead + 1) % KM; kpCount = Math.min(KM, kpCount + 1); kpTime[kpHead] = now;
    let rings = "", trails = "";
    for (let k = 0; k < KP; k++) {
      const j = kpJ[k], g = detG[j], o = off[g];
      const x = det[j * 3] + o.x, y = det[j * 3 + 1] + o.y, z = det[j * 3 + 2] + o.z;
      const nx = x - centreK[0].x, nz = z - centreK[0].z, nr = Math.hypot(nx, nz);
      const vis = nr < 0.06 || (nx * cdx + nz * cdz) / (nr * cl) > 0.12;
      const p = toPx(x, y, z), b = (k * KM + kpHead) * 2;
      kpXY[b] = p.x; kpXY[b + 1] = p.y; kpVis[k * KM + kpHead] = vis ? 1 : 0;
      if (!vis) continue;
      rings += "M" + r2(p.x - 4.5) + " " + r2(p.y) + "a4.5 4.5 0 1 0 9 0a4.5 4.5 0 1 0 -9 0";
      let m = "M" + r2(p.x) + " " + r2(p.y), n = 0;
      for (let s = 1; s < kpCount; s++) {
        const h = (kpHead - s + KM) % KM;
        if (now - kpTime[h] > 400 || !kpVis[k * KM + h]) break;
        m += "L" + r2(kpXY[(k * KM + h) * 2]) + " " + r2(kpXY[(k * KM + h) * 2 + 1]); n++;
      }
      if (n) trails += m;
    }
    kpRing.setAttribute("d", rings); kpTrail.setAttribute("d", trails);
  }

  /* Callouts, like an exploded drawing. Anchors and sides are picked once, when the parts come
     apart, from the view the explode is heading for (so the same scroll gives the same layout),
     and again only after you turn it by hand (a 250 ms glide, never a jump). Each column keeps
     its tags at their parts' heights, at least 6 px apart, inside the view and off the title. */
  function pickLabels(az, el, glide) {
    setOffsets(1); boxCentre(T2);
    fitAt(az, el, 1);
    aim(fitCam, T2, az, el, FD.d);
    let nl = 0, nr = 0;
    for (const l of labels) {
      let best = l.idx[0], bd = Infinity;
      for (const g of l.idx) { const d = V.copy(base[g]).add(off[g]).distanceToSquared(fitCam.position); if (d < bd) { bd = d; best = g; } }
      V.copy(base[best]).add(off[best]).add(l.ao).project(fitCam);
      l.nx = V.x; l.ny = -V.y; l.nat = best; l.nside = V.x < 0 ? -1 : 1;
      if (l.nside < 0) nl++; else nr++;
    }
    /* balanced columns (4 and 4): move the label nearest the middle across */
    while (nl > nr + 1) { let m = null; for (const l of labels) if (l.nside < 0 && (!m || l.nx > m.nx)) m = l; m.nside = 1; nl--; nr++; }
    while (nr > nl + 1) { let m = null; for (const l of labels) if (l.nside > 0 && (!m || l.nx < m.nx)) m = l; m.nside = -1; nr--; nl++; }
    /* anything to glide? a new anchor or side, or a new order down a column */
    let moved = false;
    for (const l of labels) if (l.nat !== l.at || l.nside !== l.side) moved = true;
    for (const a of labels) for (const b of labels) if (a !== b && a.nside === b.nside && (a.ord < b.ord) !== (a.ny < b.ny)) moved = true;
    for (const l of labels) {
      if (glide && moved && l.at >= 0) { l.fx = l.tx; l.fy = l.ty; l.fpx = l.x; l.fpy = l.y; l.was = l.at; l.flip = 0.25; }
      l.at = l.nat; l.side = l.nside; l.ord = l.ny;
    }
    setOffsets(S.k);
  }
  const colL = [], colR = [], COLS = [colL, colR];
  /* each column's order is the one picked with the sides (the parts' heights in that view), not
     re-sorted every frame: while it drifts, two parts at about the same height would otherwise
     swap their tags in a single frame */
  const byOrd = (a, b) => a.ord - b.ord;
  function layoutLabels() {
    const w = S.w, h = S.h;
    colL.length = 0; colR.length = 0;
    for (let i = 0; i < labels.length; i++) {
      const l = labels[i];
      if (l.at < 0) continue;
      const g = l.at, p = toPx(base[g].x + off[g].x + l.ao.x, base[g].y + off[g].y + l.ao.y, base[g].z + off[g].z + l.ao.z);
      l.x = p.x; l.y = p.y;
      if (l.flip > 0) { /* gliding to a new anchor: the ring travels too */
        const f = inout(1 - l.flip / 0.25), q = toPx(base[l.was].x + off[l.was].x + l.ao.x, base[l.was].y + off[l.was].y + l.ao.y, base[l.was].z + off[l.was].z + l.ao.z);
        l.x = q.x + (l.x - q.x) * f; l.y = q.y + (l.y - q.y) * f;
      }
      l.ly = l.y;
      (l.side < 0 ? colL : colR).push(l);
    }
    for (let c = 0; c < 2; c++) {
      const col = COLS[c], right = c === 1;
      col.sort(byOrd);
      /* off the keep-out rects (the title): a tag that would cross one goes under it */
      for (let i = 0; i < col.length; i++) {
        const l = col[i];
        const x0 = right ? Math.min(w - 4 - l.w, Math.max(B.x1 + 10, l.x + 24)) : Math.max(4, Math.min(B.x0 - 10 - l.w, l.x - 24 - l.w));
        for (let j = 0; j < S.keep.length; j++) { const k = S.keep[j]; if (x0 < k.x1 && x0 + l.w > k.x0 && l.ly + l.h / 2 > k.y0 && l.ly - l.h / 2 < k.y1) l.ly = k.y1 + l.h / 2; }
      }
      for (let i = 0; i < col.length; i++) {
        const l = col[i], lo = i ? col[i - 1].ly + (col[i - 1].h + l.h) / 2 + 6 : 6 + l.h / 2;
        if (l.ly < lo) l.ly = lo;
      }
      for (let i = col.length - 1; i >= 0; i--) {
        const l = col[i], hi = i < col.length - 1 ? col[i + 1].ly - (col[i + 1].h + l.h) / 2 - 6 : h - 6 - l.h / 2;
        if (l.ly > hi) l.ly = hi;
      }
      for (let i = 0; i < col.length; i++) {
        const l = col[i];
        if (right) { l.tx = Math.min(w - 4 - l.w, Math.max(B.x1 + 10, l.x + 24)); l.lx = l.tx - 6; }
        else { l.tx = Math.max(4, Math.min(B.x0 - 10 - l.w, l.x - 24 - l.w)); l.lx = l.tx + l.w + 6; }
        l.ty = l.ly - l.h / 2;
        if (l.flip > 0) { /* the glide to the other side */
          const f = inout(1 - l.flip / 0.25);
          l.tx = l.fx + (l.tx - l.fx) * f; l.ty = l.fy + (l.ty - l.fy) * f; l.ly = l.ty + l.h / 2;
          l.lx = right ? l.tx - 6 : l.tx + l.w + 6;
        }
      }
    }
  }

  /* --- what the frame's readout says (only written when it changes) --- */
  function status() {
    let s;
    const tight = S.w < 368; /* a small phone: the short forms, so the readout fits beside the camera's name */
    if (S.sweep === "wait") s = tight ? "model ready" : "model ready · " + G + " groups";
    else if (S.scan < 0.999) s = S.scan < 0.002 ? "point cloud · " + Math.round(cloud.n / 1000) + (tight ? "k" : "k points") : "reconstructing · " + Math.round(S.scan * 100) + "%";
    else if (S.depth > 0.5) s = "depth · " + U.uDepth.value.x.toFixed(1) + "–" + U.uDepth.value.y.toFixed(1) + " m";
    else if (S.k > 0.95) s = "exploded · " + G + " groups";
    else if (S.k > 0.02) s = (S.ovK !== null ? S.ovK === 1 : S.pa < (ACT.ex1 + ACT.as0) / 2) ? "exploding" : "assembling";
    else if (!S.lockOn) s = "acquiring";
    else if (S.roll > 0.01 && S.roll < 0.99) s = "driving · " + (S.roll * TILE).toFixed(1) + " m";
    else {
      const yaw = Math.round((((S.az + S.yawOff - cfg.az) % 360) + 360) % 360);
      s = yaw < 2 || yaw > 358 ? "locked · 1698V" : "inspecting · " + yaw + "°";
    }
    if (s !== S.status) { S.status = s; hooks.status(s); }
    const ex = S.k > 0.5;
    if (ex !== S.exState) { S.exState = ex; hooks.exploded(ex); }
  }

  /* --- 4. Hands on --- */
  let drag = null;
  function down(e) {
    if (e.button !== 0 || R.dead || S.lost) return;
    drag = { id: e.pointerId, x: e.clientX, y: e.clientY, t: performance.now(), v: 0, moved: false, mouse: e.pointerType === "mouse" };
    /* a touch is captured by the view at once (not by the still under it) */
    if (!drag.mouse) { try { view.setPointerCapture(e.pointerId); } catch (x) { /* fine */ } }
    S.yawV = 0; S.yawGoal = null; S.pitchGoal = null;
    if (S.sweep === "wait") startSweep();
    view.classList.add("is-drag");
  }
  function move(e) {
    if (!drag || e.pointerId !== drag.id) return;
    const dx = e.clientX - drag.x, dy = e.clientY - drag.y, tm = performance.now();
    if (!drag.moved) { if (Math.abs(dx) < 3 && Math.abs(dy) < 3) return; drag.moved = true; if (drag.mouse) { try { view.setPointerCapture(e.pointerId); } catch (x) { /* fine */ } } }
    drag.x = e.clientX; drag.y = e.clientY;
    if (S.sweep === "run") { drag.t = tm; return; } /* the still under the line can't turn */
    const k = 300 / Math.max(240, S.fw);
    S.yawOff -= dx * 0.5 * k;
    if (drag.mouse) S.pitchOff = Math.max(-12, Math.min(28, S.pitchOff + dy * 0.3 * k));
    const dtm = Math.max(1, tm - drag.t);
    drag.v = 0.7 * drag.v + 0.3 * (-dx * 0.5 * k / dtm * 1000);
    drag.t = tm;
    dirty = true; request();
  }
  function up(e) {
    if (!drag || (e && e.pointerId !== drag.id)) return;
    if (!S.frozen && drag.moved && performance.now() - drag.t < 90) S.yawV = Math.max(-540, Math.min(540, drag.v));
    if (drag.moved) S.relabel = true;
    drag = null; view.classList.remove("is-drag");
    request();
  }
  /* only the view's own capture ending counts (the still's <img> loses an implicit touch capture
     to the view, and that event bubbles up here) */
  function lost(e) { if (e.target === view) up(e); }
  /* Keys turn it only when the view got its focus from the keyboard (Tab, or a key press that
     moved focus to it). A pointer press focuses it too, and then the page keeps all its keys:
     :focus-visible can't tell, since Chrome turns it on with the first key pressed after a click. */
  let ptrRecent = false, kbdFocus = false;
  on(document, "pointerdown", () => { ptrRecent = true; }, { capture: true, passive: true });
  on(document, "keydown", () => { ptrRecent = false; }, true);
  on(view, "focus", () => { kbdFocus = !ptrRecent; });
  on(view, "blur", () => { kbdFocus = false; });
  on(view, "pointerdown", () => { kbdFocus = false; });
  try { kbdFocus = document.activeElement === view && view.matches(":focus-visible"); } catch (x) { /* fine */ } /* (Load pressed from the keyboard moved focus here) */
  function onKey(e) {
    if (e.target !== view || !kbdFocus || !S.visible || e.altKey || e.ctrlKey || e.metaKey) return;
    let used = true;
    if (e.key === "ArrowLeft" && !e.shiftKey) S.yawGoal = (S.yawGoal ?? S.yawOff) + 20;
    else if (e.key === "ArrowRight" && !e.shiftKey) S.yawGoal = (S.yawGoal ?? S.yawOff) - 20;
    else if (e.key === "ArrowUp" && e.shiftKey) S.pitchGoal = Math.min(28, (S.pitchGoal ?? S.pitchOff) + 8);
    else if (e.key === "ArrowDown" && e.shiftKey) S.pitchGoal = Math.max(-12, (S.pitchGoal ?? S.pitchOff) - 8);
    else if (e.key === "Home") { wrapYaw(); S.yawGoal = 0; S.pitchGoal = 0; }
    else used = false;
    if (used) { e.preventDefault(); S.yawV = 0; if (S.sweep === "wait") startSweep(); request(); }
  }
  on(view, "pointerdown", down);
  on(view, "pointermove", move);
  on(view, "pointerup", up);
  on(view, "pointercancel", up);
  on(view, "lostpointercapture", lost);
  on(view, "keydown", onKey);

  on(window, "scroll", () => { S.scrolled = true; request(); }, { passive: true });
  const ro = new ResizeObserver(() => { resize(); if (S.fade > 0 && !S.lost && !R.dead && !S.manual) { draw(); dirty = false; } request(); });
  ro.observe(view);
  (hooks.keepOut ? hooks.keepOut() : []).forEach((el) => { if (el) ro.observe(el); });
  const vis = new IntersectionObserver((es) => { S.visible = es[es.length - 1].isIntersecting; if (S.visible) { S.last = 0; request(); } }, { rootMargin: "60px 0px" });
  vis.observe(view);
  R.off.push(() => { ro.disconnect(); vis.disconnect(); });
  on(document, "visibilitychange", () => { if (!document.hidden) { S.last = 0; request(); } });
  const onHud = () => { hud = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--hud")) || 52; };
  onHud();
  on(window, "resize", onHud);
  /* A lost context gets 3 s to come back (a GPU reset, a graphics switch); meanwhile the still
     shows. three re-uploads everything on the next draw after a restore. */
  on(canvas, "webglcontextlost", (e) => {
    e.preventDefault();
    if (R.dead) return;
    S.lost = true; cancelAnimationFrame(R.raf); R.raf = 0; paint(0);
    hooks.status(S.w < 368 ? "signal lost" : "signal lost · retrying");
    R.timers.push(setTimeout(() => { if (S.lost && !R.dead) { R.kill(); hooks.fail("context lost"); } }, 3000));
  });
  on(canvas, "webglcontextrestored", () => {
    if (R.dead) return;
    R.timers.forEach(clearTimeout); R.timers.length = 0;
    S.lost = false; S.fade = 0; S.status = ""; dirty = true; S.last = 0; paint(0); request();
  });

  /* --- compile and upload now, invisibly (--live is 0), so the first frames you see don't
     stutter: the shaders (scan line on) in parallel where the driver can, then the geometry a
     few groups at a time, yielding between --- */
  resize();
  U.uScanOn.value = 1;
  readScroll();
  targets();
  aim(camera, centreK[0], cfg.az, cfg.el, 2);
  /* (compileAsync only where the driver compiles in parallel: elsewhere three would just warn) */
  if (renderer.getContext().getExtension("KHR_parallel_shader_compile")) await renderer.compileAsync(scene, camera);
  else { renderer.compile(scene, camera); await yieldNow(); }
  if (R.dead) throw new Error("stopped");
  groups.forEach((g) => { g.visible = false; });
  for (let i = 0; i < G; i += 6) {
    for (let j = i; j < Math.min(G, i + 6); j++) groups[j].visible = true;
    renderer.render(scene, camera);
    await yieldNow();
    if (R.dead) throw new Error("stopped");
  }
  if (shaderErr) throw new Error("shader");

  /* --- where it starts: already being looked at (the still is on screen) → the sweep waits for
     the first pinned scroll or a touch (at once if it was loaded by a press, or nothing is
     pinned); off screen → it is simply live (the reader will see the point cloud first) --- */
  readScroll();
  targets();
  S.scan = t.scan; S.dens = t.dens; S.k = t.k; S.az = t.az; S.el = t.el; S.depth = t.depth; S.roll = t.roll;
  S.scrolled = false; /* scrolls while it was building don't count as the first pinned scroll */
  const seen = onScreen(view) && !document.hidden;
  const stillEx = fig.classList.contains("is-ex");
  if (seen && stillEx) { /* the exploded still is up: crossfade into the same exploded view */
    S.ovK = 1; S.ovAt = window.scrollY; S.ovSwing = wrap180(cfg.exAz - cfg.az); S.k = 1;
    S.az = cfg.az + S.ovSwing; S.el = cfg.exEl; S.scan = 1; S.fade = 0;
  } else if (seen && !S.frozen) {
    S.sweep = hooks.eager || !S.pinned ? "run" : "wait"; S.scan = 0; S.fade = 1;
    /* a reader who doesn't scroll gets the sweep anyway, after a moment */
    R.timers.push(setTimeout(() => { if (S.sweep === "wait" && S.visible && !S.lost) startSweep(); }, 2000));
  }
  else if (seen) { S.scan = 1; S.fade = 0; }
  else S.fade = 1;
  paint(0);
  draw();
  request();

  /* --- the controller stages.js holds --- */
  const ctrl = {
    explode() { /* the button: whatever it shows now, the other one */
      const ex = S.ovK !== null ? S.ovK === 1 : S.k > 0.5;
      S.ovK = ex ? 0 : 1; S.ovAt = window.scrollY;
      if (S.ovK === 1) { /* swing to the nearest drawing view, if one is close */
        const cur = S.az + S.yawOff;
        let sw = 0, bd = 71;
        for (const v of [cfg.exAz, cfg.az + cfg.turn]) { const d = wrap180(v - cur); if (Math.abs(d) < bd) { bd = Math.abs(d); sw = d; } }
        S.ovSwing = sw;
      }
      if (S.sweep === "wait") startSweep();
      request();
    },
    reset() { wrapYaw(); S.yawGoal = 0; S.pitchGoal = 0; S.yawV = 0; S.ovK = null; request(); },
    freeze(v) { /* paused mid-sweep: the swap finishes at once (same pose, so nothing visibly moves) */
      /* resumed with the solid robot on screen: it stays solid (it never dissolves back into the
         point cloud in front of you; the act goes on from the turn) */
      if (!v && S.frozen && S.fade >= 1 && S.scan > 0.999 && onScreen(view)) S.done = true;
      S.frozen = v;
      if (v) { S.yawV = 0; if (S.sweep === "wait" || S.sweep === "run") { endSweep(); dirty = true; } }
      request();
    },
    teardown: R.kill,
    render() { dirty = true; request(); },
    refit() { resize(); request(); },
  };
  if (hooks.debug) {
    ctrl.debug = {
      S, FRAME, ACT, groups: groups.map((g) => g.name),
      /* stills and checks: set the act's state directly and draw once */
      pose(o) {
        S.manual = true;
        S.zoom = 1; S.depth = 0; S.roll = 0; S.yawOff = 0; S.pitchOff = 0; S.sweep = "none";
        Object.assign(S, o);
        S.labOn = S.k > 0.5;
        if (S.labOn) pickLabels(S.az, S.el, false);
        S.lock = o.lock ?? S.lock;
        S.fade = 1; paint(0);
        draw();
        return { calls: renderer.info.render.calls, tris: renderer.info.render.triangles };
      },
      labels: () => labels.map((l) => ({ text: l.el.textContent, x: l.x / S.w, y: l.y / S.h, tx: l.tx / S.w, ty: l.ty / S.h, lx: l.lx / S.w, ly: l.ly / S.h, side: l.side, w: l.w / S.w, h: l.h / S.h })),
      box: () => ({ x0: B.x0 / S.w, y0: B.y0 / S.h, x1: B.x1 / S.w, y1: B.y1 / S.h }),
      grab: () => canvas.toDataURL("image/png"),
      set(o) { /* tuning: lights, rim, exposure */
        if (o.hemi != null) hemi.intensity = o.hemi; if (o.key != null) key.intensity = o.key;
        if (o.fill != null) fill.intensity = o.fill; if (o.rim != null) rim.intensity = o.rim;
        if (o.uRim != null) U.uRim.value = o.uRim; if (o.exp != null) renderer.toneMappingExposure = o.exp;
        if (o.floor != null) floorMat.uniforms.uSize.value = o.floor;
        draw();
      },
      renderer, gl: renderer.getContext(),
    };
  }
  return ctrl;
}

/* ---------- Surface sampling ----------
   N points spread over the robot's surfaces by area (so plates read as plates, not just the
   screw-dense corners), each tagged with its group, in model space. Runs once, in ~8 ms slices.
   Seeded, so the cloud (and the tracked features picked from it) is the same on every visit. */
async function sampleSurface(model, gIndex, N, stopped) {
  model.updateMatrixWorld(true);
  const items = [];
  let total = 0, t0 = performance.now(), seed = 1698;
  const rand = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
  const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3(), m4 = new THREE.Matrix4();
  const meshes = [];
  model.traverse((o) => { if (o.isMesh) meshes.push(o); });
  for (const o of meshes) {
    let g = o; while (g && !gIndex.has(g)) g = g.parent;
    const gi = g ? gIndex.get(g) : 0;
    const geo = o.geometry, pos = geo.attributes.position, idx = geo.index;
    const tri = idx ? idx.count / 3 : pos.count / 3;
    const mats = [];
    if (o.isInstancedMesh) for (let i = 0; i < o.count; i++) { o.getMatrixAt(i, m4); mats.push(new THREE.Matrix4().multiplyMatrices(o.matrixWorld, m4)); }
    else mats.push(o.matrixWorld.clone());
    const cum = new Float32Array(tri);
    let acc = 0;
    const mw = mats[0];
    for (let t = 0; t < tri; t++) {
      const i0 = idx ? idx.getX(t * 3) : t * 3, i1 = idx ? idx.getX(t * 3 + 1) : t * 3 + 1, i2 = idx ? idx.getX(t * 3 + 2) : t * 3 + 2;
      a.fromBufferAttribute(pos, i0).applyMatrix4(mw); b.fromBufferAttribute(pos, i1).applyMatrix4(mw); c.fromBufferAttribute(pos, i2).applyMatrix4(mw);
      acc += b.sub(a).cross(c.sub(a)).length() / 2;
      cum[t] = acc;
    }
    items.push({ pos, idx, cum, area: acc, mats, gi });
    total += acc * mats.length;
    if (performance.now() - t0 > 8) { await yieldNow(); if (stopped()) return null; t0 = performance.now(); }
  }
  const P = new Float32Array(N * 3), grp = new Uint8Array(N), grpF = new Float32Array(N), rnd = new Float32Array(N);
  let n = 0;
  for (const it of items) {
    for (const mw of it.mats) {
      const want = N * it.area / total, k = Math.floor(want) + (rand() < want % 1 ? 1 : 0);
      for (let s = 0; s < k && n < N; s++) {
        const r = rand() * it.area;
        let lo = 0, hi = it.cum.length - 1;
        while (lo < hi) { const mid = (lo + hi) >> 1; if (it.cum[mid] < r) lo = mid + 1; else hi = mid; }
        const t = lo, idx = it.idx;
        const i0 = idx ? idx.getX(t * 3) : t * 3, i1 = idx ? idx.getX(t * 3 + 1) : t * 3 + 1, i2 = idx ? idx.getX(t * 3 + 2) : t * 3 + 2;
        let u = rand(), v = rand(); if (u + v > 1) { u = 1 - u; v = 1 - v; }
        a.fromBufferAttribute(it.pos, i0); b.fromBufferAttribute(it.pos, i1); c.fromBufferAttribute(it.pos, i2);
        a.multiplyScalar(1 - u - v).addScaledVector(b, u).addScaledVector(c, v).applyMatrix4(mw);
        P[n * 3] = a.x; P[n * 3 + 1] = a.y; P[n * 3 + 2] = a.z;
        grp[n] = it.gi; grpF[n] = it.gi; rnd[n] = rand();
        n++;
      }
    }
    if (performance.now() - t0 > 8) { await yieldNow(); if (stopped()) return null; t0 = performance.now(); }
  }
  /* points are stored relative to the assembled pose; the vertex shader adds each group's offset */
  return { n, pos: P.subarray(0, n * 3), grp: grp.subarray(0, n), grpF: grpF.subarray(0, n), rnd: rnd.subarray(0, n) };
}

/* ---------- The floor ----------
   Tile seams every 24 in (0.6096 m) round the robot's tile, as dots. Laid out a tile further
   ahead than they show, so the floor can slide a whole tile when it drives off; the shader fades
   them by distance from the robot. */
function tileSeams(G) {
  const R = FLOOR_R, step = 0.016, pts = [];
  for (const s of [-1.5 * TILE, -0.5 * TILE, 0.5 * TILE, 1.5 * TILE]) for (let z = -R - TILE; z <= R; z += step) pts.push(s, 0, z);
  for (const s of [-2.5 * TILE, -1.5 * TILE, -0.5 * TILE, 0.5 * TILE, 1.5 * TILE]) for (let x = -R; x <= R; x += step) pts.push(x, 0, s);
  const n = pts.length / 3, geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(pts), 3));
  geo.setAttribute("aFade", new THREE.BufferAttribute(new Float32Array(n).fill(1), 1));
  geo.setAttribute("aRand", new THREE.BufferAttribute(new Float32Array(n), 1));
  geo.setAttribute("aGroup", new THREE.BufferAttribute(new Float32Array(n).fill(G), 1));
  return geo;
}
