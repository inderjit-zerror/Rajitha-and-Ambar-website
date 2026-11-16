// A small studio environment for reflections (foil, wax, satin): a few bright
// panels around the book, pre-filtered once with PMREM. Replaces drei's
// <Environment>, which pulls HDR/EXR loaders into the bundle that we never use.
import * as THREE from 'three';

const PANELS = [
  // [intensity, position, scale, round]
  [2.4, [0, 1.5, 9], [14, 7, 1], false],
  [2, [-9, 5, 4], [8, 5, 1], false],
  [1.2, [9, -3, 4], [6, 4, 1], false],
  [5, [-4, 7, 7], [2.5, 2.5, 1], true],
];

const SIZE = 256; // PMREM cube size (three's default)

const pending = new WeakMap();

/** Resolves once applyStudioEnvironment() has set `scene.environment`. */
export function environmentReady(scene) {
  return pending.get(scene) ?? Promise.resolve();
}

// three (r182+) filters environments with a 256-sample GGX shader that some
// drivers take hundreds of milliseconds to compile, and PMREMGenerator
// compiles it synchronously: the page freezes meanwhile. Where shaders can be
// compiled in the background (KHR_parallel_shader_compile), compile PMREM's
// filter materials asynchronously first. This reaches into PMREMGenerator
// internals, so it checks for them and otherwise does nothing (same result,
// just the old freeze).
async function precompileFilters(renderer, pmrem) {
  if (!renderer.extensions.has('KHR_parallel_shader_compile')) return;
  if (typeof pmrem._setSize !== 'function' || typeof pmrem._allocateTargets !== 'function') return;
  pmrem._setSize(SIZE);
  pmrem._allocateTargets().dispose(); // creates the filter materials, as fromScene() would
  const geometry = pmrem._lodMeshes?.[0]?.geometry;
  const target = pmrem._pingPongRenderTarget;
  const materials = [pmrem._blurMaterial, pmrem._ggxMaterial].filter(Boolean);
  if (!geometry || !target || materials.length === 0) return;

  const batch = new THREE.Scene();
  materials.forEach((material) => batch.add(new THREE.Mesh(geometry, material)));
  // programs depend on the output (render target vs screen): match PMREM's
  const previous = renderer.getRenderTarget();
  renderer.setRenderTarget(target);
  let compiling;
  try {
    compiling = renderer.compileAsync(batch, new THREE.OrthographicCamera());
  } finally {
    renderer.setRenderTarget(previous);
  }
  await compiling;
}

/**
 * Builds the environment and sets it on `scene` (asynchronously: see
 * environmentReady). Returns a function that removes and disposes it.
 */
export function applyStudioEnvironment(renderer, scene, intensity = 0.6) {
  let disposed = false;
  let target = null;
  const pmrem = new THREE.PMREMGenerator(renderer);

  const build = () => {
    if (disposed) return;
    const envScene = new THREE.Scene();
    const rect = new THREE.PlaneGeometry(1, 1);
    const disc = new THREE.CircleGeometry(0.5, 32);
    const materials = [];
    PANELS.forEach(([strength, position, scale, round]) => {
      const material = new THREE.MeshBasicMaterial({
        color: new THREE.Color(1, 1, 1).multiplyScalar(strength),
        side: THREE.DoubleSide,
        toneMapped: false,
      });
      materials.push(material);
      const mesh = new THREE.Mesh(round ? disc : rect, material);
      mesh.position.set(...position);
      mesh.scale.set(...scale);
      mesh.lookAt(0, 0, 0);
      envScene.add(mesh);
    });

    target = pmrem.fromScene(envScene, 0.04, 0.1, 100, { size: SIZE });
    rect.dispose();
    disc.dispose();
    materials.forEach((m) => m.dispose());

    scene.environment = target.texture;
    scene.environmentIntensity = intensity;
  };

  const ready = precompileFilters(renderer, pmrem)
    .catch(() => {}) // only an optimisation
    .then(build)
    .catch((error) => console.warn('[invitation] Could not build the reflection environment.', error))
    .finally(() => pmrem.dispose());
  pending.set(scene, ready);

  return () => {
    disposed = true;
    if (target) {
      if (scene.environment === target.texture) scene.environment = null;
      target.dispose();
    }
  };
}
