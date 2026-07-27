"use client";

// BlackHoleContact — faithful port of the "Blackhole Header" mock
// (Gargantua engine, checkpoint 1) into a Contact-section backdrop.
//
// This is a PORT, not a reinterpretation: the drawing code below follows the
// mock's engine almost line-for-line — streak-line disk particles, layered
// blur-filtered halo arcs over the horizon, the photon ring, the fBm
// domain-warped nebula textures, the persistent "smoke" buffer the pointer
// stirs. Only these things differ from the mock, deliberately:
//
//   • Geometry: "Ascent" composition — the hole's centre sits BELOW the
//     section so the horizon rises from the bottom edge (mock mode 'rise'),
//     while the rendering uses the full 'gargantua' treatment (flare arcs,
//     halo, warp + nebula scenes).
//   • Accent is the site's #ff004f instead of the mock's default #FFB169.
//   • Integration safety: the canvas never blocks the contact form. In the
//     hole scene only a cap-shaped button over the visible black circle is
//     clickable (mock: click within 1.7R). In the nebula scene the backdrop
//     accepts clicks anywhere (mock behaviour: click anywhere returns) —
//     the form and its buttons sit above and keep working.
//   • rAF only runs while the section is on screen (IntersectionObserver);
//     prefers-reduced-motion gets a single static frame.
//
// Textures are baked asynchronously in 40ms steps after mount (mock's
// _buildNebulaTexAsync) so the first warp lands instantly without jank.
//
// The nebula scene also composites four PAINTED plates from
// public/images/nebula/ over the procedural layers — a full-frame backdrop, a
// dust ring, a glowing core, and an unused crystal. See the PLATE_* config
// below for what each one does and why. They load lazily and independently:
// if none arrive, the scene renders exactly as it did before they existed.

import { useEffect, useRef, useState } from "react";

/* ============================================================
 * Config
 * ============================================================ */
// 2a "Gargantua II" accent — warm blazing orange (the mock's default).
const ACCENT = { r: 255, g: 177, b: 105 }; // #ffb169

// Horizon composition: the event horizon rises from the bottom of the
// section, with its crest INSIDE the bottom-padding stage — i.e. fully
// below the send button, never behind the form. The treatment AROUND the
// circle follows 2a (layered blurred halo, flare bands, front band,
// photon ring), with one correction: blur/line widths scale with R,
// because 2a's fixed pixel values only look soft at 2a's small radius —
// at horizon scale they render as crisp drawn lines.
const STAGE_MAX = 400; // px — max height of the horizon's stage strip

// Mild dimmer for the big glow layers so the light show stays behind the
// content (the mock ran fullscreen with nothing to protect).
const GLOW = 0.8;
const WARP_MS = 2500; // mock: warpK over 2.5s
const WARP_OUT_MS = 1600; // return trip: nebula rushes past, then black, then the hole fades in
const TEX_W = 640;
const TEX_H = 360;

/* ------------------------------------------------------------------
 * Painted plates (public/images/nebula/)
 *
 * The procedural fBm textures above give the nebula *motion* — they drift,
 * breathe and can be stirred by the pointer — but value noise can't invent
 * the kind of structure a painted plate has (filament hierarchy, dust lane
 * silhouettes, believable star-forming knots). So we do both: the painted
 * backdrop supplies structure, the procedural layers supply life on top.
 *
 * These are plain <img> loads drawn straight to canvas, NOT next/image.
 * next/image is a DOM component and gives you an <img> element it controls;
 * canvas needs a decoded bitmap it can hand to drawImage, so the optimiser
 * has nothing to do here. That also means the files must already be sized
 * and compressed on disk — see Component/prep_nebula.py, which derives them
 * from the source art.
 *
 * `crystal` ships DISABLED. It's a faceted solid, and a hard-edged crystal
 * sitting in a gas cloud reads as fantasy art rather than astrophotography.
 * Flip PLATE_CRYSTAL to true to try it; the layer is wired up and waiting.
 * ------------------------------------------------------------------ */
const PLATE_SRC = {
  backdrop: "/images/nebula/backdrop.jpg",
  coreGlow: "/images/nebula/core-glow.webp",
  ring: "/images/nebula/ring.webp",
  crystal: "/images/nebula/crystal.webp",
} as const;

type PlateName = keyof typeof PLATE_SRC;

const PLATE_CRYSTAL = false;

// Pointer-stir smoke buffer, DISABLED.
//
// It kept a persistent copy of the composite and relaxed it toward the live
// frame at 4% each tick, displacing it around pointer swipes so the gas
// smeared where you dragged. Two problems: the 96% carry-over means every
// frame is mostly a stale frame, which reads as smeary rather than gaseous;
// and it turns any hard edge in the composite into a long streak, which is
// what made the painted plate look like torn paper. With it off, the frame
// drawn is the live composite.
//
// Set true to bring the effect back — all the machinery is intact, and the
// `dist`/`smoke`/`tmp` fields on Sys exist only to serve it.
const SMOKE_STIR = false;

// The procedural fBm gas stack — the "fog". Turned OFF: with the painted
// plates carrying the structure, the fog layers mostly muddied them.
//
// Everything else stays: the painted backdrop, the ring and core plates, the
// central light, the star fields, the vignette and grain. Set true to bring
// the fog back — every L() call is intact, this flag just makes L a no-op.
const PROCEDURAL_GAS = false;

// Grading passes applied to the finished composite. Original values were
// 0.32 / 0.42 / 0.25 — chosen to lift the procedural gas, which is no longer
// what's being graded. Lower `saturation` to move the frame back toward
// backdrop.jpg's colour; 0 disables the purple push entirely.
const FINISH = {
  contrast: 0.32,
  saturation: 0.42,
  grain: 0.25,
};

// Global damping on the gas layers' motion. The mock ran these fast enough to
// read as "churning"; over a painted backdrop that same speed reads as the
// whole sky sliding around. `drift` scales how far layers travel, `speed`
// scales how fast every oscillator runs (drift, wobble, breathing, spin).
// Lower = calmer. At speed 0.5 a full drift cycle takes ~2 minutes.
const GAS_MOTION = {
  drift: 0.45,
  speed: 0.5,
};

// The central light. The reference plate's core is a compact, radiant sphere
// sitting in a dark dust cavity — not a broad warm wash, which is what the
// mock's three stacked radial gradients produced. Radii are fractions of the
// viewport height so the composition holds at any aspect ratio.
const CORE = {
  // Hot centre. Kept SMALL and weak deliberately: the core's substance comes
  // from the painted plate and the star cluster drawn over it. Anything much
  // above ~0.05 turns into a white disc that erases both.
  sphere: 0.048,
  bloom: 0.34, // soft falloff around it — wide and weak
  ambient: 0.5, // the broad warm wash, well below the sphere in intensity
  rayReach: 1.05, // how far the ray starburst extends
  rayAlpha: 0.24,
  raySpin: 0.0000009,
  // Stars in the nursery. These are what you resolve when you look closely,
  // so there need to be enough of them to read as a cluster rather than
  // scattered dots.
  clusterCount: 150,
  clusterSpread: 0.05, // fraction of viewport width
};

// How hard the painted plates sit in the mix.
//
// IMPORTANT — why the backdrop is drawn TWICE. Putting it down as the ground
// layer alone does almost nothing: fourteen procedural layers go on top, the
// `screen` group lifts its darks and the `multiply` dust group crushes what's
// left, and the painting ends up invisible. Measured on the real plate, the
// correlation between the final frame's luminance and the backdrop's was
// -0.15 as the ground layer — statistically indistinguishable from not
// drawing it at all.
//
// So: `backdrop` lays the colour foundation underneath, then `backdropTop`
// re-asserts the same plate over the finished gas stack, which is what
// actually makes its structure readable (correlation 0.87 at 0.40). The
// finishing passes after it — overlay contrast, saturation, grain — then run
// over both families and bind them together.
//
// To rebalance: `backdropTop` is the one number that matters. Higher =
// photo-led, lower = procedural-led. Past ~0.55 the animation stops reading.
const PLATE_ALPHA = {
  backdrop: 0.72, // ground pass, under the gas
  backdropTop: 0.4, // re-assert pass, over the gas ← tune this one
  proceduralBase: 0.46, // was 0.97 when the procedural wash WAS the ground
  // Global scale on the procedural `screen` group while a backdrop is in play.
  // Those layers were balanced against a flat near-black ground and overdrive
  // once there's a lit painting under them.
  screenMix: 0.75,
  coreGlow: 0.44,
  ring: 0.34,
  crystal: 0.34,
} as const;

/* ============================================================
 * Types for the mutable system (kept loose — this is a port of
 * imperative canvas code, not a data model)
 * ============================================================ */
type Part = { a: number; r: number; br: number; pull: number; fade: number; wAng: number };
type Star = { x: number; y: number; s: number; al: number; tw: number };
type Spot = { x: number; y: number; r: number; al: number; tw: number; warm: boolean };
type Blob = { x: number; y: number; r: number; c: string; al: number };
type Dist = { x: number; y: number; vx: number; vy: number; curl: number; r: number; life: number };
type NebStar = Star & { z: number; col: string };
type LayerMotion = {
  dx: number; dy: number; f1: number; f2: number; p1: number; p2: number; p3: number;
  rot: number; wob: number; fw: number; sc: number; fsc: number; oa: number; fo: number;
};

type Geo = {
  cx: number; cy: number; R: number; tilt: number;
  rIn: number; rOut: number; n: number; dir: number; infall: number;
};

