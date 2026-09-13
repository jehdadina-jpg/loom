/**
 * Spoken narration via the Web Speech API.
 *
 * This matters more than it looks: many of the people LOOM is for read slowly or not
 * at all, so every prompt and every line of dialogue can be heard instead. Speech is
 * always calm and slightly slower than default, and it is never used to hurry anyone.
 */
export class SpeechEngine {
  private enabled = false;
  private voice: SpeechSynthesisVoice | null = null;
  private ready = false;

  get supported(): boolean {
    return typeof window !== "undefined" && "speechSynthesis" in window;
  }

  setEnabled(on: boolean) {
    this.enabled = on;
    if (!on) this.stop();
    else this.pickVoice();
  }

  private pickVoice() {
    if (!this.supported || this.ready) return;
    const load = () => {
      const voices = window.speechSynthesis.getVoices();
      if (!voices.length) return;
      // prefer an Indian English voice when the device has one, then any English voice
      this.voice =
        voices.find((v) => /en[-_]IN/i.test(v.lang)) ??
        voices.find((v) => /^en/i.test(v.lang)) ??
        voices[0];
      this.ready = true;
    };
    load();
    if (!this.ready) window.speechSynthesis.addEventListener("voiceschanged", load, { once: true });
  }

  speak(text: string, opts?: { interrupt?: boolean }) {
    if (!this.enabled || !this.supported || !text.trim()) return;
    this.pickVoice();
    if (opts?.interrupt !== false) window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    if (this.voice) utter.voice = this.voice;
    utter.rate = 0.86;
    utter.pitch = 1;
    utter.volume = 1;
    window.speechSynthesis.speak(utter);
  }

  stop() {
    if (this.supported) window.speechSynthesis.cancel();
  }
}

export const speechEngine = new SpeechEngine();
