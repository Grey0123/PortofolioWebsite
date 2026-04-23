"use client";
/**
 * "Stellar Orbit Hub" — a true 3D orbital visualization of the services
 * I offer and the tools that power them.
 *
 * ┌────────────────────────────────────────────────────────────────────┐
 * │  MENTAL MODEL                                                      │
 * │                                                                    │
 * │  Scene has CSS `perspective` → child transforms are projected in 3D │
 * │  Three orbit rings intersect at center with different tilts:        │
 * │    - Saturn-ish horizontal plate                                    │
 * │    - Near-vertical ring yawed 70°                                   │
 * │    - Diagonal outer ring                                            │
 * │  Tool items are billboards (2D cards) placed in 3D via translate3d. │
 * │  The browser's perspective projection auto-scales items so ones at  │
 * │  higher +z (closer) appear larger, -z (farther) smaller.            │
 * │  We also fade opacity by z so back-side items feel "distant".       │
 * │                                                                    │
 * │  Animation is a single rAF loop writing transforms directly to DOM  │
 * │  refs — zero React renders per frame. Hover / select are React      │
 * │  state mirrored into refs so the loop reads them without restarting.│
 * └────────────────────────────────────────────────────────────────────┘
 *
 * Components (all in this file, in logical top-down order):
 *   <TechMarquee>       — section wrapper with copy + <OrbitSystem/>
 *   <OrbitSystem>       — the 3D scene, owns rAF + state + parallax
 *     <Starfield/>      — decorative seeded dots
 *     <OrbitRing/>      — one tilted/yawed elliptical ring
 *     <ServicesHub/>    — clickable center node
 *     <ServiceSelector/>— radial menu of services (opens from hub)
 *     <OrbitItem/>      — one tool node on an orbit
 *     <Tooltip/>        — hover label (rendered inside OrbitItem)
 */

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  SiPython,
  SiTypescript,
  SiReact,
  SiNextdotjs,
  SiNodedotjs,
  SiTailwindcss,
  SiSelenium,
  SiDocker,
  SiGit,
  SiMysql,
  SiFirebase,
  SiSpring,
  SiFastapi,
  SiFlutter,
  SiTensorflow,
  SiPostgresql,
  SiMongodb,
  SiGraphql,
  SiRedis,
  SiOpenai,
  SiLangchain,
} from "react-icons/si";
import {
  FaJava,
  FaDatabase,
  FaRobot,
  FaCode,
  FaServer,
  FaBrain,
  FaSpider,
  FaPlug,
  FaChartLine,
  FaSatelliteDish,
} from "react-icons/fa";
import type { IconType } from "react-icons";

/* ============================================================
 * TYPES
 * ============================================================ */
type Tool = {
  name: string;
  icon?: ReactNode;
};

type Service = {
  id: string;
  name: string;        // long name used in the hub pill / tooltip
  shortName: string;   // one word for radial button
  tagline: string;
  color: string;       // hex accent
  Icon: IconType;      // shown in center when selected
  tools: Tool[];
};

type Orbit = {
  radius: number;      // design-px
  speed: number;       // radians/sec
  tiltDeg: number;     // rotateX on the ring plane
  yawDeg: number;      // rotateY on the ring plane
};

/* ============================================================
 * DATA — services + their tools. Configurable; order matters only
 * for the radial selector (buttons distributed evenly).
 * ============================================================ */