type Sys = {
  w: number; h: number; dpr: number;
  g: Geo | null;
  parts: Part[];
  stars: Star[];
  spots: Spot[];
  nebulaBlobs: Blob[];
  scene: "hole" | "nebula";
  warp: number | null;
  warpOut: number | null;
  holeBorn: number | null;
  nebulaBorn: number;
  zoomed: boolean;
  last: number;
  raf: number;
  reduced: boolean;
  mobile: boolean;
  // nebula machinery (all mock names kept)
  nebTex: Record<string, HTMLCanvasElement> | null;
  texWip: Record<string, HTMLCanvasElement> | null;
  neb: {
    stars: NebStar[];
    bright: { x: number; y: number; r: number; tw: number; col: string }[];
    cluster: { x: number; y: number; s: number; al: number; tw: number; col: string }[];
  } | null;
  nebBase: HTMLCanvasElement | null;
  smoke: HTMLCanvasElement | null;
  tmp: HTMLCanvasElement | null;
  smokeInit: boolean;
  // Painted plates, populated asynchronously. A missing key just means that
  // layer is skipped this frame — the scene degrades to pure-procedural
  // rather than failing, so a slow network or a 404 can never break the
  // easter egg.
  plates: Partial<Record<PlateName, HTMLImageElement>>;
  grainPat: CanvasPattern | null;
  lm: Record<string, LayerMotion>;
  dist: Dist[];
  pvx: number;
  pvy: number;
};

/* ============================================================
 * fBm noise — ported verbatim from the mock's _makeFbm.
 * Value noise on a 128² wrapped grid, 6 octaves, smoothstep blend.
 * ============================================================ */
function makeFbm(seed: number) {
  let a = seed | 0;
  const rand = () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const N = 128;
  const grid = new Float32Array(N * N);
  for (let i = 0; i < N * N; i++) grid[i] = rand();
  const sm = (v: number) => v * v * (3 - 2 * v);
  const noise = (x: number, y: number) => {
    const xi = Math.floor(x);
    const yi = Math.floor(y);
    const xf = sm(x - xi);
    const yf = sm(y - yi);
    const x0 = xi & (N - 1);
    const y0 = yi & (N - 1);
    const x1 = (x0 + 1) & (N - 1);
    const y1 = (y0 + 1) & (N - 1);
    const a0 = grid[y0 * N + x0];
    const b0 = grid[y0 * N + x1];
    const c0 = grid[y1 * N + x0];
    const d0 = grid[y1 * N + x1];
    return a0 + (b0 - a0) * xf + (c0 - a0) * yf + (a0 - b0 - c0 + d0) * xf * yf;
  };
  return (x: number, y: number) => {
    let v = 0;
    let amp = 0.5;
    let f = 1;
    for (let o = 0; o < 6; o++) {
      v += noise(x * f, y * f) * amp;
      amp *= 0.55;
      f *= 2.05;
    }
    return v / 1.08;
  };
}

/* ============================================================
 * Nebula texture baker — mock's _makeNebulaTex, verbatim.
 * Per-pixel: domain-warped fBm mapped through colour stops.
 * stops: [pos, r, g, b, alpha][]
 * ============================================================ */
type TexOpts = {
  scale?: number; warp?: number; lo?: number; span?: number;
  ridged?: boolean; swirl?: { x: number; y: number; k: number };
};

function makeNebulaTex(
  tw: number, th: number, seed: number,
  stops: number[][], opts: TexOpts = {},
): HTMLCanvasElement {
  const fbm = makeFbm(seed);
  const wf = makeFbm(seed * 7 + 13);
  const cv = document.createElement("canvas");
  cv.width = tw;
  cv.height = th;
  const c2 = cv.getContext("2d")!;
  const img = c2.createImageData(tw, th);
  const d = img.data;
  const S = opts.scale || 3.2;
  const W = opts.warp != null ? opts.warp : 3.1;
  const lo = opts.lo != null ? opts.lo : 0.28;
  const span = opts.span != null ? opts.span : 0.5;
  const sw = opts.swirl;
  const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
  for (let y = 0; y < th; y++) {
    for (let x = 0; x < tw; x++) {
      let ux = x / tw;
      let uy = y / th;
      if (sw) {
        const dx = ux - sw.x;
        const dy = uy - sw.y;
        const dd = Math.sqrt(dx * dx + dy * dy);
        const ang = sw.k * Math.exp(-dd * 3.2);
        const ca = Math.cos(ang);
        const sa = Math.sin(ang);
        ux = sw.x + dx * ca - dy * sa;
        uy = sw.y + dx * sa + dy * ca;
      }
      const nx = ux * S;
      const ny = uy * S;
      const qx = wf(nx + 5.2, ny + 1.3);
      const qy = wf(nx + 1.7, ny + 9.2);
      let n = fbm(nx + W * qx, ny + W * qy);
      if (opts.ridged) {
        n = 1 - Math.abs(2 * n - 1);
        n = n * n * n;
      }
      n = clamp01((n - lo) / span);
      let s0 = stops[0];
      let s1 = stops[stops.length - 1];
      for (let i = 0; i < stops.length - 1; i++) {
        if (n >= stops[i][0] && n <= stops[i + 1][0]) {
          s0 = stops[i];
          s1 = stops[i + 1];
          break;
        }
      }
      const k = s1[0] === s0[0] ? 0 : (n - s0[0]) / (s1[0] - s0[0]);
      const idx = (y * tw + x) * 4;
      d[idx] = s0[1] + (s1[1] - s0[1]) * k;
      d[idx + 1] = s0[2] + (s1[2] - s0[2]) * k;
      d[idx + 2] = s0[3] + (s1[3] - s0[3]) * k;
      d[idx + 3] = (s0[4] + (s1[4] - s0[4]) * k) * 255;
    }
  }
  c2.putImageData(img, 0, 0);
  return cv;
}

/**
 * Ray starburst — the spokes of light radiating from the core.
 *
 * Baked once into a texture rather than drawn per-frame. Fifteen gradient-
 * filled wedges is fifteen gradient allocations every frame if done live; as a
 * texture it's a single rotating drawImage, and rotation is the only animation
 * it needs.
 *
 * The rays are deliberately uneven in length, width and spacing. Evenly spaced
 * identical spokes read as a cartoon sunburst; real light scattered through
 * dust is ragged.
 */
function makeRayTex(size: number, seed: number, count = 30): HTMLCanvasElement {
  const src = document.createElement("canvas");
  src.width = src.height = size;
  const c = src.getContext("2d")!;

  let a = seed | 0;
  const rand = () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  const R = size / 2;
  c.translate(R, R);
  c.globalCompositeOperation = "lighter";
  for (let i = 0; i < count; i++) {
    const ang = (i / count) * Math.PI * 2 + (rand() - 0.5) * 0.6;
    const len = R * (0.25 + rand() * 0.75);
    // Narrow. An early pass used widths up to 0.065R and the result was a
    // lens flare — light scattered through dust is threadlike, and the
    // impression of "rays" comes from many fine streaks, not a few fat wedges.
    const wid = R * (0.004 + rand() * 0.016);
    // Uneven brightness per ray, for the same reason.
    const k = 0.35 + rand() * 0.65;
    const g = c.createLinearGradient(0, 0, len, 0);
    g.addColorStop(0, `rgba(255,242,220,${0.8 * k})`);
    g.addColorStop(0.2, `rgba(255,206,150,${0.26 * k})`);
    g.addColorStop(1, "rgba(255,176,116,0)");
    c.save();
    c.rotate(ang);
    c.fillStyle = g;
    // Tapered wedge: wide at the core, pinched to a near-point at the tip.
    c.beginPath();
    c.moveTo(0, -wid);
    c.lineTo(len, -wid * 0.12);
    c.lineTo(len, wid * 0.12);
    c.lineTo(0, wid);
    c.closePath();
    c.fill();
    c.restore();
  }

  // Blur pass. Hard-edged wedges look like a vector star; a few px of blur is
  // what turns them into light scattering through gas.
  const out = document.createElement("canvas");
  out.width = out.height = size;
  const o = out.getContext("2d")!;
  o.filter = `blur(${Math.max(2, size / 110)}px)`;
  o.drawImage(src, 0, 0);
  return out;
}

