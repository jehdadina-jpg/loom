/**
 * Chunky pixel particle system. Everything is drawn as small opaque rects so it
 * sits inside the art style rather than looking like a modern VFX layer on top.
 * Motion is kept slow and soft — nothing here should flash, dart or startle.
 */

export type ParticleKind =
  | "smoke"
  | "firefly"
  | "leaf"
  | "rain"
  | "dust"
  | "butterfly"
  | "splash"
  | "ember";

export interface Particle {
  kind: ParticleKind;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
  seed: number;
}

export interface Emitter {
  id: string;
  kind: ParticleKind;
  x: number;
  y: number;
  /** Particles per second. */
  rate: number;
  /** Spawn spread around the origin. */
  spreadX?: number;
  spreadY?: number;
  enabled?: boolean;
  /** Fireflies and embers only make sense once the light goes. */
  nightOnly?: boolean;
  /** Blossom, butterflies and dust motes belong to daylight. */
  dayOnly?: boolean;
  accrual?: number;
}

const PALETTES: Record<ParticleKind, string[]> = {
  smoke: ["#c9c4bb", "#aeaaa2", "#8d8a84"],
  firefly: ["#f6f0a8", "#ffe27a", "#d8f08a"],
  leaf: ["#7fce6c", "#c99a3a", "#d9b23e", "#3f9346"],
  rain: ["#a8c8dd", "#8fb6cf", "#c6dced"],
  dust: ["#fff3cf", "#f2e3bb", "#ffe9bd"],
  butterfly: ["#f0e5ca", "#ec9a41", "#d2564a", "#a9789c"],
  splash: ["#e6f8fb", "#8bcddd"],
  ember: ["#ffbe5c", "#ff8a3c", "#ffe1a1"],
};

function pick(arr: string[], seed: number): string {
  return arr[Math.floor(seed * arr.length) % arr.length];
}

export class ParticleField {
  private particles: Particle[] = [];
  private emitters: Emitter[] = [];
  private lastMs = 0;
  private max: number;

  constructor(max = 320) {
    this.max = max;
  }

  setEmitters(emitters: Emitter[]) {
    // preserve accrual for emitters that persist across a re-set
    const prev = new Map(this.emitters.map((e) => [e.id, e.accrual ?? 0]));
    this.emitters = emitters.map((e) => ({ ...e, accrual: prev.get(e.id) ?? 0 }));
  }

  clear() {
    this.particles.length = 0;
  }

  private spawn(kind: ParticleKind, x: number, y: number) {
    if (this.particles.length >= this.max) return;
    const seed = Math.random();
    const base: Particle = {
      kind,
      x,
      y,
      vx: 0,
      vy: 0,
      life: 0,
      maxLife: 2,
      size: 1,
      color: pick(PALETTES[kind], seed),
      seed,
    };

    switch (kind) {
      case "smoke":
        base.vx = (seed - 0.5) * 4;
        base.vy = -10 - seed * 8;
        base.maxLife = 3.4 + seed * 1.6;
        base.size = 1 + Math.round(seed * 1.4);
        break;
      case "ember":
        base.vx = (seed - 0.5) * 6;
        base.vy = -14 - seed * 10;
        base.maxLife = 0.9 + seed * 0.6;
        base.size = 1;
        break;
      case "firefly":
        base.vx = (seed - 0.5) * 8;
        base.vy = (Math.random() - 0.5) * 6;
        base.maxLife = 5 + seed * 4;
        base.size = 1;
        break;
      case "leaf":
        base.vx = -6 - seed * 10;
        base.vy = 5 + seed * 6;
        base.maxLife = 6 + seed * 3;
        base.size = 1 + Math.round(seed);
        break;
      case "rain":
        base.vx = -22;
        base.vy = 150 + seed * 60;
        base.maxLife = 2.2;
        base.size = 1;
        break;
      case "dust":
        base.vx = (seed - 0.5) * 5;
        base.vy = -2 - seed * 3;
        base.maxLife = 5 + seed * 3;
        base.size = 1;
        break;
      case "butterfly":
        base.vx = 9 + seed * 8;
        base.vy = -3;
        base.maxLife = 7 + seed * 4;
        base.size = 1;
        break;
      case "splash":
        base.vx = (seed - 0.5) * 18;
        base.vy = -18 - seed * 10;
        base.maxLife = 0.7;
        base.size = 1;
        break;
    }
    this.particles.push(base);
  }

