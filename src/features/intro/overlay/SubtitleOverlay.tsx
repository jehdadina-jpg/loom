export function SubtitleOverlay({ phase }: { phase: string }) {
  return (
    <div className="intro-subtitle-container" aria-live="polite">
      <div className={`intro-subtitle ${phase === 'subtitle-1' ? 'is-visible' : ''}`}>
        Awaiting the Weave…
      </div>
      <div className={`intro-subtitle ${phase === 'subtitle-2' ? 'is-visible' : ''}`}>
        A companion for everyday memory care
      </div>
      <div className={`intro-subtitle ${phase === 'subtitle-3' ? 'is-visible' : ''}`}>
        Made with care for every family
      </div>
    </div>
  );
}
