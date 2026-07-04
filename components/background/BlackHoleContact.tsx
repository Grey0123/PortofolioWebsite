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
      for (let i = 0; i < 90; i++) {
        const a = Math.random() * 6.28;
        const rr = Math.abs(gauss()) * w * 0.06;
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

      // organic per-layer motion: drift + rotation wobble + breathing scale
      const L = (
        img: HTMLCanvasElement, name: string, alpha: number, _depth: number,
        o: { spin?: number; baseRot?: number; cover?: number; cx?: number; cy?: number; flipX?: boolean; flipY?: boolean } = {},
      ) => {
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
        const vx = Math.sin(t * m.f1 + m.p1) * m.dx + Math.sin(t * m.f2 + m.p3) * m.dx * 0.8;
        const vy = Math.cos(t * m.f1 * 0.93 + m.p2) * m.dy + Math.cos(t * m.f2 * 1.13 + m.p1) * m.dy * 0.8;
        const rot = (o.spin ? t * o.spin : t * m.rot) + Math.sin(t * m.fw + m.p2) * m.wob + (o.baseRot || 0);
        const s = (1 + Math.sin(t * m.fsc + m.p3) * m.sc) * (o.cover || 1.45);
        b.globalAlpha = alpha * (1 - m.oa + Math.sin(t * m.fo + m.p1) * m.oa);
        b.save();
        b.translate((o.cx != null ? o.cx : w / 2) + vx, (o.cy != null ? o.cy : h / 2) + vy);
        b.rotate(rot);
        b.scale(o.flipX ? -s : s, o.flipY ? -s : s);
        b.drawImage(img, -w / 2, -h / 2, w, h);
        b.restore();
        b.globalAlpha = 1;
      };

      b.globalCompositeOperation = "source-over";
      b.globalAlpha = 1;
      b.fillStyle = "#04040e";
      b.fillRect(0, 0, w, h);
      const fx = w * 0.6;
      const fy = h * 0.42;
      L(tex.base, "base", 0.97, 0.12);
      b.globalCompositeOperation = "screen";
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
      L(tex.dust, "dustA", 0.85, 0.5);
      L(tex.dust2, "dustB", 0.8, 0.58);
      L(tex.dust2, "fgA", 0.65, 1, { flipX: true, cover: 1.8 });

      // stellar nursery — warm volumetric glow
      b.globalCompositeOperation = "screen";
      const pulse = 1 + 0.04 * Math.sin(t * 0.0004);
      const cg1 = b.createRadialGradient(fx, fy, 0, fx, fy, h * 0.55 * pulse);
      cg1.addColorStop(0, "rgba(242,190,178,0.22)");
      cg1.addColorStop(0.4, "rgba(216,158,156,0.08)");
      cg1.addColorStop(1, "rgba(216,158,156,0)");
      b.fillStyle = cg1;
      b.fillRect(0, 0, w, h);
      b.save();
      b.translate(fx, fy);
      b.rotate(-0.5);
      b.scale(1, 0.38);
      const cg3 = b.createRadialGradient(0, 0, 0, 0, 0, h * 0.5 * pulse);
      cg3.addColorStop(0, "rgba(255,232,205,0.3)");
      cg3.addColorStop(0.45, "rgba(238,184,168,0.1)");
      cg3.addColorStop(1, "rgba(238,184,168,0)");
      b.fillStyle = cg3;
      b.fillRect(-w, -h, w * 2, h * 2);
      b.restore();
      const cg2 = b.createRadialGradient(fx, fy, 0, fx, fy, h * 0.16 * pulse);
      cg2.addColorStop(0, "rgba(255,248,230,0.85)");
      cg2.addColorStop(0.3, "rgba(248,216,174,0.38)");
      cg2.addColorStop(1, "rgba(240,205,160,0)");
      b.fillStyle = cg2;
      b.fillRect(0, 0, w, h);
      b.globalCompositeOperation = "multiply";
      L(tex.dust2, "coreDust", 0.45, 0.62, { cover: 1.5, baseRot: 0.6 });
      // local-contrast + chroma restoration + grain
      b.globalCompositeOperation = "overlay";
      b.globalAlpha = 0.32;
      b.drawImage(nebBase, 0, 0);
      b.globalCompositeOperation = "saturation";
      b.globalAlpha = 0.42;
      b.fillStyle = "hsl(285, 85%, 55%)";
      b.fillRect(0, 0, w, h);
      b.globalCompositeOperation = "soft-light";
      b.globalAlpha = 0.25;
      if (!sys.grainPat) sys.grainPat = b.createPattern(tex.grain, "repeat");
      if (sys.grainPat) {
        b.fillStyle = sys.grainPat;
        b.fillRect(0, 0, w, h);
      }
      b.globalAlpha = 1;
      b.globalCompositeOperation = "source-over";

      // smoke buffer: relax toward composite, smear around pointer swipes
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
      ctx.setTransform(sys.dpr, 0, 0, sys.dpr, 0, 0);
      if (zoom > 1) {
        ctx.translate(w / 2, h / 2);
        ctx.scale(zoom, zoom);
        ctx.translate(-w / 2, -h / 2);
      }
      ctx.drawImage(smoke, 0, 0);

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
      if (sys.scene !== "nebula") return;
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

    // Pre-bake nebula textures in the background so the first warp is instant.
    const bakeTimer = window.setTimeout(buildNebulaTexAsync, 300);

    if (prefersReduced) staticFrame();

    return () => {
      stop();
      io.disconnect();
      ro.disconnect();
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("keydown", onKey);
      window.clearTimeout(bakeTimer);
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
