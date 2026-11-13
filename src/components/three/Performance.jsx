'use client';

// Runtime performance helpers that live inside the <Canvas>.
import { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { getFrameCap, getShadowRefreshToken, isActive, keepAlive, requestShadowRefresh, setFrameCap } from '@/lib/activity';
import { applyStudioEnvironment } from '@/lib/environment';

const nextFrame = () => new Promise((resolve) => requestAnimationFrame(() => resolve()));

/**
 * Drives the canvas in `frameloop="demand"` mode: a frame is drawn only while
 * something is animating (GSAP tweens, damping, pointer movement) or when
 * `continuous` is set (idle hover, dust). An idle open book costs nothing.
 *
 * Frame rates are capped: `activeFps` while animating, `idleFps` for the
 * always-on idle motion. A frame is due once 85% of its interval has passed,
 * which absorbs timestamp jitter (60 Hz screens draw every frame at a 60 cap,
 * 120 Hz screens every other frame).
 */
export function FrameDriver({ continuous, activeFps = 60, idleFps = 60 }) {
  const invalidate = useThree((s) => s.invalidate);
  useEffect(() => {
    let raf = 0;
    let last = -Infinity;
    const wake = () => keepAlive(300);
    const loop = (now) => {
      raf = requestAnimationFrame(loop);
      const active = isActive();
      if (!active && !continuous) return;
      const fps = active ? activeFps : idleFps;
      if (now - last < (1000 / fps) * 0.85) return;
      last = now;
      setFrameCap(fps);
      invalidate();
    };
    window.addEventListener('pointermove', wake, { passive: true });
    window.addEventListener('pointerdown', wake, { passive: true });
    window.addEventListener('resize', wake, { passive: true });
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('pointermove', wake);
      window.removeEventListener('pointerdown', wake);
      window.removeEventListener('resize', wake);
    };
  }, [continuous, activeFps, idleFps, invalidate]);
  return null;
}

/**
 * The shadow map is the most expensive pass. Only re-render it when an object
 * that casts a shadow actually moved (or appeared / disappeared).
 */
export function ShadowCache() {
  const memo = useRef({ init: false, signature: NaN, refresh: 2, token: 0 });
  useFrame((state) => {
    const m = memo.current;
    const { gl, scene } = state;
    if (!m.init) {
      gl.shadowMap.autoUpdate = false;
      m.init = true;
    }
    const token = getShadowRefreshToken();
    if (token !== m.token) {
      m.token = token;
      m.signature = NaN; // forces a redraw below
    }
    let sig = 0;
    let n = 0;
    scene.traverseVisible((o) => {
      if (!o.castShadow) return;
      const e = o.matrixWorld.elements;
      n++;
      sig += n * (e[0] + 2 * e[1] + 3 * e[2] + 5 * e[5] + 7 * e[6] + 11 * e[9] + 13 * e[10] + 17 * e[12] + 19 * e[13] + 23 * e[14]);
    });
    sig += n * 1e5;
    if (sig !== m.signature) {
      m.signature = sig;
      m.refresh = 3; // a few extra frames so the final resting pose is captured
    }
    if (m.refresh > 0) {
      gl.shadowMap.needsUpdate = true;
      m.refresh--;
    }
  });
  useEffect(
    () => () => {
      memo.current.init = false;
    },
    []
  );
  return null;
}

/**
 * Lowers the pixel ratio if frames get slow, and nudges it back up when there
 * is headroom. Only frames drawn at a 60+ fps cap are measured: a throttled
 * idle loop (30 fps on low-end devices) says nothing about the GPU.
 */
export function AdaptiveResolution({ min, max }) {
  const setDpr = useThree((s) => s.setDpr);
  const stats = useRef({ dpr: max, time: 0, frames: 0, cooldown: 2 });
  useEffect(() => {
    stats.current.dpr = Math.min(max, window.devicePixelRatio || 1);
    setDpr(stats.current.dpr);
  }, [max, setDpr]);
  useFrame((_, dt) => {
    const s = stats.current;
    if (dt > 0.25) return; // gap after idle time: not a real frame-time sample
    if (getFrameCap() < 60) {
      s.time = 0;
      s.frames = 0;
      return;
    }
    s.time += dt;
    s.frames++;
    if (s.time < 1.5) return;
    const fps = s.frames / s.time;
    s.time = 0;
    s.frames = 0;
    if (s.cooldown > 0) {
      s.cooldown--;
      return;
    }
    let next = s.dpr;
    if (fps < 40) next = Math.max(min, s.dpr - 0.25);
    else if (fps > 58) next = Math.min(max, window.devicePixelRatio || 1, s.dpr + 0.125);
    if (next !== s.dpr) {
      s.dpr = next;
      s.cooldown = 1;
      setDpr(next);
    }
  });
  return null;
}

/**
 * Builds the reflection environment once (and again after a lost WebGL
 * context is restored: it lives only on the GPU).
 */
export function StudioEnvironment({ intensity = 0.6 }) {
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  useEffect(() => {
    let dispose = applyStudioEnvironment(gl, scene, intensity);
    const rebuild = () => {
      dispose();
      dispose = applyStudioEnvironment(gl, scene, intensity);
    };
    gl.domElement.addEventListener('webglcontextrestored', rebuild);
    return () => {
      gl.domElement.removeEventListener('webglcontextrestored', rebuild);
      dispose();
    };
  }, [gl, scene, intensity]);
  return null;
}

/**
 * Old and memory-starved phones can lose the WebGL context (backgrounding,
 * GPU resets). three.js restores it and re-uploads textures; this redraws
 * GPU-only caches and wakes the frame loop. If the context stays lost for
 * `timeout` ms while the page is visible, `onGiveUp` is called so the page can
 * switch to the plain HTML invitation instead of a frozen canvas.
 */
export function ContextGuard({ onGiveUp, timeout = 5000 }) {
  const gl = useThree((s) => s.gl);
  const invalidate = useThree((s) => s.invalidate);
  useEffect(() => {
    const canvas = gl.domElement;
    let lost = false;
    let timer = 0;
    const arm = () => {
      clearTimeout(timer);
      if (lost && document.visibilityState === 'visible') {
        timer = setTimeout(() => onGiveUp?.(new Error('WebGL context lost')), timeout);
      }
    };
    const onLost = () => {
      lost = true;
      arm();
    };
    const onRestored = () => {
      lost = false;
      clearTimeout(timer);
      requestShadowRefresh();
      invalidate();
    };
    canvas.addEventListener('webglcontextlost', onLost);
    canvas.addEventListener('webglcontextrestored', onRestored);
    document.addEventListener('visibilitychange', arm);
    return () => {
      clearTimeout(timer);
      canvas.removeEventListener('webglcontextlost', onLost);
      canvas.removeEventListener('webglcontextrestored', onRestored);
      document.removeEventListener('visibilitychange', arm);
    };
  }, [gl, invalidate, onGiveUp, timeout]);
  return null;
}

/**
 * Before the scene is revealed: upload textures a few per frame and compile
 * shaders in the background, so the first frames don't freeze the page.
 */
export function Warmup({ textures, onReady }) {
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  const camera = useThree((s) => s.camera);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      for (let i = 0; i < textures.length; i++) {
        gl.initTexture(textures[i]);
        if (i % 2 === 1) await nextFrame();
        if (cancelled) return;
      }
      try {
        await gl.compileAsync(scene, camera);
      } catch {
        // compileAsync is an optimisation only
      }
      await nextFrame();
      if (!cancelled) onReady?.();
    })();
    return () => {
      cancelled = true;
    };
  }, [textures, gl, scene, camera, onReady]);
  return null;
}
