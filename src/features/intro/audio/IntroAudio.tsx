import { useEffect, useRef } from 'react';
import { audioEngine } from '../../../game/audio/AudioEngine';

export function IntroAudio({ phase, isMuted }: { phase: string; isMuted: boolean }) {
  const hasTriggeredWeaveSound = useRef(false);
  const audioCtxRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    // Start ambient village soundscape (gentle wind + distant birds)
    audioEngine.resume();
    audioEngine.setEnabled(!isMuted);
    audioEngine.setAmbience('village');

    return () => {
      // Fade out audio on unmount
      audioEngine.setEnabled(false);
      if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
        void audioCtxRef.current.close();
      }
    };
  }, []);

  useEffect(() => {
    audioEngine.setEnabled(!isMuted);
  }, [isMuted]);

  // Thread weave & chime harmonic sound
  useEffect(() => {
    if (isMuted) return;

    if (phase === 'logo-weave' && !hasTriggeredWeaveSound.current) {
      hasTriggeredWeaveSound.current = true;

      try {
        const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (!Ctor) return;
        const ctx = audioCtxRef.current ?? (audioCtxRef.current = new Ctor());
        if (ctx.state === 'suspended') void ctx.resume();

        const t0 = ctx.currentTime;
        const master = ctx.createGain();
        master.gain.setValueAtTime(0.35, t0);
        master.connect(ctx.destination);

        // Soft whoosh (bandpass noise sweep)
        const bufferSize = ctx.sampleRate * 2;
        const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const output = noiseBuffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          output[i] = Math.random() * 2 - 1;
        }

        const whiteNoise = ctx.createBufferSource();
        whiteNoise.buffer = noiseBuffer;

        const filter = ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.Q.value = 3.0;
        filter.frequency.setValueAtTime(300, t0);
        filter.frequency.exponentialRampToValueAtTime(1400, t0 + 2.0);

        const noiseGain = ctx.createGain();
        noiseGain.gain.setValueAtTime(0.001, t0);
        noiseGain.gain.linearRampToValueAtTime(0.12, t0 + 0.8);
        noiseGain.gain.exponentialRampToValueAtTime(0.001, t0 + 2.2);

        whiteNoise.connect(filter).connect(noiseGain).connect(master);
        whiteNoise.start(t0);
        whiteNoise.stop(t0 + 2.3);

        // Gentle crystalline chord on settle (F# - A# - C# - F# chord)
        const notes = [369.99, 466.16, 554.37, 739.99, 932.33];
        notes.forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.value = freq;

          const start = t0 + 2.2 + idx * 0.08;
          gain.gain.setValueAtTime(0.0001, start);
          gain.gain.linearRampToValueAtTime(0.08, start + 0.06);
          gain.gain.exponentialRampToValueAtTime(0.0001, start + 1.8);

          osc.connect(gain).connect(master);
          osc.start(start);
          osc.stop(start + 1.9);
        });
      } catch {
        // Fallback gracefully
      }
    }
  }, [phase, isMuted]);

  return null;
}
