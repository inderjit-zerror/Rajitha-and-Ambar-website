// Picks a rendering quality for the device once, at start-up.
//
//   high   – desktop / laptop with a capable GPU
//   medium – phones, tablets and laptops with integrated graphics
//   low    – old phones, low-memory devices, software rendering
//   flat   – no WebGL2 (three.js needs it): a plain HTML invitation instead
//
// Override for testing with ?quality=flat|low|medium|high
// At runtime <AdaptiveResolution> can still lower the pixel ratio further if the
// frame rate drops.
//
// activeFps caps the frame rate while something animates (120 Hz screens on
// weaker devices don't need to draw twice as often); idleFps caps the always-on
// idle motion (the hovering closed book, dust).

export const PRESETS = {
  high: {
    tier: 'high',
    dpr: [1, 2],
    ppu: 512, // texture pixels per world unit
    paper: 1024,
    anisotropy: 8,
    shadowMap: 2048,
    shadowRadius: 5,
    dust: 120,
    sparkles: 1,
    sweepLight: true,
    physical: true,
    powerPreference: 'high-performance',
    activeFps: 120,
    idleFps: 60,
    webgl: true,
  },
  medium: {
    tier: 'medium',
    dpr: [1, 1.5],
    ppu: 400,
    paper: 768,
    anisotropy: 4,
    shadowMap: 1024,
    shadowRadius: 4,
    dust: 0,
    sparkles: 0.7,
    sweepLight: true,
    physical: true,
    powerPreference: 'default',
    activeFps: 60,
    idleFps: 60,
    webgl: true,
  },
  low: {
    tier: 'low',
    dpr: [0.75, 1.25],
    ppu: 300,
    paper: 512,
    anisotropy: 2,
    shadowMap: 1024,
    shadowRadius: 2,
    dust: 0,
    sparkles: 0.45,
    sweepLight: false,
    physical: false,
    powerPreference: 'default',
    activeFps: 60,
    idleFps: 30,
    webgl: true,
  },
};

PRESETS.flat = { ...PRESETS.low, tier: 'flat', webgl: false };

/** GPU name, or null when WebGL2 is unavailable (three.js r163+ requires it). */
function gpuName() {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2');
    if (!gl) return null;
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const name = ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER);
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return String(name || '');
  } catch {
    return null;
  }
}

export function detectQuality() {
  if (typeof window === 'undefined') return PRESETS.medium;
  const forced = new URLSearchParams(window.location.search).get('quality');
  if (forced && PRESETS[forced]) return PRESETS[forced];

  const nav = window.navigator;
  const ua = nav.userAgent || '';
  const mobile = /Android|iPhone|iPad|iPod|Mobile/i.test(ua) || (nav.maxTouchPoints > 1 && window.matchMedia('(pointer: coarse)').matches);
  const cores = nav.hardwareConcurrency || 4;
  const memory = nav.deviceMemory || 8; // only reported by Chromium browsers
  const gpu = gpuName();
  if (gpu === null) return PRESETS.flat;

  const software = /SwiftShader|llvmpipe|Software|Microsoft Basic/i.test(gpu);
  // old Mali (T-series, 400, G31–G57 — but not G610/G615), Adreno ≤ 5xx, PowerVR, old Intel HD
  const veryWeakGpu = /Mali-T|Mali-4|Mali-G[1-5]\d(?!\d)|Adreno \(TM\) [1-5]\d\d|PowerVR|Intel\(R\) HD Graphics( [2-5]\d{3})?$|GMA/i.test(gpu);
  const integrated = /Intel|Mali|Adreno|PowerVR|Apple GPU/i.test(gpu) && !/Apple M\d/i.test(gpu);

  if (software || veryWeakGpu || memory <= 2 || (mobile && (cores <= 4 || memory <= 3))) return PRESETS.low;
  if (mobile || integrated || cores <= 4 || memory <= 4) return PRESETS.medium;
  return PRESETS.high;
}
