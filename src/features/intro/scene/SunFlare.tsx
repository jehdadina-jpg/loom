import { forwardRef, useMemo } from 'react';
import * as THREE from 'three';
import { createSunFlareTexture } from './generateIntroAssets';

export const SunFlare = forwardRef<THREE.Group, { startY: number }>(
  ({ startY }, ref) => {
    const tex = useMemo(() => createSunFlareTexture(), []);
    return (
      <group ref={ref} position={[-15, startY, -28]}>
        <mesh>
          <planeGeometry args={[30, 30]} />
          <meshBasicMaterial 
            map={tex} 
            transparent 
            blending={THREE.AdditiveBlending} 
            depthWrite={false} 
          />
        </mesh>
      </group>
    );
  }
);
