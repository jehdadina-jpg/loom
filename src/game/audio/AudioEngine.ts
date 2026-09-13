/**
 * Ambient soundscape, fully synthesised with WebAudio — no audio assets to ship.
 * Everything here is soft and continuous by design: no buzzers, no failure stings,
 * no sudden transients that could startle someone.
 */

export type Ambience = "village" | "water" | "market" | "field" | "indoor";

interface Layer {
  nodes: AudioNode[];
  gain: GainNode;
}

const FADE = 1.2;

export class AudioEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private layers: Layer[] = [];
  private current: Ambience | null = null;
  private birdTimer: number | null = null;
  private enabled = true;

  private ensure(): AudioContext | null {
    if (typeof window === "undefined") return null;
    if (!this.ctx) {
      const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return null;
      this.ctx = new Ctor();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.0;
      this.master.connect(this.ctx.destination);
    }
    return this.ctx;
  }

  /** Browsers require a user gesture before audio may start. */
  resume() {
    const ctx = this.ensure();
    if (ctx && ctx.state === "suspended") void ctx.resume();
  }

  setEnabled(on: boolean) {
    this.enabled = on;
    const ctx = this.ensure();
    if (!ctx || !this.master) return;
    this.master.gain.cancelScheduledValues(ctx.currentTime);
    this.master.gain.linearRampToValueAtTime(on ? 0.5 : 0.0001, ctx.currentTime + FADE);
    if (!on && this.birdTimer) {
      window.clearInterval(this.birdTimer);
      this.birdTimer = null;
    } else if (on && this.current) {
      this.scheduleBirds(this.current);
    }
  }

  /** Brown-ish noise buffer used as the bed for wind and water. */
  private noiseSource(ctx: AudioContext): AudioBufferSourceNode {
    const len = ctx.sampleRate * 4;
    const buffer = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let last = 0;
    for (let i = 0; i < len; i++) {
      const white = Math.random() * 2 - 1;
      last = (last + 0.02 * white) / 1.02;
      data[i] = last * 3.2;
    }
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    src.loop = true;
    return src;
  }

  private clearLayers() {
    const ctx = this.ctx;
    if (!ctx) return;
    for (const layer of this.layers) {
      layer.gain.gain.cancelScheduledValues(ctx.currentTime);
      layer.gain.gain.linearRampToValueAtTime(0.0001, ctx.currentTime + FADE);
      const nodes = layer.nodes;
      window.setTimeout(() => {
        for (const n of nodes) {
          if ("stop" in n && typeof (n as AudioScheduledSourceNode).stop === "function") {
            try {
              (n as AudioScheduledSourceNode).stop();
            } catch {
              // already stopped
            }
          }
          n.disconnect();
        }
      }, FADE * 1000 + 200);
    }
    this.layers = [];
  }

  private addNoiseLayer(ctx: AudioContext, opts: { type: BiquadFilterType; freq: number; q: number; gain: number }) {
    const src = this.noiseSource(ctx);
    const filter = ctx.createBiquadFilter();
    filter.type = opts.type;
    filter.frequency.value = opts.freq;
    filter.Q.value = opts.q;
    const gain = ctx.createGain();
    gain.gain.value = 0.0001;
    src.connect(filter).connect(gain).connect(this.master!);
    src.start();
    gain.gain.linearRampToValueAtTime(opts.gain, ctx.currentTime + FADE);

    // slow drift so the bed never sounds static
    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();
    lfo.frequency.value = 0.05 + Math.random() * 0.06;
    lfoGain.gain.value = opts.freq * 0.18;
    lfo.connect(lfoGain).connect(filter.frequency);
    lfo.start();

    this.layers.push({ nodes: [src, filter, lfo, lfoGain], gain });
  }

  private chirp(ctx: AudioContext, baseFreq: number) {
    if (!this.master || !this.enabled) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    const t0 = ctx.currentTime;
    osc.frequency.setValueAtTime(baseFreq, t0);
    osc.frequency.exponentialRampToValueAtTime(baseFreq * 1.5, t0 + 0.08);
    osc.frequency.exponentialRampToValueAtTime(baseFreq * 1.15, t0 + 0.18);
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.linearRampToValueAtTime(0.06, t0 + 0.04);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.32);
    osc.connect(gain).connect(this.master);
    osc.start(t0);
    osc.stop(t0 + 0.36);
  }

  private scheduleBirds(ambience: Ambience) {
    if (this.birdTimer) window.clearInterval(this.birdTimer);
    if (ambience === "market") return;
    const period = ambience === "water" ? 7000 : 5200;
    this.birdTimer = window.setInterval(() => {
      const ctx = this.ctx;
      if (!ctx || !this.enabled || document.hidden) return;
      if (Math.random() < 0.55) {
        const base = 1500 + Math.random() * 900;
        this.chirp(ctx, base);
        if (Math.random() < 0.5) window.setTimeout(() => this.chirp(ctx, base * 1.06), 220);
      }
    }, period);
  }

  setAmbience(ambience: Ambience) {
    const ctx = this.ensure();
    if (!ctx || !this.master) return;
    if (this.current === ambience) return;
    this.current = ambience;
    this.clearLayers();

    switch (ambience) {
      case "water":
        this.addNoiseLayer(ctx, { type: "bandpass", freq: 620, q: 0.7, gain: 0.16 });
        this.addNoiseLayer(ctx, { type: "lowpass", freq: 260, q: 0.4, gain: 0.1 });
        break;
      case "market":
        this.addNoiseLayer(ctx, { type: "bandpass", freq: 420, q: 0.5, gain: 0.11 });
        this.addNoiseLayer(ctx, { type: "lowpass", freq: 180, q: 0.3, gain: 0.09 });
        break;
      case "field":
        this.addNoiseLayer(ctx, { type: "lowpass", freq: 340, q: 0.3, gain: 0.13 });
        break;
      case "indoor":
        this.addNoiseLayer(ctx, { type: "lowpass", freq: 200, q: 0.3, gain: 0.08 });
        break;
      default:
        this.addNoiseLayer(ctx, { type: "lowpass", freq: 300, q: 0.3, gain: 0.11 });
        this.addNoiseLayer(ctx, { type: "bandpass", freq: 900, q: 0.6, gain: 0.04 });
    }

    this.scheduleBirds(ambience);
    if (this.enabled) {
      this.master.gain.cancelScheduledValues(ctx.currentTime);
      this.master.gain.linearRampToValueAtTime(0.5, ctx.currentTime + FADE);
    }
  }

  /** A soft, warm confirmation tone — used on success, never on a mistake. */
  confirm() {
    const ctx = this.ensure();
    if (!ctx || !this.master || !this.enabled) return;
    const t0 = ctx.currentTime;
    [523.25, 659.25, 783.99].forEach((f, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = f;
      const start = t0 + i * 0.09;
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.linearRampToValueAtTime(0.09, start + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.7);
      osc.connect(gain).connect(this.master!);
      osc.start(start);
      osc.stop(start + 0.75);
    });
  }

  /** Neutral tick for ordinary taps — deliberately not a "correct/incorrect" sound. */
  tap() {
    const ctx = this.ensure();
    if (!ctx || !this.master || !this.enabled) return;
    const t0 = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "triangle";
    osc.frequency.value = 420;
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.linearRampToValueAtTime(0.05, t0 + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.16);
    osc.connect(gain).connect(this.master);
    osc.start(t0);
    osc.stop(t0 + 0.2);
  }

  dispose() {
    if (this.birdTimer) window.clearInterval(this.birdTimer);
    this.clearLayers();
    void this.ctx?.close();
    this.ctx = null;
  }
}

export const audioEngine = new AudioEngine();
