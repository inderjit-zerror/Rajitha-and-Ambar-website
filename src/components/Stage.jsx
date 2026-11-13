'use client';

// Everything that needs WebGL: paints the textures, creates the renderer and
// mounts the 3D scene. It is loaded as its own chunk (three.js and friends are
// about 1 MB), so the server-rendered loader is already drawing while it
// downloads. Any failure (no context, lost context, out of memory while
// painting) is reported through `onFail` so the page can fall back to the
// plain HTML invitation instead of hanging on the loader.
import { Component, useEffect, useState } from 'react';
import * as THREE from 'three';
import { Canvas } from '@react-three/fiber';
import { buildAssets } from '@/lib/assets';
import { getSerifFamily, loadSerifFonts } from '@/lib/fonts';
import Scene from './three/Scene';

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

export default function Stage({ quality, couple, events, header, warm, onProgress, onFail, ...sceneProps }) {
  const [assets, setAssets] = useState(null);

  // Paint all textures once fonts are ready (re-paints when content changes).
  useEffect(() => {
    let cancelled = false;
    let built = null;
    (async () => {
      try {
        const family = getSerifFamily();
        await loadSerifFonts(family);
        if (!cancelled) onProgress(0.1);
        built = await buildAssets({
          couple,
          events,
          header,
          family,
          quality,
          onProgress: (p) => !cancelled && onProgress(0.1 + p * 0.9),
        });
        if (cancelled) {
          built.dispose();
          return;
        }
        // the scene mounts (paused) behind the loader while textures upload and
        // shaders compile; the intro starts when the loader opens onto it
        setAssets(built);
      } catch (error) {
        if (!cancelled) onFail(error);
      }
    })();
    return () => {
      cancelled = true;
      built?.dispose();
    };
  }, [quality, couple, events, header, onProgress, onFail]);

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
        }}
      >
        {assets && <Scene assets={assets} events={events} quality={quality} onFail={onFail} {...sceneProps} />}
      </Canvas>
    </StageBoundary>
  );
}