  /** Emit a one-off burst, e.g. a splash when something touches the water. */
  burst(kind: ParticleKind, x: number, y: number, count: number) {
    for (let i = 0; i < count; i++) this.spawn(kind, x, y);
  }

  update(nowMs: number, windX = 0, isNight = false) {
    if (!this.lastMs) this.lastMs = nowMs;
    // clamp dt so a backgrounded tab doesn't resume with a huge jump
    const dt = Math.min(0.05, (nowMs - this.lastMs) / 1000);
    this.lastMs = nowMs;

    for (const e of this.emitters) {
      if (e.enabled === false) continue;
      if (e.nightOnly && !isNight) continue;
      if (e.dayOnly && isNight) continue;
      e.accrual = (e.accrual ?? 0) + e.rate * dt;
      while (e.accrual >= 1) {
        e.accrual -= 1;
        this.spawn(
          e.kind,
          e.x + (Math.random() - 0.5) * (e.spreadX ?? 0),
          e.y + (Math.random() - 0.5) * (e.spreadY ?? 0),
        );
      }
    }

    const t = nowMs / 1000;
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life += dt;
      if (p.life >= p.maxLife) {
        this.particles.splice(i, 1);
        continue;
      }

      switch (p.kind) {
        case "smoke":
          p.vx += Math.sin(t * 0.8 + p.seed * 6) * 3 * dt;
          p.vy += 2 * dt;
          break;
        case "firefly":
          p.vx = Math.sin(t * 1.1 + p.seed * 9) * 9;
          p.vy = Math.cos(t * 0.9 + p.seed * 7) * 6;
          break;
        case "leaf":
          p.vx = -8 + Math.sin(t * 1.6 + p.seed * 8) * 10;
          break;
        case "butterfly":
          p.vy = Math.sin(t * 4 + p.seed * 10) * 9;
          break;
        case "splash":
          p.vy += 70 * dt;
          break;
        case "ember":
          p.vx += Math.sin(t * 2 + p.seed * 5) * 4 * dt;
          break;
      }

      p.x += (p.vx + windX) * dt;
      p.y += p.vy * dt;
    }
  }

  draw(ctx: CanvasRenderingContext2D, w: number, h: number) {
    for (const p of this.particles) {
      const k = p.life / p.maxLife;
      let alpha = 1;
      let size = p.size;

      switch (p.kind) {
        case "smoke":
          alpha = Math.sin(Math.min(1, k) * Math.PI) * 0.5;
          size = p.size + Math.round(k * 2.5);
          break;
        case "firefly":
          alpha = Math.sin(Math.min(1, k) * Math.PI) * (0.4 + 0.6 * Math.abs(Math.sin(p.life * 3 + p.seed * 6)));
          break;
        case "rain":
          alpha = 0.5;
          break;
        case "dust":
          alpha = Math.sin(Math.min(1, k) * Math.PI) * 0.45;
          break;
        case "ember":
          alpha = (1 - k) * 0.9;
          break;
        default:
          alpha = Math.sin(Math.min(1, k) * Math.PI) * 0.9;
      }

      if (alpha <= 0.02) continue;
      if (p.x < -12 || p.x > w + 12 || p.y < -20 || p.y > h + 12) continue;

      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.color;

      if (p.kind === "rain") {
        ctx.fillRect(Math.round(p.x), Math.round(p.y), 1, 4);
      } else if (p.kind === "butterfly") {
        const flap = Math.sin(p.life * 12 + p.seed * 6) > 0 ? 1 : 2;
        ctx.fillRect(Math.round(p.x), Math.round(p.y), 1, flap);
        ctx.fillRect(Math.round(p.x) + 2, Math.round(p.y), 1, flap);
        ctx.fillRect(Math.round(p.x) + 1, Math.round(p.y), 1, 1);
      } else if (p.kind === "firefly") {
        ctx.fillRect(Math.round(p.x), Math.round(p.y), 1, 1);
        ctx.globalAlpha = alpha * 0.3;
        ctx.fillRect(Math.round(p.x) - 1, Math.round(p.y) - 1, 3, 3);
      } else {
        ctx.fillRect(Math.round(p.x), Math.round(p.y), size, size);
      }
    }
    ctx.globalAlpha = 1;
  }

  get count() {
    return this.particles.length;
  }
}
