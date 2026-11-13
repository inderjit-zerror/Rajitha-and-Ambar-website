'use client';

import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { seeded } from '@/lib/paint/utils';

const vertexShader = /* glsl */ `
uniform float uTime;
uniform float uPixelRatio;
uniform float uSize;
uniform float uDrag;
uniform vec3 uGravity;
attribute vec3 aVelocity;
attribute vec4 aParams; // x: delay, y: life, z: size, w: seed
varying float vAlpha;
varying float vHeat;

void main() {
  float t = uTime - aParams.x;
  float life = aParams.y;
  float alive = step(0.0, t) * step(t, life);
  float tt = max(t, 0.0);
  float k = clamp(tt / life, 0.0, 1.0);
  float seed = aParams.w;

  // ballistic motion with air drag, plus a gentle swirl
  vec3 disp = aVelocity * (1.0 - exp(-uDrag * tt)) / uDrag + 0.5 * uGravity * tt * tt;
  disp.x += sin(tt * 3.1 + seed * 12.0) * 0.05 * tt;
  disp.y += cos(tt * 2.7 + seed * 9.0) * 0.05 * tt;

  vec4 mv = modelViewMatrix * vec4(position + disp, 1.0);
  gl_Position = projectionMatrix * mv;

  float twinkle = 0.65 + 0.35 * sin(tt * 16.0 + seed * 40.0);
  gl_PointSize = uSize * aParams.z * uPixelRatio * (10.0 / -mv.z) * (1.0 - 0.55 * k) * alive;
  vAlpha = alive * smoothstep(0.0, 0.06, k) * (1.0 - smoothstep(0.5, 1.0, k)) * twinkle;
  vHeat = 1.0 - k;
}
`;

const fragmentShader = /* glsl */ `
uniform vec3 uColor;
uniform vec3 uHot;
uniform float uOpacity;
varying float vAlpha;
varying float vHeat;

void main() {
  vec2 p = gl_PointCoord - 0.5;
  float d2 = dot(p, p);
  float core = exp(-d2 * 70.0);
  float halo = exp(-d2 * 14.0) * 0.4;
  // four-point star glint while the spark is fresh
  float star = max(0.0, 1.0 - abs(p.x) * 18.0) * max(0.0, 1.0 - abs(p.y) * 2.2)
             + max(0.0, 1.0 - abs(p.y) * 18.0) * max(0.0, 1.0 - abs(p.x) * 2.2);
  float a = (core + halo + star * 0.5 * vHeat) * vAlpha * uOpacity;
  vec3 col = mix(uColor, uHot, clamp(core * vHeat * 1.4, 0.0, 1.0));
  gl_FragColor = vec4(col, a);
}
`;

/**
 * A one-shot burst of golden sparks. Every time `trigger` changes (and is > 0)
 * the burst replays from `position` (local to the parent).
 */
export default function Sparkles({
  trigger = 0,
  count = 160,
  spread = [0.1, 0.1, 0.02],
  direction = [0, 0, 1],
  cone = 0.9,
  speed = [0.8, 2.4],
  emit = 0.15,
  life = [0.9, 1.8],
  gravity = [0, -0.4, -0.3],
  drag = 2,
  size = 3,
  color = '#f2c46d',
  hot = '#fff8e6',
  opacity = 1,
  seed = 1,
  ...props
}) {
  const pointsRef = useRef();
  const start = useRef({ pending: false, at: -1 });

  const { geometry, material } = useMemo(() => {
    const rand = seeded(seed);
    const positions = new Float32Array(count * 3);
    const velocities = new Float32Array(count * 3);
    const params = new Float32Array(count * 4);
    const dir = new THREE.Vector3(...direction).normalize();
    const v = new THREE.Vector3();
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (rand() - 0.5) * spread[0];
      positions[i * 3 + 1] = (rand() - 0.5) * spread[1];
      positions[i * 3 + 2] = (rand() - 0.5) * spread[2];
      // random direction inside a cone around `direction`
      v.set(rand() * 2 - 1, rand() * 2 - 1, rand() * 2 - 1).normalize().multiplyScalar(cone).add(dir).normalize();
      const s = speed[0] + rand() * (speed[1] - speed[0]);
      velocities[i * 3] = v.x * s;
      velocities[i * 3 + 1] = v.y * s;
      velocities[i * 3 + 2] = v.z * s;
      params[i * 4] = Math.pow(rand(), 1.6) * emit;
      params[i * 4 + 1] = life[0] + rand() * (life[1] - life[0]);
      params[i * 4 + 2] = 0.4 + Math.pow(rand(), 2) * 1.6;
      params[i * 4 + 3] = rand();
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('aVelocity', new THREE.BufferAttribute(velocities, 3));
    geometry.setAttribute('aParams', new THREE.BufferAttribute(params, 4));
    const material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: {
        uTime: { value: -10 },
        uPixelRatio: { value: 1 },
        uSize: { value: size },
        uDrag: { value: drag },
        uGravity: { value: new THREE.Vector3(...gravity) },
        uColor: { value: new THREE.Color(color) },
        uHot: { value: new THREE.Color(hot) },
        uOpacity: { value: opacity },
      },
    });
    return { geometry, material };
    // the burst shape is fixed for the lifetime of the component
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [count, seed]);

  useEffect(
    () => () => {
      geometry.dispose();
      material.dispose();
    },
    [geometry, material]
  );

  useEffect(() => {
    if (trigger > 0) start.current.pending = true;
  }, [trigger]);

  useFrame((state) => {
    const points = pointsRef.current;
    if (!points) return;
    const s = start.current;
    if (s.pending) {
      s.at = state.clock.elapsedTime;
      s.pending = false;
    }
    const t = s.at < 0 ? -10 : state.clock.elapsedTime - s.at;
    const u = points.material.uniforms;
    u.uTime.value = t;
    u.uPixelRatio.value = state.viewport.dpr;
    points.visible = t > -1 && t < emit + life[1] + 0.2;
  });

  return <points ref={pointsRef} geometry={geometry} material={material} frustumCulled={false} visible={false} {...props} />;
}
