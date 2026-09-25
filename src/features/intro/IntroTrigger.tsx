import { useState, useRef, Suspense, lazy } from 'react';

// Lazy load the heavy three.js + GSAP chunk
const LoomIntro = lazy(() => import('./LoomIntro'));

export interface IntroTriggerProps {
  className?: string;
  style?: React.CSSProperties;
}

export function IntroTrigger({ className, style }: IntroTriggerProps) {
  const [showIntro, setShowIntro] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);

  return (
    <>
      <button
        ref={triggerRef}
        className={className || "rounded-[6px] px-3 py-2 text-sm text-[var(--ink-soft)] underline underline-offset-2 hover:bg-[var(--parchment2)]"}
        style={style}
        aria-haspopup="dialog"
        onClick={() => setShowIntro(true)}
      >
        ▶ Play Intro
      </button>

      {showIntro && (
        <Suspense fallback={null}>
          <LoomIntro
            onClose={() => {
              setShowIntro(false);
              // Return focus to the trigger after closing
              triggerRef.current?.focus();
            }}
          />
        </Suspense>
      )}
    </>
  );
}
