import type { Emitter } from "./Particles";

export type WeatherKind = "clear" | "rain" | "mist";

export interface WeatherState {
  kind: WeatherKind;
  /** Horizontal drift applied to every particle, so rain and leaves share one wind. */
  wind: number;
  /** Extra darkening of the whole scene. */
  gloom: number;
  label: string;
}

export function weatherState(kind: WeatherKind): WeatherState {
  switch (kind) {
    case "rain":
      return { kind, wind: -14, gloom: 0.22, label: "Light rain" };
    case "mist":
      return { kind, wind: -4, gloom: 0.1, label: "Morning mist" };
    default:
      return { kind, wind: -2, gloom: 0, label: "Clear" };
  }
}

export function weatherEmitters(kind: WeatherKind, w: number): Emitter[] {
  if (kind === "rain") {
    return [
      { id: "rain", kind: "rain", x: w * 0.55, y: -8, rate: 90, spreadX: w * 1.5, spreadY: 10 },
    ];
  }
  return [];
}

/** Mist bands and rain gloom are drawn over the world but under the UI. */
export function drawWeatherOverlay(
  ctx: CanvasRenderingContext2D,
  state: WeatherState,
  w: number,
  h: number,
  groundY: number,
  time: number,
) {
  if (state.gloom > 0) {
    ctx.fillStyle = `rgba(40,52,68,${state.gloom})`;
    ctx.fillRect(0, 0, w, h);
  }

  if (state.kind === "mist") {
    // soft horizontal bands drifting across the middle distance
    for (let i = 0; i < 4; i++) {
      const y = groundY - 20 + i * 16;
      const offset = ((time / (40 + i * 14)) % (w + 200)) - 100;
      const grad = ctx.createLinearGradient(offset - 120, 0, offset + 120, 0);
      grad.addColorStop(0, "rgba(228,236,240,0)");
      grad.addColorStop(0.5, `rgba(228,236,240,${0.16 + i * 0.03})`);
      grad.addColorStop(1, "rgba(228,236,240,0)");
      ctx.fillStyle = grad;
      ctx.fillRect(0, y, w, 12);
    }
    ctx.fillStyle = "rgba(226,234,239,0.1)";
    ctx.fillRect(0, 0, w, h);
  }
}

/** Rings spreading where rain strikes the pond. */
export function drawRainRipples(
  ctx: CanvasRenderingContext2D,
  rect: { x: number; y: number; w: number; h: number },
  time: number,
) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(rect.x, rect.y, rect.w, rect.h);
  ctx.clip();
  ctx.strokeStyle = "rgba(230,248,251,0.5)";
  ctx.lineWidth = 1;
  for (let i = 0; i < 10; i++) {
    const seed = i * 97.13;
    const cycle = (time / 900 + (seed % 1)) % 1;
    const rx = rect.x + ((seed * 37) % rect.w);
    const ry = rect.y + ((seed * 53) % rect.h);
    const r = cycle * 6;
    ctx.globalAlpha = (1 - cycle) * 0.6;
    ctx.beginPath();
    ctx.ellipse(rx, ry, r, r * 0.45, 0, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  ctx.restore();
}
