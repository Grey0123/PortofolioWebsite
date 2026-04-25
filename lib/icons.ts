/**
 * Icon registry — maps an icon NAME (string from the database) to a
 * concrete React component (IconType from react-icons).
 *
 * Why not store the component itself in the DB?
 *   - Postgres doesn't speak React. Strings are the only practical
 *     wire format between the API and the frontend.
 *   - Keeping the registry in code means tree-shaking still works:
 *     only the icons we actually use ship in the bundle, and TypeScript
 *     can warn at build time if a referenced icon doesn't exist.
 *
 * Adding a new icon:
 *   1. Import it from react-icons here.
 *   2. Add the `"FaWhatever": FaWhatever` line to ICONS.
 *   3. Use the string `"FaWhatever"` in your seed/SQL data.
 *
 * Naming: we keep the react-icons name exactly (e.g. "FaDatabase") so
 * the DB matches what you'd type in code — no translation table to
 * remember.
 */

import type { IconType } from "react-icons";
import {
  FaBriefcase,
  FaProjectDiagram,
  FaUserTie,
  FaMapMarkerAlt,
  FaDatabase,
  FaRobot,
  FaMicroscope,
  FaCode,
  FaMobileAlt,
  FaGamepad,
  FaServer,
  FaBrain,
  FaSpider,
  FaPlug,
  FaChartLine,
  FaSatelliteDish,
  FaJava,
  FaFacebook,
  FaTwitterSquare,
  FaInstagram,
  FaLinkedin,
  FaPaperPlane,
  FaPhoneAlt,
} from "react-icons/fa";
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

export const ICONS: Record<string, IconType> = {
  // Fa (Font Awesome)
  FaBriefcase, FaProjectDiagram, FaUserTie, FaMapMarkerAlt,
  FaDatabase, FaRobot, FaMicroscope, FaCode, FaMobileAlt, FaGamepad,
  FaServer, FaBrain, FaSpider, FaPlug, FaChartLine, FaSatelliteDish,
  FaJava,
  FaFacebook, FaTwitterSquare, FaInstagram, FaLinkedin,
  FaPaperPlane, FaPhoneAlt,
  // Si (Simple Icons / brand logos)
  SiPython, SiTypescript, SiReact, SiNextdotjs, SiNodedotjs,
  SiTailwindcss, SiSelenium, SiDocker, SiGit, SiMysql, SiFirebase,
  SiSpring, SiFastapi, SiFlutter, SiTensorflow,
  SiPostgresql, SiMongodb, SiGraphql, SiRedis, SiOpenai, SiLangchain,
};

/**
 * Look up an icon by name with a safe fallback.
 *
 * If a DB row references an icon that hasn't been added to the registry
 * yet (e.g. you're previewing prod data locally), we return FaCode as a
 * boring placeholder rather than crashing the page.
 */
export function getIcon(name: string | null | undefined): IconType {
  if (!name) return FaCode;
  return ICONS[name] ?? FaCode;
}
