// Render-on-demand bookkeeping.
//
// The canvas only draws a frame when something is changing. Anything that
// animates outside GSAP (damped camera, hover lifts, particles…) calls
// keepAlive() from its frame loop while it is still moving; GSAP tweens are
// detected automatically. When nothing moves, the GPU rests.
import gsap from 'gsap';

let until = 0;

/** Keep frames coming for at least `ms` milliseconds. */
export function keepAlive(ms = 120) {
  const t = performance.now() + ms;
  if (t > until) until = t;
}

/** keepAlive() unless `current` has settled on `target`. */
export function settle(current, target, epsilon = 1e-4) {
  if (Math.abs(current - target) > epsilon) keepAlive();
}

function tweening() {
  const children = gsap.globalTimeline.getChildren(false, true, true);
  for (let i = 0; i < children.length; i++) if (children[i].isActive()) return true;
  return false;
}

export function isActive(now = performance.now()) {
  return now < until || tweening();
}

// The frame rate the driver is currently aiming for. Frame-time measurements
// compare against it, so a deliberately throttled idle loop isn't mistaken
// for a slow GPU.
let frameCap = 60;

export function setFrameCap(fps) {
  frameCap = fps;
}

export function getFrameCap() {
  return frameCap;
}

// Bumped when cached GPU work (the shadow map) must be redrawn, e.g. after the
// WebGL context was lost and restored.
let refreshToken = 0;

export function requestShadowRefresh() {
  refreshToken++;
  keepAlive(300);
}

export function getShadowRefreshToken() {
  return refreshToken;
}
