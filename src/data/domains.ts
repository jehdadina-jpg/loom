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
 * once, from the game's palette. Literal hex, not CSS variables: DomainCharts.tsx is also
 * rendered into a standalone referral file that carries no app stylesheet, so the colour
 * has to be real everywhere it's used, in print included. The matching --thread-* custom
 * properties in index.css exist only so the same values are available to class-based CSS.
 */
export const DOMAIN_THREAD: Record<CognitiveDomain, string> = {
  memory: "#c25a2e",
  attention: "#6b8e4e",
  speed: "#4e7ea3",
  language: "#a8643b",
  visuospatial: "#8a5ca8",
};