const SERVICES: Service[] = [
  {
    id: "backend",
    name: "Backend Development",
    shortName: "Backend",
    tagline: "Scalable APIs & services",
    color: "#00b7ff",
    Icon: FaServer,
    tools: [
      { name: "Java",        icon: <FaJava /> },
      { name: "Spring Boot", icon: <SiSpring /> },
      { name: "Node.js",     icon: <SiNodedotjs /> },
      { name: "FastAPI",     icon: <SiFastapi /> },
      { name: "GraphQL",     icon: <SiGraphql /> },
      { name: "Redis",       icon: <SiRedis /> },
    ],
  },
  {
    id: "ai",
    name: "AI & Automation",
    shortName: "AI",
    tagline: "Intelligent systems & agents",
    color: "#ff30ff",
    Icon: FaBrain,
    tools: [
      { name: "Python",     icon: <SiPython /> },
      { name: "TensorFlow", icon: <SiTensorflow /> },
      { name: "LLMs",       icon: <FaRobot /> },
      { name: "OpenAI",     icon: <SiOpenai /> },
      { name: "LangChain",  icon: <SiLangchain /> },
      { name: "Vector DB",  icon: <FaDatabase /> },
    ],
  },
  {
    id: "data",
    name: "Data Engineering",
    shortName: "Data",
    tagline: "Reliable pipelines & insights",
    color: "#43b02a",
    Icon: FaChartLine,
    tools: [
      { name: "PostgreSQL", icon: <SiPostgresql /> },
      { name: "MySQL",      icon: <SiMysql /> },
      { name: "MongoDB",    icon: <SiMongodb /> },
      { name: "Oracle",     icon: <FaDatabase /> },
      { name: "Python",     icon: <SiPython /> },
      { name: "SQL" },
    ],
  },
  {
    id: "scraping",
    name: "Web Scraping",
    shortName: "Scraping",
    tagline: "Collect data at scale",
    color: "#f89820",
    Icon: FaSpider,
    tools: [
      { name: "Playwright" },
      { name: "Selenium",      icon: <SiSelenium /> },
      { name: "Python",        icon: <SiPython /> },
      { name: "BeautifulSoup" },
      { name: "Scrapy" },
      { name: "Puppeteer" },
    ],
  },
  {
    id: "frontend",
    name: "Web & Mobile",
    shortName: "Frontend",
    tagline: "Elegant user experiences",
    color: "#ff004f",
    Icon: FaCode,
    tools: [
      { name: "React",      icon: <SiReact /> },
      { name: "Next.js",    icon: <SiNextdotjs /> },
      { name: "TypeScript", icon: <SiTypescript /> },
      { name: "Flutter",    icon: <SiFlutter /> },
      { name: "Tailwind",   icon: <SiTailwindcss /> },
      { name: "Firebase",   icon: <SiFirebase /> },
    ],
  },
  {
    id: "api",
    name: "API Integration",
    shortName: "APIs",
    tagline: "Plug systems together",
    color: "#2496ed",
    Icon: FaPlug,
    tools: [
      { name: "Binance API" },
      { name: "Bybit API" },
      { name: "Stripe" },
      { name: "REST",    icon: <FaSatelliteDish /> },
      { name: "GraphQL", icon: <SiGraphql /> },
      { name: "Webhooks" },
    ],
  },
  {
    id: "infra",
    name: "Database & Infra",
    shortName: "Infra",
    tagline: "Containers, storage, ops",
    color: "#14b8a6",
    Icon: FaDatabase,
    tools: [
      { name: "Docker",     icon: <SiDocker /> },
      { name: "Git",        icon: <SiGit /> },
      { name: "PostgreSQL", icon: <SiPostgresql /> },
      { name: "Redis",      icon: <SiRedis /> },
      { name: "MongoDB",    icon: <SiMongodb /> },
    ],
  },
];

/* ============================================================
 * SCENE CONSTANTS
 *
 *   All positions are in "design pixels" on a 720x720 virtual canvas.
 *   At runtime we measure the real container width and scale 3D offsets
 *   by (actualWidth / SIZE) — lets the whole scene scale fluidly.
 * ============================================================ */
const SIZE = 720;

// Three intersecting orbit planes for a real 3D feel.
// tiltDeg rotates the ring around the horizontal (X) axis (top-forward if +).
// yawDeg rotates the ring around the vertical (Y) axis.
//
// Radii were widened ([210, 260, 310] → [240, 285, 325]) so the bigger
// central hub has ~165 design-px of breathing room before the first ring,
// which reads as clear visual separation instead of "hub kissing orbit".
// Outer ring + item chip half-width + hover scale still fits inside the
// 720-px canvas with a small safety margin.
const ORBITS: Orbit[] = [
  { radius: 280, speed: 0.70, tiltDeg: 72, yawDeg:   0 }, // Saturn-horizontal
  { radius: 325, speed: 0.46, tiltDeg: 22, yawDeg:  70 }, // near-vertical, yawed
  { radius: 365, speed: 0.30, tiltDeg: 50, yawDeg: -35 }, // diagonal outer
];

/* ============================================================
 * MATH HELPERS
 * ============================================================ */
const degToRad = (d: number) => (d * Math.PI) / 180;

