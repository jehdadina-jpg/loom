import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useThree, useFrame } from '@react-three/fiber';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';

import { SkyDome } from './SkyDome';
import { SunFlare } from './SunFlare';
import { ThreadParticles } from './ThreadParticles';
import {
  createFarMountainsTexture,
  createMidRidgesTexture,
  createForestTexture,
  createVillageDioramaTexture,
} from './generateIntroAssets';

export interface IntroSceneProps {
  phase: string;
  setPhase: (p: string) => void;
  onComplete: () => void;
}

export function IntroScene({ phase, setPhase, onComplete }: IntroSceneProps) {
  const { camera } = useThree();

  const skyMat = useRef<THREE.ShaderMaterial>(null);
  const sunGroup = useRef<THREE.Group>(null);

  // Core animation driver object
  const anim = useRef({
    dawn: 0,
    weave: 0,
    outro: 0,
    camY: 15,       // Start looking up into the sky
    panSpeed: 1.0,  // Smooth cinematic horizontal sweep
  });

  // Cached authentic LOOM textures
  const farMtnTex = useMemo(() => createFarMountainsTexture(), []);
  const midMtnTex = useMemo(() => createMidRidgesTexture(), []);
  const forestTex = useMemo(() => createForestTexture(), []);
  const fgTex = useMemo(() => createVillageDioramaTexture(), []);

  useGSAP(() => {
    // Lock the camera in place on X and Z, we will move its Y
    camera.position.set(0, 15, 10);
    camera.lookAt(0, 15, 0);

    const tl = gsap.timeline({
      onComplete,
    });

    // 0.0 - 0.5s: cold-open (Stars twinkling)
    tl.call(() => setPhase('cold-open'), [], 0)

      // 0.5 - 5.5s: Cinematic drop & pan
      .call(() => setPhase('env-pan'), [], 0.5)
      // Drop camera Y from 15 down to 0 smoothly
      .to(anim.current, { camY: 0, duration: 4.5, ease: 'power3.inOut' }, 0.5)
      // Decelerate the horizontal pan
      .to(anim.current, { panSpeed: 0.05, duration: 5.0, ease: 'power2.out' }, 0.5)
      // Fade into Dawn colors
      .to(anim.current, { dawn: 1.0, duration: 4.0, ease: 'power1.inOut' }, 1.0)
      
      // Sun rises from behind the mountains (Y=-5 to Y=12)
      .to(sunGroup.current!.position, { y: 12, duration: 4.5, ease: 'power2.out' }, 1.0)

      // 5.0 - 5.8s: surface-reveal
      .call(() => setPhase('surface-reveal'), [], 5.0)

      // 5.8 - 9.0s: logo-weave
      .call(() => setPhase('logo-weave'), [], 5.8)
      .to(anim.current, { weave: 1.0, duration: 3.0, ease: 'power2.out' }, 5.8)

      // 9.0 - 9.6s: logo-hold
      .call(() => setPhase('logo-hold'), [], 9.0)

      // 9.6 - 11.2s: subtitle-1
      .call(() => setPhase('subtitle-1'), [], 9.6)

      // 11.2 - 12.8s: subtitle-2
      .call(() => setPhase('subtitle-2'), [], 11.2)

      // 12.8 - 14.4s: subtitle-3
      .call(() => setPhase('subtitle-3'), [], 12.8)

      // 14.4 - 16.0s: outro
      .call(() => setPhase('outro'), [], 14.4)
      .to(anim.current, { outro: 1.0, duration: 1.6, ease: 'power2.inOut' }, 14.4)
      .to(anim.current, { dawn: 0.1, duration: 1.6, ease: 'power1.inOut' }, 14.4);

  }, { dependencies: [] });

  useFrame((_, delta) => {
    // 1. Update Camera Y position
    camera.position.y = anim.current.camY;
    camera.lookAt(0, anim.current.camY, 0);

    // 2. Perform infinite horizontal UV panning (2D side-scrolling parallax)
    const speed = anim.current.panSpeed * delta;
    if (farMtnTex) farMtnTex.offset.x += speed * 0.1;
    if (midMtnTex) midMtnTex.offset.x += speed * 0.25;
    if (forestTex) forestTex.offset.x += speed * 0.5;
    if (fgTex) fgTex.offset.x += speed * 1.0;

    // 3. Update shaders
    if (skyMat.current) {
      skyMat.current.uniforms.uDawn.value = anim.current.dawn;
    }
  });

  // Base dimensions
  const PW = 100;
  const PH = 50;

  return (
    <>
      <SkyDome ref={skyMat} dawnProgress={anim.current.dawn} />
      
      {/* Sun starts hidden behind the mountains (Y=-5) */}
      <SunFlare ref={sunGroup} startY={-5} />

      {/* Z-Depth Layering and Y-Anchoring */}
      <mesh position={[0, 9, -25]}>
        <planeGeometry args={[PW, PH]} />
        <meshBasicMaterial map={farMtnTex} transparent depthWrite={false} />
      </mesh>

      <mesh position={[0, 12, -15]}>
        <planeGeometry args={[PW, PH]} />
        <meshBasicMaterial map={midMtnTex} transparent depthWrite={false} />
      </mesh>

      <mesh position={[0, 17, -8]}>
        <planeGeometry args={[PW, PH]} />
        <meshBasicMaterial map={forestTex} transparent depthWrite={false} />
      </mesh>

      {/* Village Diorama is 4:1 Ratio */}
      <mesh position={[0, 13, -3]}>
        <planeGeometry args={[PW * 2, PH]} />
        <meshBasicMaterial map={fgTex} transparent depthWrite={false} />
      </mesh>

      <ThreadParticles
        phase={phase}
        weaveProgress={anim.current.weave}
        outroProgress={anim.current.outro}
      />
    </>
  );
}
