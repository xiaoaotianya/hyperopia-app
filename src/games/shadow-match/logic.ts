// 影子配对：小动物剪影由多边形部件组成（坐标归一化到单位圆内，y 向下，头朝右）。
// 变换（旋转 / 镜像 / 缺部件）都是纯函数，不修改原形状。
import { type Rng, shuffle } from '../../core/random'

export const MAX_LEVEL = 14
export const shadowCount = (lv: number) => Math.min(4, 2 + Math.floor(lv / 4))
/** lv < 10 时干扰影子的旋转角度（度） */
export const rotationDeg = (lv: number) => Math.max(15, 90 - lv * 8)
export const sizeArcmin = (lv: number) => Math.max(60, 220 * Math.pow(0.93, lv))
/** 从这一级开始，影子差异改为镜像或缺少小部件 */
export const DETAIL_LEVEL = 10

export interface Pt { x: number; y: number }
export interface Part { name: string; pts: Pt[]; color: string; removable?: boolean }
export interface Shape { id: string; parts: Part[]; eye: Pt }
export interface Theme { id: 'farm' | 'jungle' | 'sea'; shapes: Shape[] }

// ---------- 造型小工具 ----------
const P = (...n: number[]): Pt[] => {
  const out: Pt[] = []
  for (let i = 0; i + 1 < n.length; i += 2) out.push({ x: n[i], y: n[i + 1] })
  return out
}
function ell(cx: number, cy: number, rx: number, ry: number, rot = 0, n = 24): Pt[] {
  const c = Math.cos(rot), s = Math.sin(rot)
  return Array.from({ length: n }, (_, i) => {
    const a = (i / n) * Math.PI * 2
    const x = Math.cos(a) * rx, y = Math.sin(a) * ry
    return { x: cx + x * c - y * s, y: cy + x * s + y * c }
  })
}
/** 上半个椭圆（圆顶），底边是直线 */
function dome(cx: number, cy: number, rx: number, ry: number, n = 16): Pt[] {
  return Array.from({ length: n + 1 }, (_, i) => {
    const a = Math.PI + (i / n) * Math.PI
    return { x: cx + Math.cos(a) * rx, y: cy + Math.sin(a) * ry }
  })
}
const rect = (x: number, y: number, w: number, h: number): Pt[] => P(x, y, x + w, y, x + w, y + h, x, y + h)

/** 把所有部件平移到包围盒中心、缩放到半径 0.96 以内（保证旋转后不出格） */
function defineShape(id: string, parts: Part[], eye: Pt): Shape {
  const all = parts.flatMap(p => p.pts)
  const minX = Math.min(...all.map(p => p.x)), maxX = Math.max(...all.map(p => p.x))
  const minY = Math.min(...all.map(p => p.y)), maxY = Math.max(...all.map(p => p.y))
  const cx = (minX + maxX) / 2, cy = (minY + maxY) / 2
  const r = Math.max(...all.map(p => Math.hypot(p.x - cx, p.y - cy)))
  const k = 0.96 / r
  const f = (p: Pt): Pt => ({ x: (p.x - cx) * k, y: (p.y - cy) * k })
  return { id, parts: parts.map(p => ({ ...p, pts: p.pts.map(f) })), eye: f(eye) }
}

// ---------- 小动物 ----------
const pig = defineShape('pig', [
  { name: 'tail', pts: P(-0.66, -0.05, -0.92, -0.28, -0.99, -0.14, -0.74, 0.06), color: '#ec8fa6', removable: true },
  { name: 'leg', pts: rect(-0.5, 0.3, 0.14, 0.35), color: '#ec8fa6' },
  { name: 'leg2', pts: rect(0.15, 0.3, 0.14, 0.35), color: '#ec8fa6' },
  { name: 'body', pts: ell(-0.1, 0.05, 0.6, 0.38), color: '#f4a6b8' },
  { name: 'ear', pts: P(0.36, -0.22, 0.46, -0.6, 0.62, -0.28), color: '#ec8fa6', removable: true },
  { name: 'head', pts: ell(0.5, -0.05, 0.3, 0.28), color: '#f4a6b8' },
  { name: 'snout', pts: ell(0.8, 0.02, 0.1, 0.13), color: '#e07c95' },
], { x: 0.56, y: -0.12 })

