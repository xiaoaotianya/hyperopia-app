import { type Rng } from '../../core/random'

export const MAX_LEVEL = 14
export const eccentricity = (lv: number) => Math.min(1, 0.3 + lv * 0.05)    // 相对最大半径
export const dwellMs = (lv: number) => Math.max(900, 3000 - lv * 150)
export const sizeArcmin = (lv: number) => 150 * Math.pow(0.93, lv)
export const GAP_MIN_MS = 600
export const GAP_MAX_MS = 1200

export interface Trial { angle: number; radius: number }                    // radius 归一化
export function makeTrial(lv: number, rng: Rng): Trial {
  const e = eccentricity(lv)
  return { angle: rng() * Math.PI * 2, radius: e * (0.6 + 0.4 * rng()) }
}
export function position(t: Trial, w: number, h: number) {
  const R = Math.min(w, h) / 2 * 0.85
  return { x: w / 2 + Math.cos(t.angle) * t.radius * R, y: h / 2 + Math.sin(t.angle) * t.radius * R }
}
