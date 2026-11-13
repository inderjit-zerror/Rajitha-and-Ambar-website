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

export function applyStudioEnvironment(renderer, scene, intensity = 0.6) {
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

  const pmrem = new THREE.PMREMGenerator(renderer);
  const target = pmrem.fromScene(envScene, 0.04);
  pmrem.dispose();
  rect.dispose();
  disc.dispose();
  materials.forEach((m) => m.dispose());

  scene.environment = target.texture;
  scene.environmentIntensity = intensity;
  return () => {
    if (scene.environment === target.texture) scene.environment = null;
    target.dispose();
  };
}