const chicken = defineShape('chicken', [
  { name: 'tail', pts: P(-0.45, -0.05, -0.8, -0.52, -0.9, -0.1, -0.5, 0.25), color: '#e9a23b', removable: true },
  { name: 'leg', pts: rect(-0.12, 0.5, 0.07, 0.32), color: '#e98a2e' },
  { name: 'leg2', pts: rect(0.08, 0.5, 0.07, 0.32), color: '#e98a2e' },
  { name: 'body', pts: ell(-0.05, 0.15, 0.5, 0.4), color: '#f6d55c' },
  { name: 'comb', pts: P(0.24, -0.5, 0.28, -0.7, 0.36, -0.6, 0.44, -0.74, 0.52, -0.5), color: '#e2483d', removable: true },
  { name: 'head', pts: ell(0.38, -0.35, 0.2, 0.2), color: '#f6d55c' },
  { name: 'beak', pts: P(0.55, -0.4, 0.8, -0.33, 0.55, -0.26), color: '#e98a2e' },
], { x: 0.43, y: -0.4 })

const dog = defineShape('dog', [
  { name: 'tail', pts: P(-0.55, 0.0, -0.86, -0.38, -0.78, -0.46, -0.5, -0.12), color: '#b37a48', removable: true },
  { name: 'leg', pts: rect(-0.45, 0.25, 0.12, 0.42), color: '#b37a48' },
  { name: 'leg2', pts: rect(0.18, 0.25, 0.12, 0.42), color: '#b37a48' },
  { name: 'body', pts: ell(-0.1, 0.1, 0.52, 0.28), color: '#c98f5a' },
  { name: 'ear', pts: P(0.32, -0.36, 0.36, -0.74, 0.52, -0.42), color: '#8f5c33', removable: true },
  { name: 'head', pts: ell(0.5, -0.25, 0.26, 0.22), color: '#c98f5a' },
  { name: 'muzzle', pts: ell(0.76, -0.18, 0.14, 0.1), color: '#e0b48a' },
], { x: 0.56, y: -0.31 })

const elephant = defineShape('elephant', [
  { name: 'tail', pts: P(-0.68, 0.0, -0.92, 0.3, -0.85, 0.34, -0.66, 0.1), color: '#7f8ca0', removable: true },
  { name: 'leg', pts: rect(-0.5, 0.3, 0.17, 0.4), color: '#8a97aa' },
  { name: 'leg2', pts: rect(0.05, 0.3, 0.17, 0.4), color: '#8a97aa' },
  { name: 'body', pts: ell(-0.15, 0.05, 0.55, 0.4), color: '#9aa7b8' },
  { name: 'head', pts: ell(0.4, -0.15, 0.3, 0.3), color: '#9aa7b8' },
  { name: 'ear', pts: ell(0.18, -0.4, 0.2, 0.22), color: '#b9c3d1', removable: true },
  { name: 'trunk', pts: P(0.62, -0.12, 0.8, 0.15, 0.84, 0.5, 0.7, 0.52, 0.67, 0.2, 0.52, 0.05), color: '#9aa7b8' },
], { x: 0.5, y: -0.22 })

