'use client';

// Everything that needs WebGL: wraps the painted canvases as textures, creates
// the renderer and mounts the 3D scene. It is loaded as its own chunk (three.js
// and friends are about 1 MB); the textures are painted by Experience while
// this chunk downloads, and the server-rendered loader is drawing all along.
// Any failure (no context, lost context, out of memory) is reported through
// `onFail` so the page can fall back to the plain HTML invitation instead of
// hanging on the loader.
import { Component, useCallback, useEffect, useMemo, useState } from 'react';
import * as THREE from 'three';
import { Canvas } from '@react-three/fiber';
import { createTextures } from '@/lib/assets';
import { charactersByFont } from '@/lib/layout';
import { preloadSdfFonts } from '@/lib/invitationCard';
import Scene from './three/Scene';
import { StudioEnvironment } from './three/Performance';

class StageBoundary extends Component {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error) {
    this.props.onFail?.(error);
  }

  render() {
    return this.state.failed ? null : this.props.children;
  }
}

/**
 * painted:    canvases from paintAssets(), or null while they are being painted
 * onProgress: 0..1 for the part of loading that happens here
 * onWarm:     textures uploaded, shaders compiled and 3D text glyphs ready
 */
export default function Stage({ quality, events, header, painted, warm, onProgress, onFail, onWarm, ...sceneProps }) {
  const [assets, setAssets] = useState(null);
  const [glyphsReady, setGlyphsReady] = useState(false);
  const [uploaded, setUploaded] = useState(false);

  // Build the glyph atlas of the 3D text as soon as this chunk has arrived,
  // while painting may still be going on.
  const characters = useMemo(() => charactersByFont(events, header), [events, header]);
  useEffect(() => {
    let cancelled = false;
    preloadSdfFonts(characters).then(() => !cancelled && setGlyphsReady(true));
    return () => {
      cancelled = true;
    };
  }, [characters]);

  // Wrap the canvases as textures (cheap). The scene then mounts, paused,
  // behind the loader, and uploads textures / compiles shaders (Warmup).
  useEffect(() => {
    if (!painted) return undefined;
    let cancelled = false;
    let built = null;
    try {
      built = createTextures(painted, quality);
    } catch (error) {
      onFail(error);
      return undefined;
    }
    // a run cancelled straight away (StrictMode) never reaches the scene
    Promise.resolve().then(() => !cancelled && setAssets(built));
    return () => {
      cancelled = true;
      built.dispose();
    };
  }, [painted, quality, onFail]);

  const progress = 0.4 + (glyphsReady ? 0.3 : 0) + (uploaded ? 0.3 : 0);
  useEffect(() => {
    onProgress(progress);
  }, [progress, onProgress]);

  const handleUploaded = useCallback(() => setUploaded(true), []);
  useEffect(() => {
    if (uploaded && glyphsReady) onWarm();
  }, [uploaded, glyphsReady, onWarm]);

  // Created here (rather than by R3F) so a device that cannot give us a WebGL2
  // context falls back cleanly.
  const createRenderer = (defaults) => {
    try {
      return new THREE.WebGLRenderer({ ...defaults, antialias: true, powerPreference: quality.powerPreference });
    } catch (error) {
      onFail(error);
      throw error;
    }
  };

  return (
    <StageBoundary onFail={onFail}>
      <Canvas
        shadows="percentage"
        frameloop={warm ? 'demand' : 'never'}
        dpr={quality.dpr}
        camera={{ fov: 30, near: 0.1, far: 120, position: [2.6, -7.4, 3.8], up: [0, 0, 1] }}
        gl={createRenderer}
        onCreated={({ gl }) => {
          gl.toneMapping = THREE.NeutralToneMapping;
          gl.toneMappingExposure = 1;
          gl.localClippingEnabled = true;
          // Reading back every shader's compile/link status stalls until the
          // driver has finished it, which defeats compileAsync. Only worth it
          // while developing.
          gl.debug.checkShaderErrors = process.env.NODE_ENV !== 'production';
        }}
      >
        {/* doesn't need the textures: built while they are still being painted */}
        <StudioEnvironment intensity={0.6} />
        {assets && <Scene assets={assets} events={events} quality={quality} onFail={onFail} onWarm={handleUploaded} {...sceneProps} />}
      </Canvas>
    </StageBoundary>
  );
}
