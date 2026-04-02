export function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

export function distance(x1, y1, x2, y2) {
  return Math.hypot(x2 - x1, y2 - y1);
}

export function lerp(a, b, t) {
  return a + (b - a) * t;
}

export function normalizeVector(x, y) {
  const mag = Math.hypot(x, y);
  if (mag === 0) return { x: 0, y: 0 };
  return { x: x / mag, y: y / mag };
}