/**
 * Compute the 3D world position of a point on an orbit ring.
 *
 *   Start with a point on a horizontal ring in the XY plane
 *   (the plane that faces the camera):
 *
 *     P_local = ( R·cos θ,  R·sin θ,  0 )
 *
 *   Apply rotateX by tiltDeg  →  tips ring forward/back
 *     y' = y·cos(t) − z·sin(t)
 *     z' = y·sin(t) + z·cos(t)
 *
 *   Apply rotateY by yawDeg  →  spins ring around vertical axis
 *     x'' =  x·cos(y) + z'·sin(y)
 *     z'' = −x·sin(y) + z'·cos(y)
 *
 *   Result is a point in camera-space ready for translate3d.
 */
function orbitalPosition(
  radius: number,
  angleRad: number,
  tiltDeg: number,
  yawDeg: number,
) {
  const x0 = radius * Math.cos(angleRad);
  const y0 = radius * Math.sin(angleRad);
  const z0 = 0;

  const tx = degToRad(tiltDeg);
  const cx = Math.cos(tx);
  const sx = Math.sin(tx);
  const y1 = y0 * cx - z0 * sx;
  const z1 = y0 * sx + z0 * cx;

  const ty = degToRad(yawDeg);
  const cy = Math.cos(ty);
  const sy = Math.sin(ty);
  const x2 = x0 * cy + z1 * sy;
  const z2 = -x0 * sy + z1 * cy;

  return { x: x2, y: y1, z: z2 };
}

/** SSR-safe reduced-motion check */
const prefersReducedMotion = (): boolean =>
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/* ============================================================
 * <Starfield /> — deterministic backdrop dots (stable across SSR)
 * ============================================================ */
function Starfield() {
  const stars = useMemo(() => {
    const out: { x: number; y: number; r: number; o: number }[] = [];
    let seed = 73;
    const rand = () => {
      seed = (seed * 9301 + 49297) % 233280;
      return seed / 233280;
    };
    for (let i = 0; i < 90; i++) {
      out.push({
        x: rand() * SIZE,
        y: rand() * SIZE,
        r: rand() * 1.2 + 0.25,
        o: rand() * 0.55 + 0.1,
      });
    }
    return out;
  }, []);

  return (
    <svg
      className="pointer-events-none absolute inset-0 h-full w-full"
      viewBox={`0 0 ${SIZE} ${SIZE}`}
      aria-hidden
    >
      {stars.map((s, i) => (
        <circle key={i} cx={s.x} cy={s.y} r={s.r} fill="white" opacity={s.o} />
      ))}
    </svg>
  );
}

/* ============================================================
 * <OrbitRing /> — a tilted/yawed elliptical ring in 3D.
 *
 * Implementation: a plain div with `border-radius: 50%` starts as a flat
 * circle facing the camera (XY plane). We apply the orbit's yaw + tilt
 * via CSS 3D transforms — with perspective on the scene the browser
 * projects it as an ellipse automatically. Dashed border + glow shadow
 * gives a clean "orbital track" look.
 * ============================================================ */
function OrbitRing({ orbit, color }: { orbit: Orbit; color: string }) {
  const pct = ((orbit.radius * 2) / SIZE) * 100;
  return (
    <div
      className="pointer-events-none absolute left-1/2 top-1/2 rounded-full"
      style={{
        width: `${pct}%`,
        height: `${pct}%`,
        transform: `translate(-50%, -50%) rotateY(${orbit.yawDeg}deg) rotateX(${orbit.tiltDeg}deg)`,
        transformStyle: "preserve-3d",
        border: "1px dashed rgba(255, 255, 255, 0.14)",
        boxShadow: `0 0 24px ${color}18, inset 0 0 20px ${color}18`,
      }}
    />
  );
}

/* ============================================================
 * <Tooltip /> — floating label above an orbit item, on hover.
 *
 * Rendered inside the 3D scene next to its parent item — but we apply
 * `transform-style: flat` so the tooltip doesn't tilt with the parent
 * (otherwise the text could be nearly edge-on on the back of an orbit).
 * ============================================================ */
function Tooltip({ label, color }: { label: string; color: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 6 }}
      transition={{ duration: 0.15 }}
      className="pointer-events-none absolute left-1/2 top-full z-50 mt-2 w-max -translate-x-1/2 rounded-md border border-white/10 bg-black/85 px-2.5 py-1 text-[11px] font-medium text-white backdrop-blur-md"
      style={{
        transformStyle: "flat",
        boxShadow: `0 0 14px ${color}66`,
      }}
    >
      {label}
    </motion.div>
  );
}