const giraffe = defineShape('giraffe', [
  { name: 'tail', pts: P(-0.6, 0.08, -0.84, 0.36, -0.77, 0.4, -0.58, 0.16), color: '#c98f3a', removable: true },
  { name: 'leg', pts: rect(-0.5, 0.28, 0.09, 0.56), color: '#e2ad45' },
  { name: 'leg2', pts: rect(-0.3, 0.28, 0.09, 0.56), color: '#e2ad45' },
  { name: 'leg3', pts: rect(-0.02, 0.28, 0.09, 0.56), color: '#e2ad45' },
  { name: 'leg4', pts: rect(0.14, 0.24, 0.09, 0.6), color: '#e2ad45' },
  { name: 'body', pts: ell(-0.2, 0.15, 0.42, 0.22), color: '#f2c35b' },
  { name: 'neck', pts: P(0.04, 0.06, 0.3, -0.6, 0.45, -0.55, 0.26, 0.16), color: '#f2c35b' },
  { name: 'horn', pts: rect(0.35, -0.94, 0.07, 0.22), color: '#a8702c', removable: true },
  { name: 'head', pts: ell(0.48, -0.66, 0.19, 0.1, 0.2), color: '#f2c35b' },
], { x: 0.53, y: -0.68 })

const monkey = defineShape('monkey', [
  { name: 'tail', pts: P(-0.25, 0.45, -0.66, 0.5, -0.82, 0.2, -0.72, -0.06, -0.62, -0.02, -0.71, 0.21, -0.6, 0.4, -0.25, 0.34), color: '#8f5f3e', removable: true },
  { name: 'leg', pts: rect(-0.16, 0.48, 0.15, 0.22), color: '#8f5f3e' },
  { name: 'leg2', pts: rect(0.1, 0.48, 0.15, 0.22), color: '#8f5f3e' },
  { name: 'body', pts: ell(0, 0.2, 0.3, 0.38), color: '#a8744f' },
  { name: 'arm', pts: P(0.18, 0.04, 0.62, -0.08, 0.65, 0.04, 0.2, 0.2), color: '#8f5f3e', removable: true },
  { name: 'ear', pts: ell(-0.13, -0.42, 0.11, 0.11), color: '#e0b48a', removable: true },
  { name: 'head', pts: ell(0.15, -0.38, 0.26, 0.24), color: '#a8744f' },
  { name: 'face', pts: ell(0.3, -0.34, 0.13, 0.14), color: '#e0b48a' },
], { x: 0.31, y: -0.4 })

const fish = defineShape('fish', [
  { name: 'tail', pts: P(-0.38, 0, -0.85, -0.42, -0.74, 0, -0.85, 0.42), color: '#e36f3c', removable: true },
  { name: 'fin', pts: P(-0.08, -0.28, 0.08, -0.64, 0.3, -0.3), color: '#e36f3c', removable: true },
  { name: 'fin2', pts: P(-0.02, 0.28, 0.1, 0.52, 0.24, 0.3), color: '#e36f3c' },
  { name: 'body', pts: ell(0.1, 0, 0.55, 0.35), color: '#f28c5b' },
], { x: 0.42, y: -0.08 })

const whale = defineShape('whale', [
  { name: 'tail', pts: P(-0.48, -0.05, -0.92, -0.46, -0.78, 0.0, -0.92, 0.36, -0.48, 0.16), color: '#4a78b8', removable: true },
  { name: 'fin', pts: P(-0.22, -0.24, -0.1, -0.5, 0.06, -0.28), color: '#4a78b8', removable: true },
  { name: 'body', pts: ell(0.08, 0.05, 0.64, 0.34), color: '#5f8fd1' },
  { name: 'flipper', pts: P(0.08, 0.3, -0.02, 0.64, 0.26, 0.34), color: '#4a78b8', removable: true },
], { x: 0.46, y: 0.02 })

const turtle = defineShape('turtle', [
  { name: 'tail', pts: P(-0.48, -0.02, -0.74, 0.1, -0.48, 0.1), color: '#7cbf6a', removable: true },
  { name: 'leg', pts: rect(-0.4, 0.04, 0.16, 0.26), color: '#7cbf6a' },
  { name: 'front', pts: P(0.22, 0.04, 0.52, 0.36, 0.3, 0.4), color: '#7cbf6a', removable: true },
  { name: 'head', pts: ell(0.64, -0.06, 0.18, 0.13), color: '#9fd48a' },
  { name: 'shell', pts: dome(0, 0.06, 0.52, 0.5), color: '#4f9a5c' },
  { name: 'belly', pts: rect(-0.52, 0.0, 1.04, 0.12), color: '#d7c27a' },
], { x: 0.7, y: -0.09 })

