export function MuteButton({ isMuted, onToggle }: { isMuted: boolean; onToggle: () => void }) {
  return (
    <button
      className="intro-btn mute-btn"
      onClick={onToggle}
      aria-label={isMuted ? "Unmute audio" : "Mute audio"}
    >
      {isMuted ? '🔇' : '🔊'}
    </button>
  );
}
