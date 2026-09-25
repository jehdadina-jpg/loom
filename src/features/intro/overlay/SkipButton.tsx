import { useEffect, useRef } from 'react';

export function SkipButton({ onClick }: { onClick: () => void }) {
  const btnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    // Focus the skip button immediately so Tab/Enter works immediately inside the portal
    btnRef.current?.focus();
  }, []);

  return (
    <button
      ref={btnRef}
      className="intro-btn skip-btn"
      onClick={onClick}
      aria-label="Skip introduction sequence"
    >
      Skip
    </button>
  );
}
