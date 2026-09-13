/**
 * Continuous day/night model.
 *
 * `phase` runs 0..1 over a full day: 0 = midnight, 0.25 = sunrise, 0.5 = noon,
 * 0.75 = sunset. Everything the renderer needs to light a scene — sky gradient,
 * sun position, light tint, shadow direction, whether lamps are lit — is derived
 * from that single number, so lighting stays consistent across every layer.
 */

export interface SkyState {
  phase: number;
  skyTop: string;
  skyMid: string;
  skyLow: string;
  /** Normalised sun position across the sky dome (0..1 x, 0..1 y of the sky band). */
  sunX: number;
  sunY: number;
  sunColor: string;
  sunGlowAlpha: number;
  /** Full-scene colour wash that binds foreground and backdrop together. */
  lightTint: string;
  lightAlpha: number;
  starAlpha: number;
  isNight: boolean;
  lampsOn: boolean;
  /** Cast-shadow direction (unit-ish) and length multiplier. */
  shadowDx: number;
  shadowLen: number;
  shadowAlpha: number;
  /** Label surfaced to caregivers, never to the patient. */
  label: string;
}

interface Keyframe {
  at: number;
  skyTop: string;
  skyMid: string;
  skyLow: string;
  sunColor: string;
  lightTint: string;
  lightAlpha: number;
  label: string;
}

const KEYS: Keyframe[] = [
  { at: 0.0, skyTop: "#0b1030", skyMid: "#1b2350", skyLow: "#2d3663", sunColor: "#cfd8ff", lightTint: "#2a3570", lightAlpha: 0.46, label: "Night" },
  { at: 0.21, skyTop: "#1e2a5c", skyMid: "#5a4a7a", skyLow: "#c58a72", sunColor: "#ffd9a8", lightTint: "#6a4a72", lightAlpha: 0.3, label: "Before dawn" },
  { at: 0.28, skyTop: "#5b8ac9", skyMid: "#e8a878", skyLow: "#f6d8ae", sunColor: "#ffe2b0", lightTint: "#ffb877", lightAlpha: 0.2, label: "Sunrise" },
  { at: 0.36, skyTop: "#79bde4", skyMid: "#a9dced", skyLow: "#dcefe0", sunColor: "#fff3cf", lightTint: "#ffe9bd", lightAlpha: 0.08, label: "Morning" },
  { at: 0.5, skyTop: "#6fbbe8", skyMid: "#a4daf0", skyLow: "#dcf0e8", sunColor: "#ffffff", lightTint: "#fff7dc", lightAlpha: 0.05, label: "Midday" },
  { at: 0.66, skyTop: "#7cc0e0", skyMid: "#bfdcea", skyLow: "#f0e3c4", sunColor: "#fff0c8", lightTint: "#ffe4ae", lightAlpha: 0.1, label: "Afternoon" },
  { at: 0.76, skyTop: "#e0a765", skyMid: "#f2cb8c", skyLow: "#fae3bc", sunColor: "#ffcf85", lightTint: "#ffb066", lightAlpha: 0.2, label: "Golden hour" },
  { at: 0.83, skyTop: "#6b6ea8", skyMid: "#a9789c", skyLow: "#dda183", sunColor: "#ffb17a", lightTint: "#9a6f9c", lightAlpha: 0.3, label: "Sunset" },
  { at: 0.9, skyTop: "#26305e", skyMid: "#42406e", skyLow: "#6b5674", sunColor: "#d8c5ff", lightTint: "#3d4380", lightAlpha: 0.4, label: "Dusk" },
  { at: 1.0, skyTop: "#0b1030", skyMid: "#1b2350", skyLow: "#2d3663", sunColor: "#cfd8ff", lightTint: "#2a3570", lightAlpha: 0.46, label: "Night" },
];

function hexToRgb(hex: string) {
  const h = hex.replace("#", "");
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

function mix(a: string, b: string, t: number): string {
  const [ar, ag, ab] = hexToRgb(a);
  const [br, bg, bb] = hexToRgb(b);
  const r = Math.round(ar + (br - ar) * t);
  const g = Math.round(ag + (bg - ag) * t);
  const bl = Math.round(ab + (bb - ab) * t);
  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${bl.toString(16).padStart(2, "0")}`;
}

export function skyStateFor(phaseRaw: number): SkyState {
  const phase = ((phaseRaw % 1) + 1) % 1;

  let i = 0;
  while (i < KEYS.length - 2 && phase > KEYS[i + 1].at) i++;
  const a = KEYS[i];
  const b = KEYS[i + 1];
  const t = b.at === a.at ? 0 : (phase - a.at) / (b.at - a.at);

  // daylight window is roughly 0.25 -> 0.83
  const dayStart = 0.25;
  const dayEnd = 0.83;
  const inDay = phase > dayStart && phase < dayEnd;
  const dayT = inDay ? (phase - dayStart) / (dayEnd - dayStart) : phase <= dayStart ? 0 : 1;

  // sun arcs left -> right, rising and setting at the horizon
  const sunX = 0.08 + dayT * 0.84;
  const sunY = 1 - Math.sin(dayT * Math.PI) * 0.92;

  const isNight = !inDay;
  const nightness = isNight ? 1 : Math.max(0, 1 - Math.sin(dayT * Math.PI) * 1.8);

  // shadows stretch long near the horizon and point away from the sun
  const sunHeight = Math.max(0.05, Math.sin(Math.max(0, dayT) * Math.PI));
  const shadowDx = inDay ? (dayT < 0.5 ? 1 : -1) * (1 - sunHeight) * 2.4 : 0.4;
  const shadowLen = inDay ? 0.5 + (1 - sunHeight) * 1.9 : 0.35;

  return {
    phase,
    skyTop: mix(a.skyTop, b.skyTop, t),
    skyMid: mix(a.skyMid, b.skyMid, t),
    skyLow: mix(a.skyLow, b.skyLow, t),
    sunX,
    sunY,
    sunColor: mix(a.sunColor, b.sunColor, t),
    sunGlowAlpha: inDay ? 0.45 + sunHeight * 0.4 : 0.25,
    lightTint: mix(a.lightTint, b.lightTint, t),
    lightAlpha: a.lightAlpha + (b.lightAlpha - a.lightAlpha) * t,
    starAlpha: Math.max(0, Math.min(1, nightness * 1.1)),
    isNight,
    lampsOn: phase < 0.3 || phase > 0.76,
    shadowDx,
    shadowLen,
    shadowAlpha: inDay ? 0.16 + sunHeight * 0.2 : 0.1,
    label: t < 0.5 ? a.label : b.label,
  };
}

export type TimeMode = "real" | "cycle" | "fixed-day" | "fixed-golden" | "fixed-night";

/** Resolves the current phase from the chosen mode (and, for cycling, wall-clock ms). */
export function phaseFor(mode: TimeMode, nowMs: number, fixedPhase = 0.5): number {
  switch (mode) {
    case "real": {
      const d = new Date(nowMs);
      return (d.getHours() * 60 + d.getMinutes()) / 1440;
    }
    case "cycle":
      // a full day every eight minutes — slow enough to never feel like motion
      return ((nowMs / 480000) % 1 + 1) % 1;
    case "fixed-golden":
      return 0.76;
    case "fixed-night":
      return 0.02;
    default:
      return fixedPhase;
  }
}