export const THEMES: Theme[] = [
  { id: 'farm', shapes: [pig, chicken, dog] },
  { id: 'jungle', shapes: [elephant, giraffe, monkey] },
  { id: 'sea', shapes: [fish, whale, turtle] },
]

// ---------- 纯变换 ----------
const mapShape = (s: Shape, f: (p: Pt) => Pt): Shape =>
  ({ id: s.id, parts: s.parts.map(p => ({ ...p, pts: p.pts.map(f) })), eye: f(s.eye) })

export function rotateShape(s: Shape, deg: number): Shape {
  const a = (deg * Math.PI) / 180, c = Math.cos(a), sn = Math.sin(a)
  return mapShape(s, p => ({ x: p.x * c - p.y * sn, y: p.x * sn + p.y * c }))
}
export const mirrorShape = (s: Shape): Shape => mapShape(s, p => ({ x: -p.x, y: p.y }))
export function removePart(s: Shape, name: string): Shape {
  const copy = mapShape(s, p => ({ ...p }))
  return { ...copy, parts: copy.parts.filter(p => p.name !== name) }
}

export const shapeRadius = (s: Shape) => Math.max(...s.parts.flatMap(p => p.pts.map(q => Math.hypot(q.x, q.y))))

const EPS = 1e-3
const samePts = (a: Pt[], b: Pt[]) =>
  a.length === b.length &&
  a.every(p => b.some(q => Math.abs(p.x - q.x) < EPS && Math.abs(p.y - q.y) < EPS)) &&
  b.every(p => a.some(q => Math.abs(p.x - q.x) < EPS && Math.abs(p.y - q.y) < EPS))

/** 两个剪影是否完全相同：部件一一对应，且每个部件的点集重合 */
export function sameShape(a: Shape, b: Shape): boolean {
  if (a.parts.length !== b.parts.length) return false
  return a.parts.every(pa => {
    const pb = b.parts.find(p => p.name === pa.name)
    return !!pb && samePts(pa.pts, pb.pts)
  })
}

// ---------- 出题 ----------
export type OptionKind = 'same' | 'rotate' | 'mirror' | 'missing'
export interface ShadowOption { shape: Shape; kind: OptionKind }
export interface Trial { theme: Theme['id']; animal: Shape; options: ShadowOption[]; answer: number }

export function makeTrial(lv: number, rng: Rng): Trial {
  const theme = THEMES[Math.floor(rng() * THEMES.length) % THEMES.length]
  const animal = theme.shapes[Math.floor(rng() * theme.shapes.length) % theme.shapes.length]
  const k = shadowCount(lv) - 1
  let distractors: ShadowOption[]
  if (lv < DETAIL_LEVEL) {
    const r = rotationDeg(lv)
    const sign = rng() < 0.5 ? 1 : -1
    distractors = [r * sign, -r * sign, 2 * r * sign].slice(0, k).map(d => ({ shape: rotateShape(animal, d), kind: 'rotate' as const }))
  } else {
    const cands: ShadowOption[] = [
      { shape: mirrorShape(animal), kind: 'mirror' },
      ...shuffle(rng, animal.parts.filter(p => p.removable)).map(p => ({ shape: removePart(animal, p.name), kind: 'missing' as const })),
    ]
    // 镜像总是放在候选里（最难察觉之一），其余随机挑缺部件
    distractors = cands.slice(0, k)
    if (rng() < 0.3 && k < cands.length) distractors = cands.slice(1, k + 1)
  }
  const options = shuffle(rng, [{ shape: mapShape(animal, p => ({ ...p })), kind: 'same' as const }, ...distractors])
  return { theme: theme.id, animal, options, answer: options.findIndex(o => o.kind === 'same') }
}
