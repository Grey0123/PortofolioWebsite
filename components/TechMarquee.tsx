"use client";
/**
 * "Stellar Orbit Hub" — a true 3D orbital visualization of the services
 * I offer and the tools that power them.
 *
 * The 3D math + animation is unchanged from the original; the only
 * meaningful difference is that the SERVICES list now comes from the
 * FastAPI `/content` endpoint as props, instead of being hardcoded
 * inside this file. Icon names (strings) are resolved to React components
 * via lib/icons.ts.
 *
 * For full architecture comments on the rAF loop, perspective math, and
 * orbital geometry, see the inline notes below.
 */

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { IconType } from "react-icons";

import { getIcon } from "@/lib/icons";
import type { ApiOrbitService } from "@/lib/api";

/* ============================================================
 * INTERNAL TYPES
 * ============================================================ */
type Tool = {
  name: string;
  icon?: ReactNode;
};

type Service = {
  id: string;        // slug from DB
  name: string;
  shortName: string;
  tagline: string;
  color: string;
  Icon: IconType;
  tools: Tool[];
};

type Orbit = {
  radius: number;
  speed: number;
  tiltDeg: number;
  yawDeg: number;
};

/* ============================================================
 * Convert the API shape (icon names as strings) into the internal
 * shape this component already knows how to render. Doing the
 * conversion in one place keeps the rest of the file unchanged.
 * ============================================================ */
function toInternal(api: ApiOrbitService): Service {
  return {
    id: api.slug,
    name: api.name,
    shortName: api.short_name,
    tagline: api.tagline,
    color: api.color,
    Icon: getIcon(api.icon),
    tools: api.tools.map((t) => {
      // Tools whose `icon` is null show a 3-letter abbreviation in the UI;
      // we leave `icon` undefined here so the existing render path uses
      // the abbreviation fallback.
      if (!t.icon) return { name: t.name };
      const ToolIcon = getIcon(t.icon);
      return { name: t.name, icon: <ToolIcon /> };
    }),
  };
}

// Boring fallback so the hero still renders something if the API is down.
const FALLBACK_SERVICE: Service = {
  id: "fallback",
  name: "Services",
  shortName: "Services",
  tagline: "Loading…",
  color: "#00b7ff",
  Icon: getIcon("FaCode"),
  tools: [],
};

/* ============================================================
 * SCENE CONSTANTS
 * ============================================================ */
const SIZE = 720;

const ORBITS: Orbit[] = [
  { radius: 280, speed: 0.70, tiltDeg: 72, yawDeg:   0 }, // Saturn-horizontal
  { radius: 325, speed: 0.46, tiltDeg: 22, yawDeg:  70 }, // near-vertical, yawed
  { radius: 365, speed: 0.30, tiltDeg: 50, yawDeg: -35 }, // diagonal outer
];

/* ============================================================
 * MATH HELPERS
 * ============================================================ */
const degToRad = (d: number) => (d * Math.PI) / 180;

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

const prefersReducedMotion = (): boolean =>
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/* ============================================================
 * <Starfield /> — deterministic backdrop dots
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
 * ============================================================ */
type OrbitItemProps = {
  tool: Tool;
  color: string;
  isHovered: boolean;
  onHover: (hovered: boolean) => void;
  innerRef: (el: HTMLDivElement | null) => void;
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
        transform: `translate3d(${initialPos.x}px, ${initialPos.y}px, ${initialPos.z}px)`,
        transformStyle: "preserve-3d",
        willChange: "transform, opacity",
      }}
    >
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
  const hubPct = (150 / SIZE) * 100;
  return (
    <div
      className="pointer-events-none absolute left-1/2 top-1/2 z-30 flex items-center justify-center"
      style={{
        width: `${hubPct}%`,
        height: `${hubPct}%`,
        transform: "translate(-50%, -50%)",
      }}
    >
      <div
        className="pointer-events-none absolute inset-0 rounded-full"
        style={{
          background: `radial-gradient(circle, ${service.color}55 0%, ${service.color}22 45%, transparent 70%)`,
          filter: "blur(18px)",
        }}
      />

      <motion.div
        className="pointer-events-none absolute inset-[14%] rounded-full border border-white/25"
        animate={{ scale: [1, 1.18, 1], opacity: [0.5, 0.1, 0.5] }}
        transition={{ duration: 3.6, repeat: Infinity, ease: "easeInOut" }}
      />

      <motion.button
        type="button"
        onClick={onClick}
        animate={{ scale: isOpen ? 1.08 : 1 }}
        transition={{ type: "spring", stiffness: 220, damping: 22 }}
        className="pointer-events-auto absolute inset-0 flex items-center justify-center rounded-full bg-transparent"
        aria-expanded={isOpen}
        aria-label={`Services hub — ${service.name}`}
      >
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
            <Icon className="text-xl md:text-2xl" style={{ color: service.color }} />
          </div>
        </div>
      </motion.button>
    </div>
  );
}

