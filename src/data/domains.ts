/** The five domains activities are grouped by. Descriptive groupings, not findings. */
export type CognitiveDomain = "memory" | "attention" | "speed" | "language" | "visuospatial";

export const DOMAINS: CognitiveDomain[] = ["memory", "attention", "speed", "language", "visuospatial"];

export const DOMAIN_NAMES: Record<CognitiveDomain, string> = {
  memory: "Memory",
  attention: "Attention",
  speed: "Processing speed",
  language: "Language",
  visuospatial: "Visuospatial",
};

/**
 * THE FIVE THREADS — one fixed colour per domain, identical in every chart across the
 * whole app (Alerts, Trends, RUDAS, the health-worker view, the referral export). Picked
 * once, from the game's palette, as CSS custom properties so light/print contexts agree.
 */
export const DOMAIN_THREAD: Record<CognitiveDomain, string> = {
  memory: "var(--thread-memory)",
  attention: "var(--thread-attention)",
  speed: "var(--thread-speed)",
  language: "var(--thread-language)",
  visuospatial: "var(--thread-visuospatial)",
};
