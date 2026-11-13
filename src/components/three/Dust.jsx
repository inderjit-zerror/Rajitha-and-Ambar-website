'use client';

import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { seeded } from '@/lib/paint/utils';

const vertexShader = /* glsl */ `
uniform float uTime;
uniform float uPixelRatio;
uniform float uSize;
attribute float aScale;
attribute vec3 aSeed;
varying float vAlpha;

void main() {
  vec3 p = position;
  float t = uTime * (0.25 + aSeed.x * 0.35);
  p.x += sin(t + aSeed.y * 6.2831) * 0.45 + sin(uTime * 0.07 + aSeed.z * 9.0) * 0.6;
  // slow upward drift, wrapped inside the volume
  p.y = mod(p.y + uTime * (0.04 + aSeed.z * 0.06) + 6.0, 12.0) - 6.0;
  p.z += cos(t * 0.8 + aSeed.x * 4.0) * 0.25;

  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = uSize * aScale * uPixelRatio * (12.0 / -mv.z);

  float twinkle = 0.55 + 0.45 * sin(uTime * (0.8 + aSeed.y * 1.6) + aSeed.x * 20.0);
  float edgeFade = smoothstep(6.0, 4.5, abs(p.y));
  vAlpha = twinkle * edgeFade;
}
`;

const fragmentShader = /* glsl */ `
uniform vec3 uColor;
uniform float uOpacity;
varying float vAlpha;

void main() {
  float d = length(gl_PointCoord - 0.5);
  float a = smoothstep(0.5, 0.0, d);
  a *= a;
  gl_FragColor = vec4(uColor, a * vAlpha * uOpacity);
}
`;

/** Sunlit dust motes drifting over the table (GLSL points). */
export default function Dust({ count = 140 }) {
  const pointsRef = useRef();

  const { geometry, material } = useMemo(() => {
    const rand = seeded(1306);
    const positions = new Float32Array(count * 3);
    const scales = new Float32Array(count);
    const seeds = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (rand() - 0.5) * 16;
      positions[i * 3 + 1] = (rand() - 0.5) * 12;
      positions[i * 3 + 2] = 0.4 + rand() * 5;
      scales[i] = 0.4 + rand() * 1.2;
      seeds[i * 3] = rand();
      seeds[i * 3 + 1] = rand();
      seeds[i * 3 + 2] = rand();
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('aScale', new THREE.BufferAttribute(scales, 1));
    geometry.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 3));
    const material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      transparent: true,
      depthWrite: false,
      uniforms: {
        uTime: { value: 0 },
        uPixelRatio: { value: 1 },
        uSize: { value: 2.2 },
        uColor: { value: new THREE.Color('#fff4dc') },
        uOpacity: { value: 0.75 },
      },
    });
    return { geometry, material };
  }, [count]);

  useEffect(
    () => () => {
      geometry.dispose();
      material.dispose();
    },
    [geometry, material]
  );

  useFrame((state) => {
    const uniforms = pointsRef.current?.material.uniforms;
    if (!uniforms) return;
    uniforms.uTime.value = state.clock.elapsedTime;
    uniforms.uPixelRatio.value = state.viewport.dpr;
  });

  return <points ref={pointsRef} geometry={geometry} material={material} frustumCulled={false} />;
}
