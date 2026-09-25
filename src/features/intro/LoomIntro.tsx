import { createPortal } from 'react-dom';
import { Canvas } from '@react-three/fiber';
import { useEffect, useState } from 'react';
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing';

import { IntroScene } from './scene/IntroScene';
import { LetterboxBars } from './overlay/LetterboxBars';
import { LogoOverlay } from './overlay/LogoOverlay';
import { SubtitleOverlay } from './overlay/SubtitleOverlay';
import { SkipButton } from './overlay/SkipButton';
import { MuteButton } from './overlay/MuteButton';
import { IntroAudio } from './audio/IntroAudio';
import { useReducedMotion } from './hooks/useReducedMotion';
import { useIntroCleanup } from './hooks/useIntroCleanup';

import './intro.css';

export default function LoomIntro({ onClose }: { onClose: () => void }) {
  const [phase, setPhase] = useState('cold-open');
  const [isMuted, setIsMuted] = useState(false);
  const [webGLFailed, setWebGLFailed] = useState(false);

  const reducedMotion = useReducedMotion();
  useIntroCleanup();

  useEffect(() => {
    // WebGL support check
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      if (!gl) setWebGLFailed(true);
    } catch {
      setWebGLFailed(true);
    }
  }, []);

  useEffect(() => {
    if (webGLFailed) {
      onClose(); // Fail silently to dashboard
    }
  }, [webGLFailed, onClose]);

  useEffect(() => {
    if (reducedMotion && !webGLFailed) {
      // Short static fallback for reduced motion: logo and 1 subtitle
      setPhase('subtitle-1');
      const t = setTimeout(onClose, 2800);
      return () => clearTimeout(t);
    }
  }, [reducedMotion, webGLFailed, onClose]);

  if (webGLFailed) return null;

  return createPortal(
    <div className="loom-intro-overlay" role="dialog" aria-modal="true" aria-label="LOOM introduction">
      <LetterboxBars />
      <div className="intro-vignette" />

      {!reducedMotion && (
        <Canvas
          gl={{ antialias: true, powerPreference: 'high-performance' }}
          camera={{ fov: 45, position: [0, 25, 15] }}
          onCreated={({ gl }) => {
            if (!gl) {
              setWebGLFailed(true);
            }
          }}
        >
          <IntroScene phase={phase} setPhase={setPhase} onComplete={onClose} />
          <EffectComposer>
            <Bloom luminanceThreshold={0.5} mipmapBlur intensity={0.8} />
            <Vignette eskil={false} offset={0.1} darkness={1.0} />
          </EffectComposer>
        </Canvas>
      )}

      <LogoOverlay phase={phase} />

      <div className="intro-controls">
        <MuteButton isMuted={isMuted} onToggle={() => setIsMuted((prev) => !prev)} />
        <SkipButton onClick={onClose} />
      </div>

      <SubtitleOverlay phase={phase} />
      <IntroAudio phase={phase} isMuted={isMuted} />
    </div>,
    document.body
  );
}