/* ============================================================
 * <OrbitItem /> — one tool node orbiting the hub.
 *
 * Structure:
 *   <div ref={positionRef} class="absolute left-1/2 top-1/2">
 *     ← rAF writes translate3d(x, y, z) + opacity onto this div
 *     <div class="-translate-1/2"> ← centers visual on the point
 *       <motion.button animate={scale: hovered?1.25:1}>
 *         <icon/>
 *       </motion.button>
 *       {hovered && <Tooltip/>}
 *     </div>
 *   </div>
 *
 * Separating the rAF-driven translate and the framer-motion scale onto
 * different elements avoids transform conflicts.
 * ============================================================ */
type OrbitItemProps = {
  tool: Tool;
  color: string;
  isHovered: boolean;
  onHover: (hovered: boolean) => void;
  innerRef: (el: HTMLDivElement | null) => void;
  // initial transform prevents a one-frame flash at center before rAF kicks in
  initialPos: { x: number; y: number; z: number };
};

function OrbitItem({
  tool,
  color,
  isHovered,
  onHover,
  innerRef,
  initialPos,
}: OrbitItemProps) {
  return (
    <div
      ref={innerRef}
      className="absolute left-1/2 top-1/2"
      style={{
        // Inline initial transform + preserve-3d so child inherits 3D context.
        transform: `translate3d(${initialPos.x}px, ${initialPos.y}px, ${initialPos.z}px)`,
        transformStyle: "preserve-3d",
        willChange: "transform, opacity",
      }}
    >
      {/* Centering wrapper — places the visible chip's CENTER at the rAF point */}
      <div className="absolute -translate-x-1/2 -translate-y-1/2" style={{ transformStyle: "flat" }}>
        <motion.button
          type="button"
          onHoverStart={() => onHover(true)}
          onHoverEnd={() => onHover(false)}
          onFocus={() => onHover(true)}
          onBlur={() => onHover(false)}
          animate={{ scale: isHovered ? 1.25 : 1 }}
          transition={{ type: "spring", stiffness: 260, damping: 20 }}
          className="relative flex h-11 w-11 items-center justify-center rounded-full border text-white backdrop-blur-md md:h-12 md:w-12"
          style={{
            background: `radial-gradient(circle at 30% 25%, ${color}77, ${color}22 60%, rgba(10,10,20,0.6) 100%)`,
            borderColor: `${color}a0`,
            boxShadow: isHovered
              ? `0 0 26px ${color}cc, inset 0 0 14px ${color}55`
              : `0 0 10px ${color}55, inset 0 0 6px ${color}33`,
          }}
          aria-label={tool.name}
        >
          <span className="flex items-center justify-center text-lg" style={{ color }}>
            {tool.icon ?? (
              <span className="text-[10px] font-semibold tracking-tight text-white/90">
                {tool.name.slice(0, 3).toUpperCase()}
              </span>
            )}
          </span>
        </motion.button>

        <AnimatePresence>
          {isHovered && <Tooltip label={tool.name} color={color} />}
        </AnimatePresence>
      </div>
    </div>
  );
}

/* ============================================================
 * <ServicesHub /> — the central clickable node.
 *
 * Shows the currently selected service's icon + name. Click toggles the
 * radial selector. Pulsing halo gives it life; gradient disc ties into
 * the site's pink/magenta/cyan palette.
 * ============================================================ */
