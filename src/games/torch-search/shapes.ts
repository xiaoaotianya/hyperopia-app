/**
 * 小手电找东西的物件绘制（Canvas 路径，按单位半径 1 设计，整体落在半径 1 的圆内）。
 * variant 1 是“近似形”：轮廓上有一处明显的不同（多/少一个角、缺一块、多一片鳍……）。
 */
import { COLOR_COUNT, type Item, type Kind } from './logic'

export const COLORS = ['#e4572e', '#2f7fc1', '#f0b429', '#43a047', '#8e5ccf', '#e85d9e']
export const DARKS = ['#8f2d12', '#17466e', '#8a6100', '#1f5e22', '#4f2c7a', '#8c2457']
if (COLORS.length !== COLOR_COUNT) throw new Error('COLORS 与 COLOR_COUNT 不一致')

/** n 角星（中心 0,0，外半径 1） */
function nStar(g: CanvasRenderingContext2D, n: number, inner: number, rot = -Math.PI / 2) {
  g.beginPath()
  for (let i = 0; i < n * 2; i++) {
    const rr = i % 2 === 0 ? 1 : inner
    const a = rot + (i * Math.PI) / n
    if (i === 0) g.moveTo(Math.cos(a) * rr, Math.sin(a) * rr); else g.lineTo(Math.cos(a) * rr, Math.sin(a) * rr)
  }
  g.closePath()
}

type Painter = (g: CanvasRenderingContext2D, v: 0 | 1, fill: string, dark: string, lw: number, detail: boolean) => void

function finish(g: CanvasRenderingContext2D, fill: string, dark: string, lw: number) {
  g.fillStyle = fill; g.fill()
  g.strokeStyle = dark; g.lineWidth = lw; g.lineJoin = 'round'; g.stroke()
}

