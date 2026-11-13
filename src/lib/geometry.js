// Custom geometry: bevelled book boards, cracked wax-seal halves, ribbon strips.
import * as THREE from 'three';

export function roundedRectShape(w, h, r) {
  const s = new THREE.Shape();
  const x = -w / 2;
  const y = -h / 2;
  s.moveTo(x + r, y);
  s.lineTo(x + w - r, y);
  s.quadraticCurveTo(x + w, y, x + w, y + r);
  s.lineTo(x + w, y + h - r);
  s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  s.lineTo(x + r, y + h);
  s.quadraticCurveTo(x, y + h, x, y + h - r);
  s.lineTo(x, y + r);
  s.quadraticCurveTo(x, y, x + r, y);
  return s;
}

/**
 * A book board with softly rounded corners and bevelled edges.
 * z spans [-depth, 0]. Material groups: 0 = outer face (-z), 1 = edges, 2 = inner face (+z).
 * Face UVs are normalised 0..1 and read correctly from their own side.
 */
export function createBoardGeometry(w, h, depth, { radius = 0.05, bevel = 0.012 } = {}) {
  const shape = roundedRectShape(w - bevel * 2, h - bevel * 2, radius);
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: Math.max(0.001, depth - bevel * 2),
    bevelEnabled: true,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelSegments: 3,
    curveSegments: 6,
  });
  geo.translate(0, 0, -(depth - bevel));

  const pos = geo.attributes.position;
  const uv = geo.attributes.uv;
  geo.computeBoundingBox();
  const { min, max } = geo.boundingBox;
  const bw = max.x - min.x;
  const bh = max.y - min.y;

  const lid = geo.groups.find((g) => g.materialIndex === 0);
  const sides = geo.groups.filter((g) => g.materialIndex === 1);
  // lids: first the bottom (outer) triangles, then the top (inner) ones
  let split = lid.start + lid.count;
  for (let i = lid.start; i < lid.start + lid.count; i += 3) {
    const z = (pos.getZ(i) + pos.getZ(i + 1) + pos.getZ(i + 2)) / 3;
    if (z > -depth / 2) {
      split = i;
      break;
    }
  }
  for (let i = lid.start; i < lid.start + lid.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const outer = i < split;
    uv.setXY(i, outer ? (max.x - x) / bw : (x - min.x) / bw, (y - min.y) / bh);
  }
  geo.clearGroups();
  geo.addGroup(lid.start, split - lid.start, 0);
  geo.addGroup(split, lid.start + lid.count - split, 2);
  sides.forEach((g) => geo.addGroup(g.start, g.count, 1));
  return geo;
}

/** Wax seal split by a jagged crack into a left and a right half. */
export function createSealHalves(radius, rand) {
  const N = 90;
  const phase = rand() * 10;
  const rim = [];
  for (let i = 0; i < N; i++) {
    const a = (i / N) * Math.PI * 2;
    const r = radius * (1 + 0.045 * Math.sin(a * 5 + phase) + 0.03 * Math.sin(a * 11 + phase * 2) + (rand() - 0.5) * 0.02);
    rim.push({ a, x: Math.cos(a) * r, y: Math.sin(a) * r });
  }
  const crackPts = [];
  const steps = 9;
  for (let i = 0; i <= steps; i++) {
    const y = radius * 1.15 - (i / steps) * radius * 2.3;
    const x = (i % 2 === 0 ? 1 : -1) * radius * (0.03 + rand() * 0.06) + radius * 0.06;
    crackPts.push({ x, y });
  }
  const crackX = (y) => {
    for (let i = 0; i < crackPts.length - 1; i++) {
      const a = crackPts[i];
      const b = crackPts[i + 1];
      if (y <= a.y && y >= b.y) return a.x + ((y - a.y) / (b.y - a.y)) * (b.x - a.x);
    }
    return crackPts[0].x;
  };
  const inner = crackPts.filter((p) => Math.abs(p.y) < radius * 0.98);

  const left = new THREE.Shape();
  // left half: rim from the top, counter-clockwise, to the bottom (never crosses angle 0)
  const leftRim = rim.filter((p) => p.x < crackX(p.y)).sort((p, q) => p.a - q.a);
  leftRim.forEach((p, i) => (i === 0 ? left.moveTo(p.x, p.y) : left.lineTo(p.x, p.y)));
  [...inner].reverse().forEach((p) => left.lineTo(p.x, p.y));
  left.closePath();

  const right = new THREE.Shape();
  // right half: rim from the bottom, counter-clockwise, to the top (never crosses angle π)
  const key = (a) => (a + Math.PI) % (Math.PI * 2);
  const rightRim = rim.filter((p) => p.x >= crackX(p.y)).sort((p, q) => key(p.a) - key(q.a));
  rightRim.forEach((p, i) => (i === 0 ? right.moveTo(p.x, p.y) : right.lineTo(p.x, p.y)));
  inner.forEach((p) => right.lineTo(p.x, p.y));
  right.closePath();

  const extrude = (shape) => {
    const g = new THREE.ExtrudeGeometry(shape, {
      depth: radius * 0.06,
      bevelEnabled: true,
      bevelThickness: radius * 0.09,
      bevelSize: radius * 0.07,
      bevelSegments: 5,
      curveSegments: 4,
    });
    const p = g.attributes.position;
    const uv = g.attributes.uv;
    for (let i = 0; i < p.count; i++) {
      uv.setXY(i, p.getX(i) / (radius * 2.3) + 0.5, p.getY(i) / (radius * 2.3) + 0.5);
    }
    g.computeVertexNormals();
    return g;
  };
  return { left: extrude(left), right: extrude(right) };
}

/**
 * A flat ribbon following a path. `points` are Vector3s; the ribbon's width
 * runs along `side`. The last row is cut into a V (swallow-tail).
 */
export function createRibbonGeometry(points, width, { side = new THREE.Vector3(1, 0, 0), notch = 0.06, samples = 80 } = {}) {
  const curve = new THREE.CatmullRomCurve3(points, false, 'centripetal');
  const length = curve.getLength();
  const pts = curve.getSpacedPoints(samples);
  const positions = [];
  const uvs = [];
  const indices = [];
  pts.forEach((p, i) => {
    const v = (i / samples) * length;
    const last = i === samples;
    const half = side.clone().multiplyScalar(width / 2);
    const tangent = curve.getTangentAt(Math.min(1, i / samples));
    const centre = last ? p.clone().addScaledVector(tangent, -notch) : p;
    positions.push(p.x - half.x, p.y - half.y, p.z - half.z);
    positions.push(centre.x, centre.y, centre.z);
    positions.push(p.x + half.x, p.y + half.y, p.z + half.z);
    uvs.push(0, v / width, 0.5, v / width, 1, v / width);
    if (i > 0) {
      const a = (i - 1) * 3;
      const b = i * 3;
      indices.push(a, b, a + 1, a + 1, b, b + 1, a + 1, b + 1, a + 2, a + 2, b + 1, b + 2);
    }
  });
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  g.setIndex(indices);
  g.computeVertexNormals();
  return g;
}

/** A plane whose UV u runs across its height (for satin strips laid along x). */
export function createStripPlane(length, width) {
  const g = new THREE.PlaneGeometry(length, width);
  const uv = g.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getY(i), (uv.getX(i) * length) / width);
  return g;
}