function ServicesHub({
  service,
  isOpen,
  onClick,
}: {
  service: Service;
  isOpen: boolean;
  onClick: () => void;
}) {
  const Icon = service.Icon;
  // Hub container takes ~20.8% of the canvas. Larger than before so the core
  // reads as a proper focal point, while still leaving a clear gap to the
  // innermost orbit (now at 240 design-px):
  //   hub radius  ≈ 75 design-px
  //   gap to inner orbit ≈ 240 − 75 = 165 design-px of empty space.
  const hubPct = (150 / SIZE) * 100; // 150/720 ≈ 20.8%
  return (
    <div
      className="pointer-events-none absolute left-1/2 top-1/2 z-30 flex items-center justify-center"
      style={{
        width: `${hubPct}%`,
        height: `${hubPct}%`,
        transform: "translate(-50%, -50%)",
      }}
    >
      {/* Soft bloom */}
      <div
        className="pointer-events-none absolute inset-0 rounded-full"
        style={{
          background: `radial-gradient(circle, ${service.color}55 0%, ${service.color}22 45%, transparent 70%)`,
          filter: "blur(18px)",
        }}
      />

      {/* Pulsing ring halo */}
      <motion.div
        className="pointer-events-none absolute inset-[14%] rounded-full border border-white/25"
        animate={{ scale: [1, 1.18, 1], opacity: [0.5, 0.1, 0.5] }}
        transition={{ duration: 3.6, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Clickable hub — the BUTTON is now the full hub area (rounded-full
          circle inscribed in the wrapper), while the visible conic-gradient
          disc + inner core are rendered as pointer-events-none children.
          Why: previously the button was only 66% wide, but the bloom glow
          extends across the full hub area, so users see "one big circle" but
          only the inner 66% was clickable. As the cursor drifted from the
          visible disc out into the bloom, it toggled pointer↔default — that
          was the hover flicker. Making the button fill the wrapper gives the
          whole glowing center a single, consistent hit target.
          NO `whileHover`: the click-outside catcher (z-[45]) overlays the
          hub the instant the selector opens, so the hub's `onMouseLeave`
          fires mid-click and whileHover would release while `animate` is
          still running — producing a visible scale pop each click.
          `animate` alone handles the open-state scale cleanly.
          Similarly, no `rotateZ` on open: a 180° snap during a pointer event
          just read as flicker rather than polish. */}
      <motion.button
        type="button"
        onClick={onClick}
        animate={{ scale: isOpen ? 1.08 : 1 }}
        transition={{ type: "spring", stiffness: 220, damping: 22 }}
        // Full hub area = one hit target. `bg-transparent` keeps the circle
        // invisible; the visible disc is a child div below.
        className="pointer-events-auto absolute inset-0 flex items-center justify-center rounded-full bg-transparent"
        aria-expanded={isOpen}
        aria-label={`Services hub — ${service.name}`}
      >
        {/* Visible gradient disc — 66% of hub wrapper. pointer-events-none so
            clicks always go to the button behind/around it (no flicker at the
            boundary). `transition-[box-shadow]` gives subtle hover feedback
            via the button's `group`-less `:hover` cascade below. */}
        <div
          className="pointer-events-none relative flex h-[66%] w-[66%] items-center justify-center rounded-full border border-white/20 text-white transition-[box-shadow] duration-200"
          style={{
            background: `conic-gradient(from 140deg, ${service.color}, #ff30ff, #00b7ff, ${service.color})`,
            boxShadow: `0 0 44px ${service.color}bb, inset 0 0 20px rgba(255,255,255,0.28)`,
          }}
        >
          <div
            className="flex h-[78%] w-[78%] items-center justify-center rounded-full bg-[#0a0a14]"
            style={{ boxShadow: `inset 0 0 18px ${service.color}77` }}
          >
            {/* Icon nudged a touch smaller so the inner core feels less "stuffed"
                and the conic-gradient ring around it has more visual breathing
                room. `text-xl md:text-2xl` keeps it legible at the hub's current
                size (150 design-px * 66% inner disc * 78% inner core). */}
            <Icon className="text-xl md:text-2xl" style={{ color: service.color }} />
          </div>
        </div>
      </motion.button>
    </div>
  );
}

/* ============================================================
 * <ServiceSelector /> — radial menu that expands from the hub.
 *
 * Each service button is placed on a circle of `selectorRadius` at
 * evenly-spaced angles. Scaled from center with staggered delay for a
 * "blooming" feel. Clicking a button collapses the selector and
 * switches the selected service.
 * ============================================================ */
function ServiceSelector({
  isOpen,
  onSelect,
  selectedId,
}: {
  isOpen: boolean;
  onSelect: (id: string) => void;
  selectedId: string;
}) {
  // Radius as a % of the container width. Using % here means the selector
  // scales with the orbit canvas — important now that it also lives in the
  // hero side-panel at ~420px instead of 720px.
  const selectorRadiusPct = 38; // of half the container, so actual offset = 38%

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="selector"
          // z-[60] keeps selector above the click-outside catcher (z-[45])
          // AND above the hub (z-30). Scene's 3D transform establishes a
          // stacking context, so these internal z's only compete with each
          // other — the catcher in this same context never hides us.
          className="absolute inset-0 z-[60]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          aria-label="Service selector"
          role="menu"
          // transform-style: flat keeps the selector facing the camera even
          // while the scene tilts from parallax — so clicks always land where
          // the buttons visually appear.
          style={{ transformStyle: "flat" }}
        >
          {SERVICES.map((service, i) => {
            // Distribute services around a circle; -π/2 so first sits at top.
            const angle = (i / SERVICES.length) * Math.PI * 2 - Math.PI / 2;
            const xPct = selectorRadiusPct * Math.cos(angle);
            const yPct = selectorRadiusPct * Math.sin(angle);
            const isCurrent = service.id === selectedId;
            const Icon = service.Icon;

            return (
              <div
                key={service.id}
                className="absolute"
                style={{
                  // Position anchor in %. `left/top 50%` centers on container;
                  // xPct/yPct then push outward. Because we go through the
                  // parent's dimensions, the selector scales automatically.
                  left: `calc(50% + ${xPct}%)`,
                  top: `calc(50% + ${yPct}%)`,
                  transform: "translate(-50%, -50%)",
                }}
              >
                <motion.button
                  type="button"
                  role="menuitem"
                  initial={{ opacity: 0, scale: 0.2 }}
                  animate={{ opacity: 1, scale: isCurrent ? 1.12 : 1 }}
                  exit={{ opacity: 0, scale: 0.2 }}
                  transition={{
                    delay: i * 0.04,
                    type: "spring",
                    stiffness: 240,
                    damping: 20,
                  }}
                  whileHover={{ scale: 1.14 }}
                  onClick={(e) => {
                    // Stop propagation so the catcher behind us doesn't also
                    // swallow the click (defense in depth, even though z order
                    // should already protect us).
                    e.stopPropagation();
                    onSelect(service.id);
                  }}
                  className="pointer-events-auto flex flex-col items-center gap-1.5 rounded-xl border bg-black/70 px-3 py-2 backdrop-blur-md"
                  style={{
                    borderColor: isCurrent ? service.color : `${service.color}60`,
                    boxShadow: isCurrent
                      ? `0 0 24px ${service.color}bb`
                      : `0 0 12px ${service.color}55`,
                    color: service.color,
                    minWidth: 72,
                  }}
                  aria-label={service.name}
                >
                  <Icon className="text-lg md:text-xl" />
                  <span className="text-[10px] font-semibold tracking-wide text-white">
                    {service.shortName}
                  </span>
                </motion.button>
              </div>
            );
          })}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ============================================================
 * <OrbitSystem /> — the 3D scene.
 *
 * Owns:
 *   - service selection state + hover state
 *   - rAF loop for per-frame 3D positioning of items
 *   - container-width measurement for scale factor (ResizeObserver)
 *   - mouse parallax (tilts the scene slightly with cursor)
 * ============================================================ */
// Exported so other sections (like Header) can embed the visualization
// without the surrounding <section>/heading/description.
export function OrbitSystem() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<HTMLDivElement>(null); // parallax target (inner 3D layer)
  const itemRefs = useRef<Array<HTMLDivElement | null>>([]);

  // Each tool's current angle along its orbit (mutated every frame).
  const anglesRef = useRef<number[]>([]);

  // Actual pixel scale of the scene relative to SIZE, for rAF math.
  const scaleRef = useRef(1);

  const [selectedId, setSelectedId] = useState<string>(SERVICES[0].id);
  const [selectorOpen, setSelectorOpen] = useState(false);
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  // Refs for rAF to read hover/open without restarting
  const hoveredRef = useRef<number | null>(null);
  const selectorOpenRef = useRef(false);
  useEffect(() => {
    hoveredRef.current = hoveredIdx;
  }, [hoveredIdx]);
  useEffect(() => {
    selectorOpenRef.current = selectorOpen;
  }, [selectorOpen]);

  const selectedService = useMemo(
    () => SERVICES.find((s) => s.id === selectedId) ?? SERVICES[0],
    [selectedId],
  );

  /* ---------- Distribute the current service's tools across orbits ----------
     Tools are round-robin'd onto the 3 orbits (tool 0 → orbit 0, 1 → 1, 2 → 2,
     3 → 0, …). Within each orbit they're then spread evenly around the ring
     using (indexOnOrbit / totalOnOrbit) * 2π as the phase offset. This
     guarantees tools don't bunch up regardless of how many there are. */
  const assignments = useMemo(() => {
    const grouped: number[][] = [[], [], []];
    selectedService.tools.forEach((_, i) => {
      grouped[i % ORBITS.length].push(i);
    });
    const out: { orbitIdx: number; phase: number }[] = [];
    for (let i = 0; i < selectedService.tools.length; i++) {
      const orbitIdx = i % ORBITS.length;
      const pos = grouped[orbitIdx].indexOf(i);
      const total = grouped[orbitIdx].length;
      out[i] = { orbitIdx, phase: (pos / Math.max(total, 1)) * Math.PI * 2 };
    }
    return out;
  }, [selectedService]);

  // Reset angle state whenever the tool set changes (service switched).
  useEffect(() => {
    anglesRef.current = assignments.map((a) => a.phase);
    itemRefs.current = itemRefs.current.slice(0, assignments.length);
  }, [assignments]);

  /* ---------- ResizeObserver → scaleRef ---------- */
  useEffect(() => {
    const el = wrapRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver((entries) => {
      const w = entries[0].contentRect.width;
      scaleRef.current = w / SIZE;
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  /* ---------- rAF: update each tool's transform ---------- */
  useEffect(() => {
    const reduced = prefersReducedMotion();
    let raf = 0;
    let last = performance.now();

    const tick = (now: number) => {
      // Clamp dt so tab switches don't fling items across full orbits.
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;

      const scale = scaleRef.current;
      const paused = selectorOpenRef.current; // whole system calms when picking

      assignments.forEach((a, i) => {
        const orbit = ORBITS[a.orbitIdx];
        const itemPaused = paused || reduced || hoveredRef.current === i;
        if (!itemPaused) {
          anglesRef.current[i] += orbit.speed * dt;
        }

        const el = itemRefs.current[i];
        if (!el) return;

        const angle = anglesRef.current[i] ?? a.phase;
        const p = orbitalPosition(orbit.radius, angle, orbit.tiltDeg, orbit.yawDeg);

        // Apply the container scale so math that reasons in SIZE-units maps
        // to the actual pixel scene size.
        const x = p.x * scale;
        const y = p.y * scale;
        const z = p.z * scale;

        // translate3d → browser's perspective projects this naturally, so
        // items at +z (closer) get larger and -z (farther) get smaller.
        el.style.transform = `translate3d(${x}px, ${y}px, ${z}px)`;

        // Opacity by depth to emphasize the near/far feel.
        // zNorm in [0,1] where 1 = closest point on this orbit.
        const zNorm = (p.z + orbit.radius) / (2 * orbit.radius);
        el.style.opacity = String(0.35 + 0.65 * zNorm);
      });

      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // Depend on assignments so switching service restarts the loop cleanly.
  }, [assignments]);

  /* ---------- Mouse parallax: tilts the scene (rotateX/Y) ----------
     Instead of moving the scene in x/y (which would make orbits slide away),
     we tilt it slightly — so orbits "look at" the cursor. More 3D, less
     distracting. Max tilt ~6° either direction. */
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const rect = wrapRef.current?.getBoundingClientRect();
    const scene = sceneRef.current;
    if (!rect || !scene) return;
    const nx = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
    const ny = ((e.clientY - rect.top) / rect.height - 0.5) * 2;
    scene.style.setProperty("--tilt-y", `${nx * 6}deg`);
    scene.style.setProperty("--tilt-x", `${-ny * 6}deg`);
  }, []);

  const handleMouseLeave = useCallback(() => {
    const scene = sceneRef.current;
    if (!scene) return;
    scene.style.setProperty("--tilt-y", "0deg");
    scene.style.setProperty("--tilt-x", "0deg");
  }, []);

  /* ---------- Initial positions passed to each item to avoid a frame-0 flash at center ---------- */
  const initialPositions = useMemo(
    () =>
      assignments.map((a) => {
        const orbit = ORBITS[a.orbitIdx];
        return orbitalPosition(orbit.radius, a.phase, orbit.tiltDeg, orbit.yawDeg);
      }),
    [assignments],
  );

  return (
    // Outer wrapper holds both the 3D scene (aspect-square) and the status
    // label. Pulling the label OUT of the aspect-square means it can't ever
    // overlap the outer orbit — it just flows below the scene with its own
    // margin. wrapRef stays on the scene container so the ResizeObserver
    // measures the correct square for scale math.
    <div className="relative mx-auto w-full max-w-[720px] select-none">
      <div
        ref={wrapRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        className="relative aspect-square w-full"
        style={{
          // Perspective makes child translate3d actually feel 3D. Higher value
          // → flatter look; lower → more exaggerated depth.
          perspective: "1200px",
          perspectiveOrigin: "50% 50%",
        }}
      >
        <Starfield />

      {/* Radial glow behind the scene */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(circle at 50% 50%, rgba(255,0,79,0.10), transparent 55%)",
        }}
      />

      {/* 3D scene layer — tilts via CSS vars updated on mousemove. */}
      <div
        ref={sceneRef}
        className="absolute inset-0"
        style={{
          transformStyle: "preserve-3d",
          transform:
            "rotateX(var(--tilt-x, 0deg)) rotateY(var(--tilt-y, 0deg))",
          transition: "transform 0.25s ease-out",
        }}
      >
        {/* Orbit rings (behind the hub) */}
        {ORBITS.map((o, i) => (
          <OrbitRing key={i} orbit={o} color={selectedService.color} />
        ))}

        {/* Click-outside catcher (active only while selector open).
            Lives INSIDE sceneRef so it participates in the same stacking
            context as the selector (which sits at z-[60]). It uses z-[45]
            so it sits above orbit items and the hub but *below* the selector
            buttons — meaning clicks on the selector buttons hit them, while
            clicks anywhere else inside the scene close the menu. */}
        {selectorOpen && (
          <button
            type="button"
            aria-label="Close service selector"
            onClick={() => setSelectorOpen(false)}
            className="absolute inset-0 z-[45] cursor-default"
            style={{ transformStyle: "flat" }}
          />
        )}

        {/* Central hub */}
        <ServicesHub
          service={selectedService}
          isOpen={selectorOpen}
          onClick={() => setSelectorOpen((v) => !v)}
        />

        {/* Orbiting tools — keyed by service so service-swap triggers
            unmount/mount via AnimatePresence parent (below). */}
        <AnimatePresence mode="wait">
          <motion.div
            key={selectedService.id}
            className="absolute inset-0"
            style={{ transformStyle: "preserve-3d" }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
          >
            {selectedService.tools.map((tool, i) => (
              <OrbitItem
                key={`${selectedService.id}-${tool.name}-${i}`}
                tool={tool}
                color={selectedService.color}
                isHovered={hoveredIdx === i}
                onHover={(h) => setHoveredIdx(h ? i : null)}
                innerRef={(el) => {
                  itemRefs.current[i] = el;
                }}
                initialPos={initialPositions[i] ?? { x: 0, y: 0, z: 0 }}
              />
            ))}
          </motion.div>
        </AnimatePresence>

        {/* Radial selector overlays on top of the scene when open. */}
        <ServiceSelector
          isOpen={selectorOpen}
          selectedId={selectedId}
          onSelect={(id) => {
            setSelectedId(id);
            setSelectorOpen(false);
          }}
        />
        </div>
      </div>

      {/* Status label — sits BELOW the aspect-square scene in normal flow,
          so the outer orbit can never collide with it no matter how wide the
          orbits get. Margin-top gives it breathing room from the widget. */}
      <div className="mt-6 flex justify-center">
        <AnimatePresence mode="wait">
          <motion.div
            key={selectedService.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.3 }}
            className="pointer-events-none text-center"
          >
            <div
              className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/65 px-4 py-1.5 backdrop-blur-md"
              style={{ boxShadow: `0 0 22px ${selectedService.color}55` }}
            >
              <span
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: selectedService.color }}
              />
              <span className="text-xs font-semibold text-white">
                {selectedService.name}
              </span>
              <span className="hidden text-[11px] text-white/60 sm:inline">
                · {selectedService.tagline}
              </span>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

/* ============================================================
 * <TechMarquee /> — section wrapper. Kept export name stable so
 * app/page.tsx needs no changes.
 * ============================================================ */
export default function TechMarquee() {
  return (
    <section className="relative overflow-hidden px-6 py-24 md:px-[10%]">
      {/* Layered space-like backdrop */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at 50% 30%, rgba(0,183,255,0.10), transparent 60%), radial-gradient(ellipse at 50% 90%, rgba(255,48,255,0.08), transparent 60%)",
        }}
      />

      <div className="relative mx-auto max-w-[1400px]">
        <div className="flex flex-col items-center gap-3 text-center">
          <span className="text-sm uppercase tracking-[0.3em] text-accent">
            Services & Tech
          </span>
          <h2 className="text-4xl font-semibold md:text-5xl">
            A stellar hub of what I do
          </h2>
          <p className="mt-2 max-w-2xl text-muted">
            Click the core to pick a service — the orbit reconfigures with the
            tools I use for it. Hover any planet to pause and inspect.
          </p>
        </div>

        <div className="mt-10 md:mt-14">
          <OrbitSystem />
        </div>
      </div>
    </section>
  );
}