const PAINTERS: Record<Kind, Painter> = {
  shell(g, v, fill, dark, lw, detail) {
    // 扇贝：扇面 + （常规形才有的）底部两只“耳朵”
    const hx = 0, hy = 0.62, R = 1.25
    g.beginPath()
    g.moveTo(hx, hy)
    for (let i = 0; i <= 48; i++) {
      const a = -Math.PI * (0.83 - (0.66 * i) / 48)
      const rr = R * (1 - 0.06 * Math.abs(Math.sin(i * Math.PI / 6)))
      g.lineTo(hx + Math.cos(a) * rr, hy + Math.sin(a) * rr)
    }
    g.closePath()
    finish(g, fill, dark, lw)
    if (v === 0) {
      g.beginPath()
      g.moveTo(-0.42, 0.5); g.lineTo(0.42, 0.5); g.lineTo(0.34, 0.9); g.lineTo(-0.34, 0.9); g.closePath()
      finish(g, fill, dark, lw)
    }
    if (detail) {
      g.strokeStyle = dark; g.lineWidth = lw * 0.6
      for (let i = 1; i < 6; i++) {
        const a = -Math.PI * (0.83 - (0.66 * i) / 6)
        g.beginPath(); g.moveTo(hx, hy); g.lineTo(hx + Math.cos(a) * R * 0.85, hy + Math.sin(a) * R * 0.85); g.stroke()
      }
    }
  },
  starfish(g, v, fill, dark, lw, detail) {
    // 海星：5 条腿 vs 4 条腿
    nStar(g, v === 0 ? 5 : 4, 0.46)
    finish(g, fill, dark, lw)
    if (detail) {
      g.fillStyle = 'rgba(255,255,255,0.6)'
      g.beginPath(); g.arc(0, 0, 0.1, 0, Math.PI * 2); g.fill()
    }
  },
  fish(g, v, fill, dark, lw, detail) {
    // 小鱼：近似形多一片大背鳍
    g.beginPath()
    g.ellipse(0.12, 0.05, 0.68, 0.42, 0, 0, Math.PI * 2)
    finish(g, fill, dark, lw)
    g.beginPath(); g.moveTo(-0.45, 0.05); g.lineTo(-0.98, -0.38); g.lineTo(-0.98, 0.48); g.closePath()
    finish(g, fill, dark, lw)
    if (v === 1) {
      g.beginPath(); g.moveTo(-0.2, -0.3); g.lineTo(0.05, -0.85); g.lineTo(0.38, -0.32); g.closePath()
      finish(g, fill, dark, lw)
    }
    if (detail) {
      g.fillStyle = '#fffaf0'; g.beginPath(); g.arc(0.5, -0.05, 0.12, 0, Math.PI * 2); g.fill()
      g.fillStyle = '#1d1d1d'; g.beginPath(); g.arc(0.53, -0.05, 0.06, 0, Math.PI * 2); g.fill()
    }
  },
  leaf(g, v, fill, dark, lw, detail) {
    // 叶子：近似形被咬掉一口
    g.save()
    if (v === 1) {
      g.beginPath(); g.rect(-2, -2, 4, 4); g.arc(0.5, -0.05, 0.36, 0, Math.PI * 2)
      g.clip('evenodd')
    }
    g.beginPath()
    g.moveTo(0, -0.95)
    g.bezierCurveTo(0.75, -0.55, 0.75, 0.35, 0, 0.72)
    g.bezierCurveTo(-0.75, 0.35, -0.75, -0.55, 0, -0.95)
    g.closePath()
    finish(g, fill, dark, lw)
    g.restore()
    g.strokeStyle = dark; g.lineWidth = lw; g.lineCap = 'round'
    g.beginPath(); g.moveTo(0, 0.6); g.lineTo(0, 0.98); g.stroke()
    if (detail) { g.lineWidth = lw * 0.6; g.beginPath(); g.moveTo(0, 0.6); g.lineTo(0, -0.7); g.stroke() }
  },
  mushroom(g, v, fill, dark, lw, detail) {
    // 蘑菇：圆顶 vs 尖顶
    g.beginPath(); g.rect(-0.25, 0, 0.5, 0.9)
    finish(g, '#f3e7cf', '#8a7a5c', lw)
    g.beginPath()
    if (v === 0) { g.moveTo(-0.92, 0.12); g.bezierCurveTo(-0.92, -1.05, 0.92, -1.05, 0.92, 0.12) }
    else { g.moveTo(-0.92, 0.12); g.quadraticCurveTo(-0.3, -0.2, 0, -0.95); g.quadraticCurveTo(0.3, -0.2, 0.92, 0.12) }
    g.closePath()
    finish(g, fill, dark, lw)
    if (detail) {
      g.fillStyle = 'rgba(255,255,255,0.85)'
      for (const [x, y, r] of [[-0.45, -0.1, 0.12], [0.4, -0.05, 0.1], [0, -0.42, 0.11]]) { g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill() }
    }
  },
  acorn(g, v, fill, dark, lw, detail) {
    // 橡果：近似形的帽子上没有小柄，而是多一片小叶子
    g.beginPath()
    g.moveTo(-0.6, -0.1)
    g.bezierCurveTo(-0.62, 0.55, -0.2, 0.9, 0, 0.98)
    g.bezierCurveTo(0.2, 0.9, 0.62, 0.55, 0.6, -0.1)
    g.closePath()
    finish(g, fill, dark, lw)
    g.beginPath()
    g.moveTo(-0.78, -0.05); g.bezierCurveTo(-0.78, -0.7, 0.78, -0.7, 0.78, -0.05); g.closePath()
    finish(g, '#9b7652', '#5b4026', lw)
    if (v === 0) {
      g.beginPath(); g.rect(-0.08, -0.85, 0.16, 0.36)
      finish(g, '#9b7652', '#5b4026', lw)
    } else {
      g.beginPath(); g.moveTo(0.2, -0.5); g.quadraticCurveTo(0.9, -1.05, 0.98, -0.5); g.quadraticCurveTo(0.6, -0.35, 0.2, -0.5); g.closePath()
      finish(g, '#6aa84f', '#2f5e22', lw)
    }
    if (detail) {
      g.fillStyle = 'rgba(255,255,255,0.35)'
      g.beginPath(); g.ellipse(-0.25, 0.3, 0.1, 0.22, 0.3, 0, Math.PI * 2); g.fill()
    }
  },
  ball(g, v, fill, dark, lw, detail) {
    // 皮球 vs 游泳圈（中间有洞）
    g.beginPath(); g.arc(0, 0, 0.92, 0, Math.PI * 2)
    if (v === 1) g.arc(0, 0, 0.4, 0, Math.PI * 2, true)
    g.fillStyle = fill; g.fill('evenodd')
    g.strokeStyle = dark; g.lineWidth = lw; g.stroke()
    if (detail && v === 0) {
      g.strokeStyle = 'rgba(255,255,255,0.8)'; g.lineWidth = lw * 1.4
      g.beginPath(); g.moveTo(-0.9, 0); g.bezierCurveTo(-0.3, -0.4, 0.3, 0.4, 0.9, 0); g.stroke()
    }
  },
  block(g, v, fill, dark, lw, detail) {
    // 积木：近似形缺一个角
    const a = 0.78, n = 0.4
    g.beginPath()
    g.moveTo(-a, -a)
    if (v === 1) { g.lineTo(a - n, -a); g.lineTo(a - n, -a + n); g.lineTo(a, -a + n) } else g.lineTo(a, -a)
    g.lineTo(a, a); g.lineTo(-a, a); g.closePath()
    finish(g, fill, dark, lw)
    if (detail) {
      g.fillStyle = 'rgba(255,255,255,0.55)'
      g.beginPath(); g.arc(-0.3, 0.3, 0.18, 0, Math.PI * 2); g.fill()
    }
  },
  star(g, v, fill, dark, lw, detail) {
    // 五角星 vs 六角星
    nStar(g, v === 0 ? 5 : 6, 0.5)
    finish(g, fill, dark, lw)
    if (detail) {
      g.fillStyle = '#1d1d1d'
      g.beginPath(); g.arc(-0.18, -0.05, 0.07, 0, Math.PI * 2); g.arc(0.18, -0.05, 0.07, 0, Math.PI * 2); g.fill()
    }
  },
}

/** 在 (x,y) 画半径 r 的物件；rot 为整体旋转（弧度） */
export function drawItem(g: CanvasRenderingContext2D, it: Item, x: number, y: number, r: number, rot = 0) {
  g.save()
  g.translate(x, y)
  g.rotate(rot)
  g.scale(r, r)
  // 线宽按屏幕像素算，再换回单位坐标
  const lw = Math.max(1, r * 0.08) / r
  PAINTERS[it.kind](g, it.variant, COLORS[it.color], DARKS[it.color], lw, r >= 18)
  g.restore()
}