// The mock's full texture list (_nebTexList) — names and stops verbatim.
function nebTexList(): [string, () => HTMLCanvasElement][] {
  return [
    ["base", () => makeNebulaTex(TEX_W, TEX_H, 101, [
      [0, 8, 7, 24, 1], [0.3, 22, 20, 66, 1], [0.55, 44, 44, 118, 1],
      [0.78, 76, 84, 168, 1], [1, 138, 148, 218, 1],
    ], { scale: 2.7, warp: 3.6 })],
    ["pink", () => makeNebulaTex(TEX_W, TEX_H, 202, [
      [0, 46, 14, 72, 0], [0.42, 92, 34, 128, 0.1], [0.6, 158, 62, 148, 0.52],
      [0.8, 214, 118, 178, 0.8], [1, 250, 216, 234, 0.95],
    ], { scale: 3.3, lo: 0.33, span: 0.42 })],
    ["cyan", () => makeNebulaTex(TEX_W, TEX_H, 808, [
      [0, 8, 38, 68, 0], [0.45, 18, 82, 118, 0.1], [0.64, 36, 132, 158, 0.45],
      [0.83, 82, 178, 194, 0.68], [1, 182, 232, 234, 0.85],
    ], { scale: 4.1, lo: 0.35, span: 0.4 })],
    ["white", () => makeNebulaTex(TEX_W, TEX_H, 303, [
      [0, 255, 236, 226, 0], [0.64, 255, 236, 226, 0],
      [0.82, 255, 228, 212, 0.4], [1, 255, 251, 246, 0.9],
    ], { lo: 0.3, span: 0.46 })],
    ["dust", () => makeNebulaTex(TEX_W, TEX_H, 404, [
      [0, 8, 5, 16, 0.55], [0.3, 18, 10, 18, 0.25], [0.46, 0, 0, 0, 0], [1, 0, 0, 0, 0],
    ], { lo: 0.34, span: 0.26 })],
    ["dust2", () => makeNebulaTex(TEX_W, TEX_H, 909, [
      [0, 0, 0, 0, 0], [0.56, 0, 0, 0, 0], [0.72, 8, 5, 14, 0.45], [1, 3, 2, 8, 0.75],
    ], { ridged: true, scale: 5.8, lo: 0.02, span: 0.48 })],
    ["ember", () => makeNebulaTex(TEX_W, TEX_H, 505, [
      [0, 80, 30, 8, 0], [0.55, 150, 60, 15, 0.05], [0.72, 235, 112, 42, 0.4],
      [0.87, 255, 164, 74, 0.65], [1, 255, 222, 172, 0.8],
    ], { scale: 4.6, lo: 0.34, span: 0.42 })],
    ["fil", () => makeNebulaTex(TEX_W, TEX_H, 606, [
      [0, 60, 120, 180, 0], [0.55, 90, 160, 220, 0], [0.7, 120, 200, 240, 0.36],
      [0.85, 190, 165, 255, 0.62], [1, 242, 238, 255, 0.9],
    ], { ridged: true, scale: 5.2, lo: 0.04, span: 0.66, swirl: { x: 0.6, y: 0.42, k: 2.4 } })],
    ["hair", () => makeNebulaTex(TEX_W, TEX_H, 111, [
      [0, 180, 200, 255, 0], [0.6, 190, 210, 255, 0],
      [0.78, 210, 225, 255, 0.28], [1, 238, 242, 255, 0.6],
    ], { ridged: true, scale: 11, warp: 1.5, lo: 0.03, span: 0.7 })],
    ["knots", () => makeNebulaTex(TEX_W, TEX_H, 707, [
      [0, 255, 200, 220, 0], [0.72, 255, 200, 225, 0],
      [0.86, 255, 220, 235, 0.35], [1, 255, 246, 250, 0.75],
    ], { scale: 10.5, warp: 2, lo: 0.4, span: 0.5 })],
    ["rays", () => makeRayTex(768, 424)],
    ["grain", () => {
      const cv = document.createElement("canvas");
      cv.width = 128;
      cv.height = 128;
      const c2 = cv.getContext("2d")!;
      const img = c2.createImageData(128, 128);
      for (let i = 0; i < img.data.length; i += 4) {
        const v = (100 + Math.random() * 90) | 0;
        img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
        img.data[i + 3] = 255;
      }
      c2.putImageData(img, 0, 0);
      return cv;
    }],
  ];
}

/* ============================================================
 * Component
 * ============================================================ */