/* ============================================================
 * <ServiceSelector /> — radial menu that expands from the hub.
 * ============================================================ */
function ServiceSelector({
  services,
  isOpen,
  onSelect,
  selectedId,
}: {
  services: Service[];
  isOpen: boolean;
  onSelect: (id: string) => void;
  selectedId: string;
}) {
  const selectorRadiusPct = 38;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="selector"
          className="absolute inset-0 z-[60]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          aria-label="Service selector"
          role="menu"
          style={{ transformStyle: "flat" }}
        >
          {services.map((service, i) => {
            const angle = (i / services.length) * Math.PI * 2 - Math.PI / 2;
            const xPct = selectorRadiusPct * Math.cos(angle);
            const yPct = selectorRadiusPct * Math.sin(angle);
            const isCurrent = service.id === selectedId;
            const Icon = service.Icon;

            return (
              <div
                key={service.id}
                className="absolute"
                style={{
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
 * <OrbitSystem />
 * ============================================================ */
export function OrbitSystem({ services: apiServices }: { services?: ApiOrbitService[] }) {
  // Convert API shape → internal shape once per render. `useMemo` so we
  // don't rebuild the icon nodes on every state change inside the scene.
  const services = useMemo<Service[]>(
    () =>
      (apiServices ?? []).length > 0
        ? (apiServices ?? []).map(toInternal)
        : [FALLBACK_SERVICE],
    [apiServices],
  );

  const wrapRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<Array<HTMLDivElement | null>>([]);
  const anglesRef = useRef<number[]>([]);
  const scaleRef = useRef(1);

  const [selectedId, setSelectedId] = useState<string>(services[0].id);
  const [selectorOpen, setSelectorOpen] = useState(false);
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  // If services list changes (rare — only on revalidate), make sure the
  // currently selected id still exists; otherwise fall back to the first.
  useEffect(() => {
    if (!services.find((s) => s.id === selectedId)) {
      setSelectedId(services[0].id);
    }
  }, [services, selectedId]);

  const hoveredRef = useRef<number | null>(null);
  const selectorOpenRef = useRef(false);
  useEffect(() => {
    hoveredRef.current = hoveredIdx;
  }, [hoveredIdx]);
  useEffect(() => {
    selectorOpenRef.current = selectorOpen;
  }, [selectorOpen]);

  const selectedService = useMemo(
    () => services.find((s) => s.id === selectedId) ?? services[0],
    [services, selectedId],
  );

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

  useEffect(() => {
    anglesRef.current = assignments.map((a) => a.phase);
    itemRefs.current = itemRefs.current.slice(0, assignments.length);
  }, [assignments]);

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

  useEffect(() => {
    const reduced = prefersReducedMotion();
    let raf = 0;
    let last = performance.now();

    const tick = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;

      const scale = scaleRef.current;
      const paused = selectorOpenRef.current;

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

        const x = p.x * scale;
        const y = p.y * scale;
        const z = p.z * scale;

        el.style.transform = `translate3d(${x}px, ${y}px, ${z}px)`;
        const zNorm = (p.z + orbit.radius) / (2 * orbit.radius);
        el.style.opacity = String(0.35 + 0.65 * zNorm);
      });

      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [assignments]);

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

  const initialPositions = useMemo(
    () =>
      assignments.map((a) => {
        const orbit = ORBITS[a.orbitIdx];
        return orbitalPosition(orbit.radius, a.phase, orbit.tiltDeg, orbit.yawDeg);
      }),
    [assignments],
  );

  return (
    <div className="relative mx-auto w-full max-w-[720px] select-none">
      <div
        ref={wrapRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        className="relative aspect-square w-full"
        style={{
          perspective: "1200px",
          perspectiveOrigin: "50% 50%",
        }}
      >
        <Starfield />

        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(circle at 50% 50%, rgba(255,0,79,0.10), transparent 55%)",
          }}
        />

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
          {ORBITS.map((o, i) => (
            <OrbitRing key={i} orbit={o} color={selectedService.color} />
          ))}

          {selectorOpen && (
            <button
              type="button"
              aria-label="Close service selector"
              onClick={() => setSelectorOpen(false)}
              className="absolute inset-0 z-[45] cursor-default"
              style={{ transformStyle: "flat" }}
            />
          )}

          <ServicesHub
            service={selectedService}
            isOpen={selectorOpen}
            onClick={() => setSelectorOpen((v) => !v)}
          />

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

          <ServiceSelector
            services={services}
            isOpen={selectorOpen}
            selectedId={selectedId}
            onSelect={(id) => {
              setSelectedId(id);
              setSelectorOpen(false);
            }}
          />
        </div>
      </div>

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
export default function TechMarquee({
  services,
}: {
  services?: ApiOrbitService[];
}) {
  return (
    <section className="relative overflow-hidden px-6 py-24 md:px-[10%]">
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
          <OrbitSystem services={services} />
        </div>
      </div>
    </section>
  );
}
