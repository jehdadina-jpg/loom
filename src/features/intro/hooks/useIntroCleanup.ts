import { useEffect } from 'react';
import * as THREE from 'three';

export function useIntroCleanup(customTextures: THREE.Texture[] = []) {
  useEffect(() => {
    return () => {
      // Clean up any manually created textures not automatically disposed by R3F
      customTextures.forEach((texture) => texture.dispose());
    };
  }, [customTextures]);
}
