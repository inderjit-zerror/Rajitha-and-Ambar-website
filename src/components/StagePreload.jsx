'use client';

// The 3D chunk's entry point. Experience loads <Stage> through this module,
// and also renders <StagePreload /> once: on the server that adds
// <link rel="preload"> hints for the chunk to the HTML, so the browser starts
// downloading three.js alongside the page's own scripts instead of after
// hydration. In the browser it renders nothing.
export { default as Stage } from './Stage';

export default function StagePreload() {
  return null;
}