export default function BlackHoleContact({
  onVeilChange,
}: {
  // Fired with `true` when the warp-in starts and `false` when the return
  // trip lands — lets the parent section fade its content (form, buttons)
  // out of the shot while the camera is travelling.
  onVeilChange?: (veiled: boolean) => void;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sysRef = useRef<Sys | null>(null);
  // Ref so the rAF loop (created once in the effect) always sees the
  // latest callback without re-running the effect.
  const veilRef = useRef(onVeilChange);
  veilRef.current = onVeilChange;

  const [uiScene, setUiScene] = useState<"hole" | "nebula">("hole");
  const [reduced, setReduced] = useState(false);
  // Clickable cap over the VISIBLE part of the black circle (px, canvas space).
  const [cap, setCap] = useState<{ left: number; top: number; width: number; height: number } | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    setReduced(prefersReduced);

    const sys: Sys = {
      w: 0, h: 0, dpr: 1, g: null,
      parts: [], stars: [], spots: [], nebulaBlobs: [],
      scene: "hole", warp: null, warpOut: null, holeBorn: null, nebulaBorn: 0, zoomed: false,
      last: 0, raf: 0, reduced: prefersReduced, mobile: false,
      nebTex: null, texWip: null, neb: null,
      nebBase: null, smoke: null, tmp: null, smokeInit: false,
      plates: {},
      grainPat: null, lm: {}, dist: [], pvx: 0, pvy: 0,
    };
    sysRef.current = sys;

    const ac = ACCENT;
    const acc = (a: number) => `rgba(${ac.r},${ac.g},${ac.b},${a})`;
    const hot = (a: number) =>
      `rgba(${Math.round(ac.r + (255 - ac.r) * 0.75)},${Math.round(ac.g + (255 - ac.g) * 0.75)},${Math.round(ac.b + (255 - ac.b) * 0.75)},${a})`;
    const rd = (a: number) =>
      `rgba(${Math.round(ac.r + (255 - ac.r) * 0.5)},${Math.round(ac.g * 0.45)},${Math.round(ac.b * 0.35)},${a})`;

    /* ---------- geometry (horizon in the bottom stage) ---------- */
    const geom = (w: number, h: number): Geo => {
      // Stage = the section's extra bottom padding. The crest (top of the
      // shadow) sits just inside it, so the circle never reaches the form.
      const stage = Math.min(h * 0.34, STAGE_MAX);
      const R = Math.min(w * 0.42, h * 0.55); // broad, flat horizon arc
      const crest = h - stage * 0.92;
      return {
        cx: w / 2,
        cy: crest + R,
        R,
        tilt: 0.3,
        rIn: 1.18,
        rOut: 2.4,
        n: w < 640 ? 260 : 520,
        dir: 1,
        infall: 3,
      };
    };

    const respawn = (p: Part, g: Geo) => {
      p.a = Math.random() * Math.PI * 2;
      p.r = g.R * (g.rIn + (g.rOut - g.rIn) * (0.55 + Math.random() * 0.45));
      p.br = 0.35 + Math.random() * 0.65;
      p.pull = 0.4 + Math.random() * 1.3;
      p.fade = 0;
    };

    /* ---------- resize (mock's _resize, gargantua branch) ---------- */
    const resize = () => {
      const cw = wrap.clientWidth;
      const ch = wrap.clientHeight;
      if (!cw || !ch || (cw === sys.w && ch === sys.h)) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 1.75);
      sys.w = cw;
      sys.h = ch;
      sys.dpr = dpr;
      sys.mobile = cw < 640;
      canvas.width = Math.round(cw * dpr);
      canvas.height = Math.round(ch * dpr);
      const g = geom(cw, ch);
      sys.g = g;

      sys.parts = [];
      for (let i = 0; i < g.n; i++) {
        const p: Part = { a: 0, r: 0, br: 0, pull: 0, fade: 0, wAng: 0 };
        respawn(p, g);
        p.r = g.R * (g.rIn + (g.rOut - g.rIn) * Math.pow(Math.random(), 0.7));
        p.fade = 1;
        sys.parts.push(p);
      }

      sys.stars = [];
      const nStars = sys.mobile ? 320 : 750;
      for (let i = 0; i < nStars; i++) {
        sys.stars.push({
          x: Math.random() * cw, y: Math.random() * ch,
          s: Math.random() * 1.5 + 0.3, al: 0.12 + Math.random() * 0.55,
          tw: Math.random() * 6.28,
        });
      }

      sys.spots = [];
      for (let i = 0; i < (sys.mobile ? 12 : 26); i++) {
        sys.spots.push({
          x: Math.random() * cw, y: Math.random() * ch,
          r: 1.2 + Math.random() * 2.6, al: 0.35 + Math.random() * 0.5,
          tw: Math.random() * 6.28, warm: Math.random() < 0.45,
        });
      }

      const cols = ["130,80,210", "190,85,170", "75,95,215", "150,70,190"];
      sys.nebulaBlobs = [];
      for (let i = 0; i < 7; i++) {
        sys.nebulaBlobs.push({
          x: Math.random() * cw, y: Math.random() * ch,
          r: ch * (0.25 + Math.random() * 0.45),
          c: cols[i % cols.length], al: 0.05 + Math.random() * 0.07,
        });
      }

      // Nebula scene state depends on size — rebuild lazily.
      sys.neb = null;
      sys.nebBase = null;

      // Click target = the VISIBLE part of the black circle: from the
      // crest down to the section bottom, as wide as the circle's chord
      // where it meets the bottom edge.
      const crest = g.cy - g.R;
      const dyBottom = g.cy - ch;
      const halfChord = Math.sqrt(Math.max(g.R * g.R - dyBottom * dyBottom, 0));
      // Inset the button so its rounded-ellipse top stays strictly INSIDE
      // the circle (a full-chord ellipse pokes past the black near the
      // crest, putting the pointer cursor over glow instead of black mass).
      setCap({
        left: g.cx - halfChord * 0.86,
        top: crest + 14,
        width: halfChord * 2 * 0.86,
        height: ch - crest - 14,
      });
    };

    /* ---------- hole frame (mock's _frame, gargantua branch) ---------- */
    const holeFrame = (t: number) => {
      const g = sys.g!;
      const w = sys.w;
      const h = sys.h;
      const speed = 1;
      const dt = sys.reduced ? 0 : Math.min(Math.max((t - (sys.last || t)) / 1000, 0), 0.05);
      sys.last = t;

      ctx.setTransform(sys.dpr, 0, 0, sys.dpr, 0, 0);
      ctx.globalCompositeOperation = "source-over";
      ctx.fillStyle = "#05060a";
      ctx.fillRect(0, 0, w, h);

      // warp transition — zoom toward the visible black, then hand to nebula
      let warpK = 0;
      if (sys.warp != null) {
        warpK = (t - sys.warp) / WARP_MS;
        if (warpK >= 1) {
          sys.warp = null;
          sys.scene = "nebula";
          sys.nebulaBorn = t;
          setUiScene("nebula");
          initNebula();
          nebulaFrame(t);
          return;
        }
        const z = 1 + 34 * warpK * warpK * warpK;
        // Zoom toward the visible black between crest and section bottom
        // (the circle's centre is below the viewport).
        const zy = Math.min(g.cy, (g.cy - g.R + h) / 2 + 40);
        ctx.save();
        ctx.translate(g.cx, zy);
        ctx.scale(z, z);
        ctx.translate(-g.cx, -zy);
        sys.zoomed = true;
      }

      // faint violet nebula blobs behind everything
      ctx.globalCompositeOperation = "lighter";
      for (const nb of sys.nebulaBlobs) {
        const ng = ctx.createRadialGradient(nb.x, nb.y, 0, nb.x, nb.y, nb.r);
        ng.addColorStop(0, `rgba(${nb.c},${nb.al})`);
        ng.addColorStop(1, `rgba(${nb.c},0)`);
        ctx.fillStyle = ng;
        ctx.beginPath();
        ctx.arc(nb.x, nb.y, nb.r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalCompositeOperation = "source-over";

      // stars
      for (const s of sys.stars) {
        const tw = 0.7 + 0.3 * Math.sin(t / 900 + s.tw);
        ctx.fillStyle = `rgba(220,228,255,${s.al * tw})`;
        ctx.fillRect(s.x, s.y, s.s, s.s);
      }

      // bright white/warm glow spots
      ctx.globalCompositeOperation = "lighter";
      for (const sp of sys.spots) {
        const tw = 0.55 + 0.45 * Math.sin(t / 1600 + sp.tw);
        const col = sp.warm ? "255,225,160" : "235,240,255";
        const sg = ctx.createRadialGradient(sp.x, sp.y, 0, sp.x, sp.y, sp.r * 4);
        sg.addColorStop(0, `rgba(${col},${sp.al * tw})`);
        sg.addColorStop(0.35, `rgba(${col},${sp.al * tw * 0.25})`);
        sg.addColorStop(1, `rgba(${col},0)`);
        ctx.fillStyle = sg;
        ctx.beginPath();
        ctx.arc(sp.x, sp.y, sp.r * 4, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalCompositeOperation = "source-over";

      // update particles
      for (const p of sys.parts) {
        const wAng = 1.5 * Math.pow(g.R / p.r, 1.5) * speed * g.dir;
        p.wAng = wAng;
        p.a += wAng * dt;
        p.r -= g.infall * (g.R / p.r) * p.pull * speed * dt * (g.R / 100);
        p.fade = Math.min(1, (p.fade ?? 1) + dt * 1.2);
        if (p.r < g.R * g.rIn * 0.92) respawn(p, g);
      }

      ctx.globalCompositeOperation = "lighter";
      ctx.lineCap = "round";

      // disk particles as short motion streaks (this is what makes the disk
      // read as swirling plasma instead of dots)
      const drawParts = (front: boolean | null) => {
        for (const p of sys.parts) {
          const sa = Math.sin(p.a);
          if (front !== null && (sa > 0) !== front) continue;
          const heat = Math.min(Math.max((g.rOut * g.R - p.r) / (g.R * (g.rOut - g.rIn)), 0), 1);
          const dop = 0.45 + 0.55 * Math.pow((Math.cos(p.a) + 1) / 2, 1.4); // Doppler
          const ease = p.fade * p.fade * (3 - 2 * p.fade);
          const alpha = p.br * dop * (0.18 + 0.72 * heat * heat) * ease;
          const mix = heat * heat;
          const cr = Math.round(ac.r + (255 - ac.r) * mix * 0.8);
          const cg = Math.round(ac.g + (255 - ac.g) * mix * 0.8);
          const cb = Math.round(ac.b + (255 - ac.b) * mix * 0.8);
          const a0 = p.a - p.wAng * 0.14;
          const x0 = g.cx + Math.cos(a0) * p.r;
          const y0 = g.cy + Math.sin(a0) * p.r * g.tilt;
          const x1 = g.cx + Math.cos(p.a) * p.r;
          const y1 = g.cy + sa * p.r * g.tilt;
          ctx.strokeStyle = `rgba(${cr},${cg},${cb},${alpha})`;
          ctx.lineWidth = 0.9 + heat * 1.1;
          ctx.beginPath();
          ctx.moveTo(x0, y0);
          ctx.lineTo(x1, y1);
          ctx.stroke();
        }
      };

      // disk plane glow (flattened annulus)
      ctx.save();
      ctx.translate(g.cx, g.cy);
      ctx.scale(1, g.tilt);
      const dg = ctx.createRadialGradient(0, 0, g.R * 1.2, 0, 0, g.R * g.rOut * 0.95);
      dg.addColorStop(0, acc(0.22 * GLOW));
      dg.addColorStop(0.35, acc(0.09 * GLOW));
      dg.addColorStop(1, acc(0));
      ctx.fillStyle = dg;
      ctx.beginPath();
      ctx.arc(0, 0, g.R * g.rOut, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // back half of the disk
      drawParts(false);

      // wide horizontal disk flare
      ctx.save();
      ctx.translate(g.cx, g.cy);
      ctx.scale(1, 0.05);
      const fg = ctx.createRadialGradient(0, 0, g.R * 0.6, 0, 0, w * 0.54);
      fg.addColorStop(0, hot(0.95 * GLOW));
      fg.addColorStop(0.12, acc(0.6 * GLOW));
      fg.addColorStop(0.45, rd(0.24 * GLOW));
      fg.addColorStop(1, rd(0));
      ctx.fillStyle = fg;
      ctx.beginPath();
      ctx.arc(0, 0, w * 0.54, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      // thicker inner band
      ctx.save();
      ctx.translate(g.cx, g.cy);
      ctx.scale(1, 0.14);
      const fg2 = ctx.createRadialGradient(0, 0, g.R * 0.5, 0, 0, g.R * 3.4);
      fg2.addColorStop(0, hot(0.55 * GLOW));
      fg2.addColorStop(0.35, acc(0.3 * GLOW));
      fg2.addColorStop(1, rd(0));
      ctx.fillStyle = fg2;
      ctx.beginPath();
      ctx.arc(0, 0, g.R * 3.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // lensed halo — layered blurred arcs over the top of the horizon.
      // Radii/widths are kept TIGHT (≤1.16R) so the halo reads as light
      // hugging the crest, not a wash flooding the space above it.
      ctx.save();
      ctx.filter = `blur(${Math.max(4, g.R * 0.16)}px)`;
      ctx.strokeStyle = rd(0.38 * GLOW);
      ctx.lineWidth = g.R * 0.26;
      ctx.beginPath();
      ctx.arc(g.cx, g.cy, g.R * 1.16, Math.PI * 1.02, Math.PI * 1.98);
      ctx.stroke();
      ctx.filter = `blur(${Math.max(3, g.R * 0.1)}px)`;
      ctx.strokeStyle = hot(0.45 * GLOW);
      ctx.lineWidth = g.R * 0.13;
      ctx.beginPath();
      ctx.arc(g.cx, g.cy, g.R * 1.1, Math.PI * 1.06, Math.PI * 1.94);
      ctx.stroke();
      ctx.filter = `blur(${Math.max(2.5, g.R * 0.05)}px)`;
      ctx.strokeStyle = hot(0.5 * GLOW);
      ctx.lineWidth = g.R * 0.06;
      ctx.beginPath();
      ctx.arc(g.cx, g.cy, g.R * 1.06, Math.PI * 1.12, Math.PI * 1.88);
      ctx.stroke();
      ctx.restore();

      // soft glow hugging the horizon — outer radius pulled way in
      // (1.9R → 1.24R): rim light, not a sky wash.
      const hg0 = ctx.createRadialGradient(g.cx, g.cy, g.R * 0.98, g.cx, g.cy, g.R * 1.24);
      hg0.addColorStop(0, hot(0.4 * GLOW));
      hg0.addColorStop(0.3, acc(0.18 * GLOW));
      hg0.addColorStop(1, rd(0));
      ctx.fillStyle = hg0;
      ctx.beginPath();
      ctx.arc(g.cx, g.cy, g.R * 1.24, 0, Math.PI * 2);
      ctx.fill();

      // event horizon
      ctx.globalCompositeOperation = "source-over";
      ctx.fillStyle = "#000";
      ctx.beginPath();
      ctx.arc(g.cx, g.cy, g.R, 0, Math.PI * 2);
      ctx.fill();

      // photon ring — blur and width scale with R so it reads as diffuse
      // light at horizon scale (2a's fixed 2.5px only looks soft at small R)
      ctx.globalCompositeOperation = "lighter";
      const pr = g.R * 1.03;
      ctx.filter = `blur(${Math.max(2.5, g.R * 0.014)}px)`;
      ctx.strokeStyle = hot(0.85);
      ctx.lineWidth = Math.max(1.6, g.R * 0.006);
      ctx.beginPath();
      ctx.arc(g.cx, g.cy, pr, 0, Math.PI * 2);
      ctx.stroke();
      ctx.filter = `blur(${Math.max(4, g.R * 0.03)}px)`;
      ctx.strokeStyle = acc(0.3);
      ctx.lineWidth = Math.max(5, g.R * 0.016);
      ctx.beginPath();
      ctx.arc(g.cx, g.cy, pr * 1.03, 0, Math.PI * 2);
      ctx.stroke();
      ctx.filter = "none";

      // 2a signature: bright band crossing in front of the horizon — drawn
      // at the CREST (the circle's centre is below the viewport) and soft-
      // blurred so it reads as blazing gas, not a stripe.
      // ctx.save();
      // ctx.filter = `blur(${Math.max(3, g.R * 0.02)}px)`;
      // ctx.translate(g.cx, g.cy - g.R * 0.98);
      // ctx.scale(1, 0.05);
      // const fb = ctx.createRadialGradient(0, 0, 0, 0, 0, g.R * 0.9);
      // fb.addColorStop(0, hot(0.7 * GLOW));
      // fb.addColorStop(0.5, acc(0.35 * GLOW));
      // fb.addColorStop(1, acc(0));
      // ctx.fillStyle = fb;
      // ctx.beginPath();
      // ctx.arc(0, 0, g.R * 0.9, 0, Math.PI * 2);
      // ctx.fill();
      // ctx.restore();

      // front half of the disk (crosses in front of the shadow)
      drawParts(true);

      // warp overlays in screen space
      if (sys.zoomed) {
        ctx.restore();
        sys.zoomed = false;
      }
      if (warpK > 0) {
        ctx.globalCompositeOperation = "lighter";
        ctx.lineCap = "round";
        const sl = warpK * warpK;
        for (const s of sys.stars) {
          const dx = s.x - g.cx;
          const dy = s.y - g.cy;
          const d = Math.sqrt(dx * dx + dy * dy) || 1;
          const len = sl * d * 0.45;
          ctx.strokeStyle = `rgba(225,232,255,${Math.min(0.8, s.al + sl * 0.5)})`;
          ctx.lineWidth = s.s * 0.9;
          ctx.beginPath();
          ctx.moveTo(s.x, s.y);
          ctx.lineTo(s.x + (dx / d) * len, s.y + (dy / d) * len);
          ctx.stroke();
        }
        ctx.globalCompositeOperation = "source-over";
        if (warpK > 0.7) {
          ctx.fillStyle = `rgba(0,0,0,${(warpK - 0.7) / 0.3})`;
          ctx.fillRect(0, 0, w, h);
        }
      }
      // fade back in after returning from the nebula
      if (sys.holeBorn != null) {
        const f = 1 - (t - sys.holeBorn) / 600;
        if (f <= 0) sys.holeBorn = null;
        else {
          ctx.fillStyle = `rgba(0,0,0,${f})`;
          ctx.fillRect(0, 0, w, h);
        }
      }
    };

    /* ---------- nebula scene (mock's _initNebula/_nebulaFrame) ---------- */
    const buildNebulaTexAsync = () => {
      const list = nebTexList();
      const wip = sys.texWip || (sys.texWip = {});
      let i = 0;
      const step = () => {
        if (sys.nebTex || !sysRef.current) return;
        while (i < list.length && wip[list[i][0]]) i++;
        if (i >= list.length) {
          sys.nebTex = wip;
          return;
        }
        wip[list[i][0]] = list[i][1]();
        window.setTimeout(step, 40);
      };
      window.setTimeout(step, 0);
    };

    // Painted plates load in parallel with the texture bake. We deliberately
    // do NOT await them anywhere: whichever plates have arrived get drawn,
    // the rest are skipped, and a later frame picks them up. decode() before
    // storing matters — a freshly-loaded image can still cost a synchronous
    // decode on its first drawImage, which would drop a frame right at the
    // moment the warp lands.
    const loadPlates = () => {
      const names = (Object.keys(PLATE_SRC) as PlateName[]).filter(
        (n) => n !== "crystal" || PLATE_CRYSTAL,
      );
      for (const name of names) {
        const img = new Image();
        img.decoding = "async";
        img.src = PLATE_SRC[name];
        const store = () => {
          if (sysRef.current) sys.plates[name] = img;
        };
        // decode() rejects on some browsers if the element isn't attached to
        // a document yet; onload is the fallback that always fires.
        img.decode?.().then(store).catch(() => {
          if (img.complete) store();
          else img.onload = store;
        });
      }
    };

    const buildNebulaTexSync = () => {
      if (sys.nebTex) return;
      const wip = sys.texWip || (sys.texWip = {});
      for (const [name, fn] of nebTexList()) if (!wip[name]) wip[name] = fn();
      sys.nebTex = wip;
    };

    const initNebula = () => {
      const w = sys.w;
      const h = sys.h;
      const fx = w * 0.6;
      const fy = h * 0.42;
      const neb: NonNullable<Sys["neb"]> = { stars: [], bright: [], cluster: [] };
      const pick = () => {
        const r = Math.random();
        return r < 0.42 ? "175,205,255" : r < 0.82 ? "246,243,236" : "255,218,158";
      };
      const gauss = () => (Math.random() + Math.random() + Math.random() - 1.5) / 1.5;
      const mob = sys.mobile ? 0.5 : 1;
      const layers: [number, number, number][] = [
        [0.2, Math.round(980 * mob), 0.42],
        [0.5, Math.round(430 * mob), 0.78],
        [1, Math.round(150 * mob), 1.12],
      ];
      for (const [z, count, size] of layers) {
        for (let i = 0; i < count; i++) {
          const cluster = Math.random() < 0.3;
          const x = cluster ? fx + gauss() * w * 0.2 : Math.random() * w;
          const y = cluster ? fy + gauss() * h * 0.22 : Math.random() * h;
          neb.stars.push({
            x: (x + w) % w, y: (y + h) % h,
            s: (0.35 + Math.random() * Math.random()) * size + (Math.random() < 0.05 ? 0.9 : 0),
            al: 0.2 + Math.random() * 0.7, tw: Math.random() * 6.28, z, col: pick(),
          });
        }
      }
      const cols = ["180,210,255", "255,248,238", "255,212,150"];
      for (let i = 0; i < 5; i++) {
        neb.bright.push({
          x: Math.random() * w, y: Math.random() * h,
          r: 1.2 + Math.random() * 1.7, tw: Math.random() * 6.28, col: cols[i % 3],
        });
      }
      for (let i = 0; i < Math.round(CORE.clusterCount * mob); i++) {
        const a = Math.random() * 6.28;
        const rr = Math.abs(gauss()) * w * CORE.clusterSpread;
        neb.cluster.push({
          x: fx + Math.cos(a) * rr, y: fy + Math.sin(a) * rr * 0.8,
          s: 0.5 + Math.random() * 1.3, al: 0.3 + Math.random() * 0.6,
          tw: Math.random() * 6.28,
          col: Math.random() < 0.6 ? "255,240,220" : "200,220,255",
        });
      }
      sys.neb = neb;
    };

    // `zoom` > 1 is used by the return animation: the whole composed scene
    // (smoke, vignette, stars) scales up from the viewport centre, as if
    // the camera is falling back out through the gas.
    const nebulaFrame = (t: number, zoom = 1) => {
      if (!sys.nebTex) buildNebulaTexSync();
      if (!sys.neb) initNebula();
      const w = sys.w;
      const h = sys.h;
      const neb = sys.neb!;
      const tex = sys.nebTex!;

      if (!sys.nebBase || sys.nebBase.width !== w || sys.nebBase.height !== h) {
        sys.nebBase = document.createElement("canvas");
        sys.nebBase.width = w;
        sys.nebBase.height = h;
        sys.smoke = document.createElement("canvas");
        sys.smoke.width = w;
        sys.smoke.height = h;
        sys.tmp = document.createElement("canvas");
        sys.tmp.width = 320;
        sys.tmp.height = 320;
        sys.smokeInit = false;
        sys.grainPat = null;
      }
      // Local non-null aliases: TypeScript drops property narrowing on
      // `sys.*` after any function call, so we bind them once here.
      const nebBase = sys.nebBase!;
      const smoke = sys.smoke!;
      const tmp = sys.tmp!;
      const b = nebBase.getContext("2d")!;

      // Per-layer motion parameters. Each named layer gets its own random
      // drift speed, rotation wobble, breathing scale and opacity flicker, so
      // no two layers move in lockstep — that's what stops a stack of
      // scrolling textures from reading as wallpaper.
      type LayerOpts = {
        spin?: number; baseRot?: number; cover?: number;
        cx?: number; cy?: number; flipX?: boolean; flipY?: boolean;
        // Scales the random translation drift. Parallax: the further a layer
        // is meant to be, the less it should travel across the frame.
        driftMul?: number;
        // Pins rotation at 0. REQUIRED for any full-frame opaque plate.
        // `rot` is driven by `t * spin` where t is performance.now(), so it
        // accumulates without bound — a "barely moving" 0.0000012 rad/ms is
        // 41° after ten minutes. A rotated rectangle no longer covers the
        // viewport, and its corners cut hard diagonal wedges across the frame.
        // Semi-transparent noise layers get away with it; a photo does not.
        noRot?: boolean;
      };

      const lmFor = (name: string): LayerMotion => {
        let m = sys.lm[name];
        if (!m) {
          m = sys.lm[name] = {
            dx: 16 + Math.random() * 26, dy: 12 + Math.random() * 20,
            f1: 0.00002 + Math.random() * 0.000024, f2: 0.000007 + Math.random() * 0.00001,
            p1: Math.random() * 6.28, p2: Math.random() * 6.28, p3: Math.random() * 6.28,
            rot: (Math.random() - 0.5) * 0.000014,
            wob: 0.008 + Math.random() * 0.018, fw: 0.00001 + Math.random() * 0.000014,
            sc: 0.015 + Math.random() * 0.028, fsc: 0.000008 + Math.random() * 0.000012,
            oa: 0.05 + Math.random() * 0.09, fo: 0.000007 + Math.random() * 0.00001,
          };
        }
        return m;
      };

      // Shared by the procedural layers (L) and the painted plates (P) so both
      // families drift with identical character — a plate that moved to a
      // different rhythm than the gas around it would separate visually.
      const drift = (m: LayerMotion, o: LayerOpts) => {
        const k = (o.driftMul != null ? o.driftMul : 1) * GAS_MOTION.drift;
        // Scaling time rather than each frequency slows every oscillator on
        // this layer — drift, wobble, breathing, spin — by one factor, so the
        // layer keeps its character and just moves through it more slowly.
        const tt = t * GAS_MOTION.speed;
        return {
          vx: (Math.sin(tt * m.f1 + m.p1) * m.dx + Math.sin(tt * m.f2 + m.p3) * m.dx * 0.8) * k,
          vy: (Math.cos(tt * m.f1 * 0.93 + m.p2) * m.dy + Math.cos(tt * m.f2 * 1.13 + m.p1) * m.dy * 0.8) * k,
          // Bounded rotation. `t * m.rot` accumulated forever — after a minute
          // or so a layer has turned far enough that its rectangle no longer
          // covers the viewport, and its corners cut visible diagonal lines
          // across the frame. Worse on wide screens, where there's less
          // vertical margin to give away. An oscillation looks the same at any
          // instant (slow, aimless turning) but can never exceed ±0.12 rad,
          // which every layer's cover factor comfortably absorbs.
          //
          // Explicit `spin` is left unbounded on purpose — it's only used on
          // plates drawn far larger than the viewport, or with transparent
          // edges, where continuous wheeling is the point and safe.
          rot: o.noRot
            ? 0
            : (o.spin ? tt * o.spin : Math.sin(tt * m.f2 * 0.5 + m.p3) * 0.12) +
              Math.sin(tt * m.fw + m.p2) * m.wob +
              (o.baseRot || 0),
          breath: 1 + Math.sin(tt * m.fsc + m.p3) * m.sc,
          fade: 1 - m.oa + Math.sin(tt * m.fo + m.p1) * m.oa,
        };
      };

      // Global scale applied to every L() alpha. Set around the `screen` group
      // so the painted backdrop isn't drowned by additive gas; reset to 1 for
      // the `multiply` dust group, whose job is to carve dark lanes back INTO
      // the frame — weakening it would work against the painting, not for it.
      let procMix = 1;

      // L — procedural texture layer. The fBm canvases are generated at
      // TEX_W×TEX_H and stretched to the viewport on purpose: value noise has
      // no "correct" scale, and stretching it costs nothing.
      const L = (
        img: HTMLCanvasElement, name: string, alpha: number, _depth: number,
        o: LayerOpts = {},
      ) => {
        if (!PROCEDURAL_GAS) return;
        const m = lmFor(name);
        const d = drift(m, o);
        const s = d.breath * (o.cover || 1.45);
        b.globalAlpha = alpha * procMix * d.fade;
        b.save();
        b.translate((o.cx != null ? o.cx : w / 2) + d.vx, (o.cy != null ? o.cy : h / 2) + d.vy);
        b.rotate(d.rot);
        b.scale(o.flipX ? -s : s, o.flipY ? -s : s);
        b.drawImage(img, -w / 2, -h / 2, w, h);
        b.restore();
        b.globalAlpha = 1;
      };

      // P — painted plate layer. Unlike L, aspect ratio MUST be respected
      // here: a stretched photograph reads as a stretched photograph, while
      // stretched noise reads as noise. Two sizing modes:
      //
      //   fit: "cover"  → fill the viewport like CSS background-size: cover
      //                   (used for the full-frame backdrop)
      //   fit: "span"   → draw at `span` × viewport width, aspect preserved
      //                   (used for the discrete ring / core objects)
      //
      // Returns false when the plate hasn't loaded, so callers can fall back.
      const P = (
        name: PlateName, key: string, alpha: number,
        o: LayerOpts & { fit?: "cover" | "span"; span?: number } = {},
      ) => {
        const img = sys.plates[name];
        if (!img || !img.width || !img.height) return false;
        const m = lmFor(key);
        const d = drift(m, o);

        let dw: number;
        if (o.fit === "cover") {
          // The extra cover factor leaves room for the drift + breathing to
          // move the plate without exposing an edge at the viewport border.
          const k = Math.max(w / img.width, h / img.height) * (o.cover || 1.14);
          dw = img.width * k;
        } else {
          dw = w * (o.span || 1);
        }
        const dh = dw * (img.height / img.width);
        const s = d.breath;

        b.globalAlpha = alpha * d.fade;
        b.save();
        b.translate((o.cx != null ? o.cx : w / 2) + d.vx, (o.cy != null ? o.cy : h / 2) + d.vy);
        b.rotate(d.rot);
        b.scale(o.flipX ? -s : s, o.flipY ? -s : s);
        b.drawImage(img, -dw / 2, -dh / 2, dw, dh);
        b.restore();
        b.globalAlpha = 1;
        return true;
      };

      b.globalCompositeOperation = "source-over";
      b.globalAlpha = 1;
      b.fillStyle = "#04040e";
      b.fillRect(0, 0, w, h);
      const fx = w * 0.6;
      const fy = h * 0.42;

      // ── ground: painted backdrop, then the procedural wash over it ──
      // Order matters. The backdrop goes down first as opaque structure; the
      // procedural `base` wash then goes over it at reduced alpha, which is
      // what ties the two families together — without it the painting sits
      // there statically behind moving gas and the seam is obvious.
      const hasBackdrop = P("backdrop", "plateBg", PLATE_ALPHA.backdrop, {
        fit: "cover",
        // The furthest thing in the scene, so it gets the least motion of
        // anything: no rotation at all (see `noRot`) and a third of the usual
        // drift. At full drift a cover-fitted plate slides visibly behind the
        // gas and gives away that it's a flat image being panned.
        // cover 1.3 leaves margin for that drift plus the breathing scale, so
        // no frame ever exposes the plate's edge.
        noRot: true,
        driftMul: 0.34,
        cover: 1.3,
      });
      L(tex.base, "base", hasBackdrop ? PLATE_ALPHA.proceduralBase : 0.97, 0.12);

      b.globalCompositeOperation = "screen";
      if (hasBackdrop) procMix = PLATE_ALPHA.screenMix;
      L(tex.pink, "pinkA", 0.9, 0.3);
      L(tex.pink, "pinkB", 0.4, 0.45, { flipX: true });
      L(tex.pink, "pinkC", 0.32, 0.5, { baseRot: Math.PI, cover: 1.7 });
      L(tex.cyan, "cyanA", 0.8, 0.38);
      L(tex.cyan, "cyanB", 0.3, 0.55, { flipY: true, cover: 1.6 });
      L(tex.ember, "ember", 0.4, 0.5, { flipY: true });
      L(tex.fil, "fil", 0.65, 0.35, { spin: 0.000012, cx: fx, cy: fy, cover: 2.5 });
      L(tex.hair, "hair", 0.38, 0.4, { spin: -0.000007, cx: fx, cy: fy, cover: 2.5 });
      L(tex.white, "white", 0.45, 0.28);
      L(tex.knots, "knots", 0.45, 0.42);
      L(tex.knots, "knotsB", 0.3, 0.5, { flipX: true, cover: 1.7 });
      b.globalCompositeOperation = "multiply";
      procMix = 1; // dust carves the dark lanes — keep it at full strength
      L(tex.dust, "dustA", 0.85, 0.5);
      L(tex.dust2, "dustB", 0.8, 0.58);
      L(tex.dust2, "fgA", 0.65, 1, { flipX: true, cover: 1.8 });

      // stellar nursery — warm volumetric glow
      b.globalCompositeOperation = "screen";
      const pulse = 1 + 0.04 * Math.sin(t * 0.0004);

      // ── painted ring: a dust torus wheeling around the nursery ──
      // Deliberately drawn AFTER the multiply dust group, not with the earlier
      // screen layers: the dust passes were crushing it to nothing. Screen
      // (not source-over) because emission nebulae are additive in reality —
      // gas glows, it doesn't occlude. Two passes at different scales and
      // counter-rotations read as depth rather than one flat decal.
      P("ring", "plateRingA", PLATE_ALPHA.ring, {
        fit: "span", span: 1.55, cx: fx, cy: fy, spin: 0.0000055,
      });
      // The second pass draws at 2.35× viewport width — the most expensive
      // blit in the frame. Phones drop it; one ring still reads correctly.
      if (!sys.mobile) {
        P("ring", "plateRingB", PLATE_ALPHA.ring * 0.55, {
          fit: "span", span: 2.35, cx: fx, cy: fy, spin: -0.0000031, flipX: true,
        });
      }

      // NOTE: the painted core plate used to draw here. It moved down to the
      // central-light block, after the backdrop's second pass — drawn here its
      // detail was being flattened by that pass, which is what made the core
      // read as a featureless glow.
      if (PLATE_CRYSTAL) {
        P("crystal", "plateCrystal", PLATE_ALPHA.crystal * pulse, {
          fit: "span", span: 0.34, cx: fx, cy: fy, spin: 0.0000024,
        });
      }
      // Ambient warmth only — the broad, low wash that says "there is a light
      // somewhere in here". The light ITSELF is drawn much later, after the
      // backdrop's second pass. Keeping the two apart is the whole trick: a
      // wash this wide can't read as a source, and a source drawn this early
      // gets dimmed by everything that follows.
      const cg1 = b.createRadialGradient(fx, fy, 0, fx, fy, h * 0.55 * pulse);
      cg1.addColorStop(0, `rgba(242,190,178,${0.22 * CORE.ambient})`);
      cg1.addColorStop(0.4, `rgba(216,158,156,${0.08 * CORE.ambient})`);
      cg1.addColorStop(1, "rgba(216,158,156,0)");
      b.fillStyle = cg1;
      b.fillRect(0, 0, w, h);
      b.globalCompositeOperation = "multiply";
      L(tex.dust2, "coreDust", 0.45, 0.62, { cover: 1.5, baseRot: 0.6 });

      // ── backdrop, second pass: re-assert the painting OVER the gas ──
      // This is the pass that actually makes the plate visible (see the
      // PLATE_ALPHA comment). Same drift key as the ground pass — "plateBg" —
      // so both passes move as one plate rather than sliding against each
      // other, which would read as a double exposure. It goes before the
      // overlay/saturation/grain finishing on purpose: those passes then treat
      // the painting and the gas as one image, which is what stops the photo
      // from looking pasted on.
      b.globalCompositeOperation = "source-over";
      P("backdrop", "plateBg", PLATE_ALPHA.backdropTop, {
        fit: "cover", noRot: true, driftMul: 0.34, cover: 1.3,
      });

      // ── the central light ──
      // Drawn LAST, after the backdrop's second pass, so nothing dims it.
      //
      // The design rule here: at a glance this should read as "a light", but
      // looking closely it must resolve into STRUCTURE — knots of gas and a
      // star cluster, the way backdrop.jpg's core does. A smooth radial
      // gradient fails that test: it reads as a light from across the room and
      // as a blurry white circle up close. So the bulk of the core is the
      // painted core-glow plate, which has real filament detail, and the
      // gradients are pulled right back to doing only what a painting can't:
      // supplying the hot centre and the bloom around it.

      // Breathing. Two detuned sines rather than one, so the throb never
      // settles into an obvious beat — a single sine reads as a pulsing UI
      // element, two read as something alive.
      const corePulse =
        1 + 0.17 * Math.sin(t * 0.00042) + 0.08 * Math.sin(t * 0.00097 + 1.7);

      // Painted core, moved here from before the backdrop pass so its detail
      // isn't flattened by it. `screen` keeps its dark filaments dark, which
      // is exactly the structure that survives zooming in.
      b.globalCompositeOperation = "screen";
      P("coreGlow", "plateCore", PLATE_ALPHA.coreGlow * corePulse, {
        fit: "span", span: 1.05, cx: fx - w * 0.035, cy: fy + h * 0.03, spin: -0.0000018,
      });

      // `lighter` is straight additive: light adds to what's behind it, so the
      // painted detail still shows through the falloff instead of being
      // painted over.
      b.globalCompositeOperation = "lighter";

      // Rays first, so the hot centre lands on top of where they converge and
      // hides their common origin — otherwise you can see the wedges meeting
      // at a point. Reach breathes with the pulse; alpha breathes harder, so
      // the throb reads as brightness rather than as the whole thing scaling.
      if (tex.rays) {
        const reach = h * CORE.rayReach * (1 + (corePulse - 1) * 0.35);
        b.save();
        b.globalAlpha = Math.min(1, CORE.rayAlpha * corePulse);
        b.translate(fx, fy);
        b.rotate(t * CORE.raySpin);
        b.drawImage(tex.rays, -reach, -reach, reach * 2, reach * 2);
        b.restore();
        b.globalAlpha = 1;
      }

      // Bloom: wide and weak. Its job is atmosphere around the core, not the
      // core itself — at higher alpha this is the "big sphere of light" that
      // swallows all the painted detail underneath.
      const bloom = b.createRadialGradient(fx, fy, 0, fx, fy, h * CORE.bloom * corePulse);
      bloom.addColorStop(0, `rgba(255,226,180,${0.2 * corePulse})`);
      bloom.addColorStop(0.35, `rgba(248,186,140,${0.07 * corePulse})`);
      bloom.addColorStop(1, "rgba(240,170,120,0)");
      b.fillStyle = bloom;
      b.fillRect(0, 0, w, h);

      // Hot centre: small. This is the only part allowed to clip to white, and
      // it's roughly the size of the star cluster drawn over it later — so
      // what you see up close is stars in a bright knot, not a white disc.
      const sphere = b.createRadialGradient(fx, fy, 0, fx, fy, h * CORE.sphere * corePulse);
      sphere.addColorStop(0, `rgba(255,252,244,${0.8 * corePulse})`);
      sphere.addColorStop(0.35, `rgba(255,236,198,${0.42 * corePulse})`);
      sphere.addColorStop(0.7, `rgba(252,206,146,${0.16 * corePulse})`);
      sphere.addColorStop(1, "rgba(248,190,130,0)");
      b.fillStyle = sphere;
      b.fillRect(0, 0, w, h);

      b.globalAlpha = 1;

      // local-contrast + chroma restoration + grain
      //
      // These were tuned to rescue the procedural gas, which came out flat and
      // desaturated. A painted plate needs far less help — in particular the
      // saturation pass is what pushes the frame magenta relative to
      // backdrop.jpg, so if the colour is drifting from the reference, that's
      // the number to pull down first.
      b.globalCompositeOperation = "overlay";
      b.globalAlpha = FINISH.contrast;
      b.drawImage(nebBase, 0, 0);
      b.globalCompositeOperation = "saturation";
      b.globalAlpha = FINISH.saturation;
      b.fillStyle = "hsl(285, 85%, 55%)";
      b.fillRect(0, 0, w, h);
      b.globalCompositeOperation = "soft-light";
      b.globalAlpha = FINISH.grain;
      if (!sys.grainPat) sys.grainPat = b.createPattern(tex.grain, "repeat");
      if (sys.grainPat) {
        b.fillStyle = sys.grainPat;
        b.fillRect(0, 0, w, h);
      }
      b.globalAlpha = 1;
      b.globalCompositeOperation = "source-over";

      // smoke buffer: relax toward composite, smear around pointer swipes
      if (SMOKE_STIR) {
        const sc = smoke.getContext("2d")!;
        if (!sys.smokeInit) {
          sc.drawImage(nebBase, 0, 0);
          sys.smokeInit = true;
        }
        sc.globalAlpha = 0.04;
        sc.drawImage(nebBase, 0, 0);
        sc.globalAlpha = 1;
        if (sys.dist.length) {
          const tc = tmp.getContext("2d")!;
          for (const d of sys.dist) {
            d.life -= 0.028;
            if (d.life <= 0) continue;
            const k = d.life * d.life;
            const ox = (d.vx * 0.55 - d.vy * 0.26 * d.curl) * k;
            const oy = (d.vy * 0.55 + d.vx * 0.26 * d.curl) * k;
            const r = d.r;
            tc.clearRect(0, 0, 320, 320);
            tc.drawImage(smoke, d.x - r, d.y - r, r * 2, r * 2, 0, 0, r * 2, r * 2);
            sc.save();
            sc.beginPath();
            sc.arc(d.x, d.y, r, 0, Math.PI * 2);
            sc.clip();
            sc.globalAlpha = 0.4;
            sc.drawImage(tmp, 0, 0, r * 2, r * 2, d.x - r + ox * 0.45, d.y - r + oy * 0.45, r * 2, r * 2);
            sc.restore();
            sc.save();
            sc.beginPath();
            sc.arc(d.x, d.y, r * 0.75, 0, Math.PI * 2);
            sc.clip();
            sc.globalAlpha = 0.4;
            sc.translate(d.x, d.y);
            sc.rotate(d.curl * 0.1 * k);
            sc.drawImage(tmp, 0, 0, r * 2, r * 2, -r + ox * 0.7, -r + oy * 0.7, r * 2, r * 2);
            sc.restore();
            sc.save();
            sc.beginPath();
            sc.arc(d.x, d.y, r * 0.5, 0, Math.PI * 2);
            sc.clip();
            sc.globalAlpha = 0.7;
            sc.drawImage(tmp, 0, 0, r * 2, r * 2, d.x - r + ox, d.y - r + oy, r * 2, r * 2);
            sc.restore();
            sc.globalAlpha = 1;
          }
          sys.dist = sys.dist.filter((d) => d.life > 0);
        }
      }
      ctx.setTransform(sys.dpr, 0, 0, sys.dpr, 0, 0);
      if (zoom > 1) {
        ctx.translate(w / 2, h / 2);
        ctx.scale(zoom, zoom);
        ctx.translate(-w / 2, -h / 2);
      }
      // With stirring off the smoke buffer is never written, so blit the live
      // composite instead — otherwise the frame would be a blank canvas.
      ctx.drawImage(SMOKE_STIR ? smoke : nebBase, 0, 0);

      // vignette
      const vg = ctx.createRadialGradient(w / 2, h / 2, h * 0.3, w / 2, h / 2, w * 0.72);
      vg.addColorStop(0, "rgba(0,0,0,0)");
      vg.addColorStop(1, "rgba(1,2,8,0.32)");
      ctx.fillStyle = vg;
      ctx.fillRect(0, 0, w, h);

      // parallax star layers + young cluster + bright stars
      ctx.globalCompositeOperation = "lighter";
      const camX = Math.sin(t * 0.00006) * 42;
      const camY = Math.cos(t * 0.00005) * 26;
      for (const s of neb.stars) {
        const tw = 0.78 + 0.22 * Math.sin(t / 1100 + s.tw);
        const px = (((s.x - camX * s.z) % w) + w) % w;
        const py = (((s.y - camY * s.z) % h) + h) % h;
        ctx.fillStyle = `rgba(${s.col},${s.al * tw})`;
        ctx.fillRect(px, py, s.s, s.s);
      }
      for (const s of neb.cluster) {
        const tw = 0.7 + 0.3 * Math.sin(t / 1300 + s.tw);
        const px = s.x - camX * 0.8;
        const py = s.y - camY * 0.8;
        ctx.fillStyle = `rgba(${s.col},${s.al * tw})`;
        ctx.fillRect(px, py, s.s, s.s);
        if (s.s > 1.4) {
          const sg = ctx.createRadialGradient(px, py, 0, px, py, s.s * 4);
          sg.addColorStop(0, `rgba(${s.col},${0.3 * tw})`);
          sg.addColorStop(1, `rgba(${s.col},0)`);
          ctx.fillStyle = sg;
          ctx.beginPath();
          ctx.arc(px, py, s.s * 4, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      for (const br of neb.bright) {
        const tw = 0.65 + 0.35 * Math.sin(t / 1500 + br.tw);
        const px = (((br.x - camX) % w) + w) % w;
        const py = (((br.y - camY) % h) + h) % h;
        const bg = ctx.createRadialGradient(px, py, 0, px, py, br.r * 5);
        bg.addColorStop(0, `rgba(${br.col},${0.85 * tw})`);
        bg.addColorStop(0.25, `rgba(${br.col},${0.3 * tw})`);
        bg.addColorStop(1, `rgba(${br.col},0)`);
        ctx.fillStyle = bg;
        ctx.beginPath();
        ctx.arc(px, py, br.r * 5, 0, Math.PI * 2);
        ctx.fill();
        if (br.r > 2.2) {
          ctx.strokeStyle = `rgba(${br.col},${0.16 * tw})`;
          ctx.lineWidth = 0.6;
          ctx.beginPath();
          ctx.moveTo(px - br.r * 6, py);
          ctx.lineTo(px + br.r * 6, py);
          ctx.moveTo(px, py - br.r * 6);
          ctx.lineTo(px, py + br.r * 6);
          ctx.stroke();
        }
      }
      ctx.globalCompositeOperation = "source-over";

      // emerge from black
      const bd = t - (sys.nebulaBorn || t);
      if (bd < 900) {
        ctx.fillStyle = `rgba(0,0,0,${1 - bd / 900})`;
        ctx.fillRect(0, 0, w, h);
      }
    };

    /* ---------- loop ---------- */
    const frame = (t: number) => {
      sys.raf = requestAnimationFrame(frame);
      resize();
      if (!sys.g) return;
      if (sys.scene === "nebula") {
        ctx.setTransform(sys.dpr, 0, 0, sys.dpr, 0, 0);
        ctx.fillStyle = "#04040e";
        ctx.fillRect(0, 0, sys.w, sys.h);
        if (sys.warpOut != null) {
          // Return animation: the nebula rushes past (zoom accelerates),
          // the screen closes to black, then the hole scene takes over and
          // fades in via its existing holeBorn ramp — so the whole trip is
          // nebula → black → horizon, mirroring the way in.
          const k = Math.min((t - sys.warpOut) / WARP_OUT_MS, 1);
          nebulaFrame(t, 1 + 5 * k * k * k);
          const veil = Math.max(0, (k - 0.55) / 0.45);
          if (veil > 0) {
            ctx.setTransform(sys.dpr, 0, 0, sys.dpr, 0, 0);
            ctx.fillStyle = `rgba(0,0,0,${veil})`;
            ctx.fillRect(0, 0, sys.w, sys.h);
          }
          if (k >= 1) {
            sys.warpOut = null;
            sys.scene = "hole";
            sys.holeBorn = performance.now();
            setUiScene("hole");
            veilRef.current?.(false); // bring the contact content back
          }
        } else {
          nebulaFrame(t);
        }
        sys.last = t;
      } else {
        holeFrame(t);
      }
    };
    const start = () => {
      if (sys.raf || sys.reduced) return;
      sys.last = 0;
      sys.raf = requestAnimationFrame(frame);
    };
    const stop = () => {
      if (sys.raf) cancelAnimationFrame(sys.raf);
      sys.raf = 0;
    };
    const staticFrame = () => {
      resize();
      if (sys.g) holeFrame(0);
    };

    /* ---------- observers / listeners ---------- */
    const io = new IntersectionObserver(
      (entries) => {
        const on = entries[0].isIntersecting;
        if (sys.reduced) {
          if (on) staticFrame();
          return;
        }
        if (on) start();
        else stop();
      },
      { rootMargin: "80px" },
    );
    io.observe(wrap);

    const ro = new ResizeObserver(() => {
      if (sys.reduced) staticFrame();
    });
    ro.observe(wrap);

    // Pointer stirring for the nebula (mock's pointermove handler). The
    // canvas is behind the content, so we listen on window and map coords.
    const onMove = (e: PointerEvent) => {
      // Nothing consumes sys.dist while stirring is off — don't accumulate it.
      if (!SMOKE_STIR || sys.scene !== "nebula") return;
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      if (x < 0 || y < 0 || x > rect.width || y > rect.height) return;
      const mx = e.movementX || 0;
      const my = e.movementY || 0;
      const mag = Math.sqrt(mx * mx + my * my);
      if (mag < 0.3) return;
      const cl = Math.min(mag, 22) / (mag || 1);
      const cross = mx * sys.pvy - my * sys.pvx;
      sys.pvx = mx;
      sys.pvy = my;
      sys.dist.push({
        x, y,
        vx: mx * cl, vy: my * cl,
        curl: cross >= 0 ? 1 : -1,
        r: 42 + Math.min(mag, 26) * 1.5 + Math.random() * 12,
        life: 1,
      });
      if (sys.dist.length > 28) sys.dist.shift();
    };
    window.addEventListener("pointermove", onMove, { passive: true });

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && sys.scene === "nebula" && sys.warpOut == null) {
        sys.warpOut = performance.now(); // start the return animation
      }
    };
    window.addEventListener("keydown", onKey);

    // Pre-bake nebula textures and fetch the painted plates in the background
    // so the first warp lands instantly. Both are deferred past mount: the
    // contact section is below the fold, and neither the bake (CPU) nor the
    // plates (~700KB for the three enabled ones) should compete with the
    // initial page render.
    const bakeTimer = window.setTimeout(buildNebulaTexAsync, 300);
    const plateTimer = window.setTimeout(loadPlates, 300);

    // DEV SHORTCUT: `?nebula=1` boots straight into the nebula scene, skipping
    // the scroll-down-and-click-the-hole ritual. Iterating on the nebula is
    // otherwise painful — every reload costs a 2.5s warp animation before you
    // can see whether a tweak worked.
    //
    // Guarded on NODE_ENV so it's dead code in the Vercel bundle: a visitor
    // hitting nabilgaharu.com/?nebula=1 should not skip the easter egg.
    if (
      process.env.NODE_ENV !== "production" &&
      !prefersReduced &&
      new URLSearchParams(window.location.search).has("nebula")
    ) {
      sys.scene = "nebula";
      sys.nebulaBorn = performance.now();
      setUiScene("nebula");
      veilRef.current?.(true); // hide the form, same as a real warp-in
    }

    if (prefersReduced) staticFrame();

    return () => {
      stop();
      io.disconnect();
      ro.disconnect();
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("keydown", onKey);
      window.clearTimeout(bakeTimer);
      window.clearTimeout(plateTimer);
      sysRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // While the nebula owns the viewport, lock page scroll — scrolling the
  // portfolio behind a fullscreen overlay would break the illusion.
  useEffect(() => {
    if (uiScene !== "nebula") return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [uiScene]);

  /* ---------- click handlers ---------- */
  const enterHole = () => {
    const sys = sysRef.current;
    if (!sys || sys.reduced || sys.scene !== "hole" || sys.warp != null) return;
    sys.warp = performance.now();
    onVeilChange?.(true); // hide the contact content during the plunge
  };
  const leaveNebula = () => {
    const sys = sysRef.current;
    // Ignore clicks while a return trip is already running.
    if (!sys || sys.scene !== "nebula" || sys.warpOut != null) return;
    sys.warpOut = performance.now(); // start the return animation
  };

  return (
    <div
      ref={wrapRef}
      // In the hole scene the backdrop is inert (form stays clickable) and
      // only the cap button accepts clicks. In the nebula scene the whole
      // backdrop is clickable — mock behaviour: click anywhere to return.
      // The form still works because it sits ABOVE this layer in the DOM.
      onClick={uiScene === "nebula" ? leaveNebula : undefined}
      // Nebula = fullscreen takeover: the wrapper jumps from a section
      // backdrop to a fixed overlay above everything (z-[200] > navbar's
      // z-100). The swap happens while the screen is black (end of the
      // warp), and the per-frame resize() rebuilds the buffers at viewport
      // size on the next frame — so the transition is invisible.
      className={
        uiScene === "nebula"
          ? "pointer-events-auto fixed inset-0 z-[200] cursor-pointer overflow-hidden"
          : "pointer-events-none absolute inset-0 overflow-hidden"
      }
      style={
        uiScene === "nebula"
          ? undefined
          : {
              maskImage:
                "linear-gradient(to bottom, transparent 0%, black 20%, black 100%)",
              WebkitMaskImage:
                "linear-gradient(to bottom, transparent 0%, black 20%, black 100%)",
            }
      }
    >
      <canvas ref={canvasRef} className="block h-full w-full" />

      {/* Warp trigger — the black circle itself. */}
      {!reduced && uiScene === "hole" && cap && (
        <button
          type="button"
          onClick={enterHole}
          aria-label="Fall into the black hole (visual easter egg)"
          className="pointer-events-auto absolute cursor-pointer rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-white/30"
          style={{ left: cap.left, top: cap.top, width: cap.width, height: cap.height }}
        />
      )}

      {!reduced && uiScene === "nebula" && (
        <p className="pointer-events-none absolute bottom-4 left-1/2 -translate-x-1/2 font-mono text-[10px] uppercase tracking-[0.3em] text-white/40">
          click anywhere to return · esc
        </p>
      )}
    </div>
  );
}
