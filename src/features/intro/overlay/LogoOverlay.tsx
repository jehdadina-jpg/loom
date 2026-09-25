import { useEffect, useState } from 'react';
import { loomLogo } from '../../../engine/sprites/logo';

export function LogoOverlay({ phase }: { phase: string }) {
  const [dataUrl, setDataUrl] = useState<string>('');

  useEffect(() => {
    try {
      const canvas = loomLogo();
      setDataUrl(canvas.toDataURL());
    } catch {
      // Fallback
    }
  }, []);

  const isWeaving = phase === 'logo-weave';
  const isSettled = ['logo-hold', 'subtitle-1', 'subtitle-2', 'subtitle-3'].includes(phase);
  const visible = isWeaving || isSettled;

  return (
    <div
      className={`intro-logo-container ${visible ? 'is-visible' : ''} ${
        isSettled ? 'is-settled' : ''
      } ${phase === 'outro' ? 'is-unraveling' : ''}`}
    >
      {dataUrl && (
        <img
          src={dataUrl}
          alt="LOOM"
          className="intro-logo-pixel"
        />
      )}
    </div>
  );
}
