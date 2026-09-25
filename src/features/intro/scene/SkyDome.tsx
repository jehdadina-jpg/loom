import * as THREE from 'three';
import { forwardRef } from 'react';

const vertexShader = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const fragmentShader = `
  uniform float uDawn;
  varying vec2 vUv;

  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
  }

  void main() {
    // Realistic Night Sky (deep indigo to dark blue)
    vec3 nightTop = vec3(0.01, 0.03, 0.08);
    vec3 nightBot = vec3(0.08, 0.12, 0.25);
    vec3 nightBg = mix(nightBot, nightTop, vUv.y);

    // Twinkling stars (fade out as dawn breaks)
    float starVal = hash(vUv * 800.0);
    float star = pow(starVal, 200.0) * max(0.0, 1.0 - uDawn * 2.5);

    // Warm Dawn Sky (soft blue to glowing amber)
    vec3 dawnTop = vec3(0.3, 0.5, 0.7);
    vec3 dawnBot = vec3(1.0, 0.7, 0.4);
    vec3 dawnBg = mix(dawnBot, dawnTop, clamp(vUv.y * 1.5 - 0.2, 0.0, 1.0));

    vec3 color = mix(nightBg + star, dawnBg, uDawn);
    gl_FragColor = vec4(color, 1.0);
  }
`;

export const SkyDome = forwardRef<THREE.ShaderMaterial, { dawnProgress: number }>(
  ({ dawnProgress }, ref) => {
    return (
      <mesh position={[0, 15, -40]}>
        <planeGeometry args={[160, 100]} />
        <shaderMaterial
          ref={ref}
          vertexShader={vertexShader}
          fragmentShader={fragmentShader}
          uniforms={{ uDawn: { value: dawnProgress } }}
          depthWrite={false}
        />
      </mesh>
    );
  }
);
