import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { createParticleTexture } from './generateIntroAssets';

export interface ThreadParticlesProps {
  phase: string;
  weaveProgress: number; // 0 to 1
  outroProgress: number; // 0 to 1
}

interface ParticleData {
  delay: number;
  speed: number;
  radius: number;
  yOffset: number;
  zOffset: number;
  phaseShift: number;
  size: number;
}

export function ThreadParticles({ phase, weaveProgress, outroProgress }: ThreadParticlesProps) {
  const pointsRef = useRef<THREE.Points>(null);
  const geoRef = useRef<THREE.BufferGeometry>(null);

  const tex = useMemo(() => createParticleTexture(), []);

  // Create 60 high-quality glowing threads that swoop organically
  const particles = useMemo<ParticleData[]>(() => {
    const list: ParticleData[] = [];
    for (let i = 0; i < 60; i++) {
      list.push({
        delay: Math.random() * 2,
        speed: 1.5 + Math.random() * 2,
        radius: 1 + Math.random() * 8,
        yOffset: (Math.random() - 0.5) * 8,
        zOffset: (Math.random() - 0.5) * 8,
        phaseShift: Math.random() * Math.PI * 2,
        size: 30 + Math.random() * 25,
      });
    }
    return list;
  }, []);

  const posArray = useMemo(() => new Float32Array(particles.length * 3), [particles.length]);
  
  const colorArray = useMemo(() => {
    const arr = new Float32Array(particles.length * 3);
    for (let i = 0; i < particles.length; i++) {
      arr[i * 3] = 1.0;
      arr[i * 3 + 1] = 0.6 + Math.random() * 0.3; // Golden orange
      arr[i * 3 + 2] = 0.2 + Math.random() * 0.2;
    }
    return arr;
  }, [particles.length]);

  useFrame(({ clock }) => {
    if (!geoRef.current) return;
    const t = clock.getElapsedTime();
    const posAttr = geoRef.current.attributes.position as THREE.BufferAttribute;

    const isWeaving = phase === 'logo-weave' || phase === 'logo-hold' || phase.startsWith('subtitle');
    const isOutro = phase === 'outro';

    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];
      let x = -30;
      let y = p.yOffset;
      let z = p.zOffset;

      if (isWeaving && !isOutro) {
        // Magical swirling vortex that converges on the center as weaveProgress goes to 1
        const timeOffset = Math.max(0, t - p.delay);
        const swirlAngle = timeOffset * p.speed + p.phaseShift;
        
        // Start from wide edges, converge to tight circle in center
        const currentRadius = p.radius * (1 - weaveProgress * 0.8);
        x = Math.cos(swirlAngle) * currentRadius * 1.5;
        y = p.yOffset * (1 - weaveProgress) + Math.sin(swirlAngle) * currentRadius;
        z = p.zOffset * (1 - weaveProgress) + Math.cos(swirlAngle * 0.5) * currentRadius * 0.5;

        // Add a gentle horizontal drift to feel like wind
        x += Math.sin(t * 0.5 + p.phaseShift) * 2;
      } else if (isOutro) {
        // Fly away into the night sky
        const outroT = outroProgress * 10;
        x = Math.cos(p.phaseShift) * (p.radius + outroT * p.speed);
        y = p.yOffset + outroT * p.speed * 2;
        z = p.zOffset - outroT * p.speed;
      } else {
        // Hidden/idle
        x = -100;
        y = 0;
        z = 0;
      }

      posAttr.setXYZ(i, x, y, z);
    }
    posAttr.needsUpdate = true;
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry ref={geoRef}>
        <bufferAttribute
          attach="attributes-position"
          args={[posArray, 3]}
          usage={THREE.DynamicDrawUsage}
        />
        <bufferAttribute
          attach="attributes-color"
          args={[colorArray, 3]}
        />
      </bufferGeometry>
      <pointsMaterial
        size={1.5}
        map={tex}
        vertexColors
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}
