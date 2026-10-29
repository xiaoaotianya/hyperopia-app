# 远视儿童视觉小游戏乐园 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 做一个纯前端 PWA，给 3–5 岁的远视儿童（戴足矫眼镜）在手机或平板上做近距离视觉训练。包含 10 个自适应小游戏、每日计划和时长控制、家长区。

**Architecture:** Vite + Vue 3 + TypeScript 单页应用。
- `src/core/`：纯函数核心，包括阶梯法、校准换算、每日计划、计时、存储。全部用 Vitest 做 TDD。
- `src/games/<id>/`：每个游戏分成 `logic.ts`（出题和判定，纯函数，有测试）和 `Game.vue`（Canvas 或 DOM 渲染）。
- 公共组件 `GameShell` 负责统一流程：语音说明、计时、阶梯法更新、奖励。
- 全局状态用一个 `reactive` store，变化时自动写入 localStorage。

**Tech Stack:** Vite 5, Vue 3.4, vue-router 4, TypeScript 5, Vitest 1, vite-plugin-pwa 0.20, Web Speech API, Web Audio API, Canvas 2D。

**Spec:** `docs/superpowers/specs/2026-10-29-hyperopia-vision-games-design.md`

**约定：**
- 难度等级 `level` 是整数，0 表示最容易，越大越难。
- 游戏组件的 props 是 `{ level: number; ctx: GameContext }`，每完成一次判定就 emit `trial(correct: boolean)`。
- 所有尺寸用角分（arcmin）定义，通过 `ctx.arcminToPx` 换算成 CSS 像素。

---

## 文件结构

```
package.json, vite.config.ts, tsconfig.json, index.html
public/icons/icon-192.png, icon-512.png
src/
  main.ts  App.vue  router.ts  styles.css
  core/  random.ts staircase.ts calibration.ts storage.ts store.ts dailyPlan.ts
         sessionTimer.ts speech.ts sound.ts rewards.ts date.ts
  games/ types.ts registry.ts  <10 个游戏目录>/{index.ts, logic.ts, Game.vue}
  components/ GameShell.vue BreakOverlay.vue ParentGate.vue StickerBurst.vue BigButton.vue
  views/ KidHome.vue TodayPlan.vue GamePark.vue GameRunner.vue StickerWall.vue DoneToday.vue
         parent/ ParentHome.vue Checkin.vue Progress.vue Settings.vue Calibration.vue Disclaimer.vue
tests/  core/*.test.ts  games/*.test.ts
```

---

### Task 1: 项目脚手架

**Files:** Create: `package.json`, `vite.config.ts`, `tsconfig.json`, `index.html`, `src/main.ts`, `src/App.vue`, `src/styles.css`, `.gitignore`

- [ ] **Step 1:** 在 `D:\claude\hyperopia` 运行 `npm create vite@5 . -- --template vue-ts`（目录里只有 docs，选“忽略已有文件”）。
- [ ] **Step 2:** 安装依赖：`npm i vue-router@4` 和 `npm i -D vitest@1 jsdom@24 @vue/test-utils@2 vite-plugin-pwa@0.20`。
- [ ] **Step 3:** 修改 `vite.config.ts`：

```ts
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  base: './',
  plugins: [
    vue(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: '视觉小游戏乐园',
        short_name: '视觉乐园',
        lang: 'zh-CN',
        display: 'fullscreen',
        orientation: 'any',
        background_color: '#f3efe6',
        theme_color: '#f3efe6',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
        ],
      },
    }),
  ],
  server: { host: true },
  test: { environment: 'jsdom', include: ['tests/**/*.test.ts'] },
})
```

- [ ] **Step 4:** 在 `package.json` 的 scripts 里加上 `"test": "vitest run"`。在 `tsconfig` 的 `types` 里加 `"vitest/globals"`（可选）。
- [ ] **Step 5:** 运行 `npm run build`，预期构建成功。
- [ ] **Step 6:** `git init && git add -A && git commit -m "chore: scaffold vite vue-ts project"`

---

### Task 2: 随机数与日期工具

**Files:** Create: `src/core/random.ts`, `src/core/date.ts`; Test: `tests/core/random.test.ts`

- [ ] **Step 1: 写测试**

```ts
import { describe, it, expect } from 'vitest'
import { createRng, seedFromString, randInt, shuffle } from '../../src/core/random'
import { todayKey } from '../../src/core/date'

describe('random', () => {
  it('同一种子产生相同序列', () => {
    const a = createRng(42), b = createRng(42)
    expect([a(), a(), a()]).toEqual([b(), b(), b()])
  })
  it('seedFromString 稳定', () => {
    expect(seedFromString('2026-10-29')).toBe(seedFromString('2026-10-29'))
    expect(seedFromString('2026-10-29')).not.toBe(seedFromString('2026-10-30'))
  })
  it('randInt 在闭区间内', () => {
    const r = createRng(1)
    for (let i = 0; i < 200; i++) { const v = randInt(r, 2, 5); expect(v).toBeGreaterThanOrEqual(2); expect(v).toBeLessThanOrEqual(5) }
  })
  it('shuffle 保持元素', () => {
    expect(shuffle(createRng(3), [1, 2, 3, 4]).sort()).toEqual([1, 2, 3, 4])
  })
  it('todayKey 格式', () => {
    expect(todayKey(new Date(2026, 9, 9))).toBe('2026-10-09')
  })
})
```

- [ ] **Step 2:** `npx vitest run tests/core/random.test.ts`，预期 FAIL（模块不存在）。
- [ ] **Step 3: 实现**

```ts
// src/core/random.ts
export type Rng = () => number

export function createRng(seed: number): Rng {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function seedFromString(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619)
  return h >>> 0
}

export function randInt(rng: Rng, min: number, max: number): number {
  return min + Math.floor(rng() * (max - min + 1))
}

export function shuffle<T>(rng: Rng, arr: T[]): T[] {
  const a = arr.slice()
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [a[i], a[j]] = [a[j], a[i]] }
  return a
}
```

```ts
// src/core/date.ts
export function todayKey(d = new Date()): string {
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}
```

- [ ] **Step 4:** 运行测试，预期 PASS。
- [ ] **Step 5:** `git commit -am "feat(core): seeded rng and date key"`

---

### Task 3: 阶梯法

**Files:** Create: `src/core/staircase.ts`; Test: `tests/core/staircase.test.ts`

规则：连对 3 次升难度，错 1 次降难度。前两次方向反转之前步长为 2，之后步长为 1。等级限制在 `[0, maxLevel]` 内。

- [ ] **Step 1: 写测试**

```ts
import { describe, it, expect } from 'vitest'
import { createStaircase, stepStaircase, warmupLevel } from '../../src/core/staircase'

const run = (s: any, seq: boolean[]) => seq.reduce((acc, c) => stepStaircase(acc, c), s)

describe('staircase', () => {
  it('连对 3 次升级（初始步长 2）', () => {
    const s = run(createStaircase(10, 0), [true, true, true])
    expect(s.level).toBe(2)
  })
  it('连对不足 3 次不升级', () => {
    expect(run(createStaircase(10, 0), [true, true]).level).toBe(0)
  })
  it('错一次降级且清空连对', () => {
    const s = run(createStaircase(10, 4), [true, true, false])
    expect(s.level).toBe(2)
    expect(s.streak).toBe(0)
  })
  it('两次反转后步长变为 1', () => {
    // 升(2) -> 降(反转1) -> 升(反转2) -> 之后步长1
    let s = run(createStaircase(20, 0), [true, true, true, false, true, true, true])
    expect(s.reversals).toBe(2)
    const before = s.level
    s = run(s, [true, true, true])
    expect(s.level).toBe(before + 1)
  })
  it('不超出边界', () => {
    expect(run(createStaircase(3, 3), [true, true, true]).level).toBe(3)
    expect(run(createStaircase(3, 0), [false]).level).toBe(0)
  })
  it('热身回退 2 级', () => {
    expect(warmupLevel(5)).toBe(3)
    expect(warmupLevel(1)).toBe(0)
  })
})
```

- [ ] **Step 2:** 运行，预期 FAIL。
- [ ] **Step 3: 实现**

```ts
// src/core/staircase.ts
export interface StaircaseState {
  level: number
  maxLevel: number
  streak: number
  reversals: number
  lastDir: -1 | 0 | 1 // 1=变难 -1=变易
}

export function createStaircase(maxLevel: number, startLevel = 0): StaircaseState {
  return { level: clamp(startLevel, 0, maxLevel), maxLevel, streak: 0, reversals: 0, lastDir: 0 }
}

export function stepStaircase(s: StaircaseState, correct: boolean): StaircaseState {
  const step = s.reversals >= 2 ? 1 : 2
  if (correct) {
    const streak = s.streak + 1
    if (streak < 3) return { ...s, streak }
    return move(s, 1, step)
  }
  return move(s, -1, step)
}

function move(s: StaircaseState, dir: 1 | -1, step: number): StaircaseState {
  const reversals = s.lastDir !== 0 && s.lastDir !== dir ? s.reversals + 1 : s.reversals
  return {
    ...s,
    level: clamp(s.level + dir * step, 0, s.maxLevel),
    streak: 0,
    reversals,
    lastDir: dir,
  }
}

export function warmupLevel(level: number): number {
  return Math.max(0, level - 2)
}

function clamp(v: number, lo: number, hi: number) { return Math.min(hi, Math.max(lo, v)) }
```

注意测试 4：在 level 2 错一次后降到 0（反转 1，步长 2），再连对 3 次升到 2（反转 2），之后连对 3 次只升 1 级，到 3。

- [ ] **Step 4:** 运行，预期 PASS。
- [ ] **Step 5:** `git commit -am "feat(core): 3-down-1-up staircase"`

---

### Task 4: 校准换算

**Files:** Create: `src/core/calibration.ts`; Test: `tests/core/calibration.test.ts`

- [ ] **Step 1: 写测试**

```ts
import { describe, it, expect } from 'vitest'
import { arcminToMm, arcminToPx, CARD_WIDTH_MM, pxPerMmFromCard, DEFAULT_PX_PER_MM } from '../../src/core/calibration'

describe('calibration', () => {
  it('40cm 处 60 角分约 6.98mm', () => {
    expect(arcminToMm(60, 400)).toBeCloseTo(6.981, 2)
  })
  it('银行卡宽度换算 pxPerMm', () => {
    expect(pxPerMmFromCard(342.4)).toBeCloseTo(4, 5)
    expect(CARD_WIDTH_MM).toBe(85.6)
  })
  it('arcminToPx 未校准时用默认值', () => {
    expect(arcminToPx(60, 400, null)).toBeCloseTo(6.981 * DEFAULT_PX_PER_MM, 1)
  })
})
```

- [ ] **Step 2:** 运行，预期 FAIL。
- [ ] **Step 3: 实现**

```ts
// src/core/calibration.ts
export const CARD_WIDTH_MM = 85.6
/** CSS 规范 96px/inch；移动设备实际偏大，未校准时仅作粗略估计 */
export const DEFAULT_PX_PER_MM = 96 / 25.4

export function arcminToMm(arcmin: number, distanceMm: number): number {
  const rad = (arcmin / 60) * (Math.PI / 180)
  return 2 * distanceMm * Math.tan(rad / 2)
}

export function arcminToPx(arcmin: number, distanceMm: number, pxPerMm: number | null): number {
  return arcminToMm(arcmin, distanceMm) * (pxPerMm ?? DEFAULT_PX_PER_MM)
}

export function pxPerMmFromCard(cardWidthPx: number): number {
  return cardWidthPx / CARD_WIDTH_MM
}

/** 每度视角对应的像素，用于空间频率（c/deg）换算 */
export function pxPerDegree(distanceMm: number, pxPerMm: number | null): number {
  return arcminToPx(60, distanceMm, pxPerMm)
}
```

- [ ] **Step 4:** 运行，预期 PASS。
- [ ] **Step 5:** `git commit -am "feat(core): visual angle calibration"`

---

### Task 5: 存储与全局 store

**Files:** Create: `src/core/storage.ts`, `src/core/store.ts`; Test: `tests/core/storage.test.ts`

- [ ] **Step 1: 写测试**

```ts
import { describe, it, expect } from 'vitest'
import { createStorage, defaultData, STORAGE_KEY } from '../../src/core/storage'

function fakeBackend() {
  const m = new Map<string, string>()
  return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v), removeItem: (k: string) => void m.delete(k), m }
}

describe('storage', () => {
  it('无数据时返回默认值', () => {
    const s = createStorage(fakeBackend())
    expect(s.load()).toEqual(defaultData())
  })
  it('保存后可读回', () => {
    const b = fakeBackend(); const s = createStorage(b)
    const d = defaultData(); d.profile.nickname = '小明'
    s.save(d)
    expect(createStorage(b).load().profile.nickname).toBe('小明')
  })
  it('后端抛错时退回内存并标记 persistent=false', () => {
    const bad = { getItem: () => { throw new Error('x') }, setItem: () => { throw new Error('x') }, removeItem: () => {} }
    const s = createStorage(bad)
    expect(s.persistent).toBe(false)
    const d = defaultData(); d.stickers.push('a'); s.save(d)
    expect(s.load().stickers).toEqual(['a'])
  })
  it('损坏的 JSON 会备份并重置', () => {
    const b = fakeBackend(); b.setItem(STORAGE_KEY, '{oops')
    const s = createStorage(b)
    expect(s.load()).toEqual(defaultData())
    expect([...b.m.keys()].some(k => k.startsWith(STORAGE_KEY + '.backup'))).toBe(true)
  })
  it('版本号不同会迁移并补齐缺失字段', () => {
    const b = fakeBackend(); b.setItem(STORAGE_KEY, JSON.stringify({ version: 0, stickers: ['x'] }))
    const d = createStorage(b).load()
    expect(d.version).toBe(1)
    expect(d.stickers).toEqual(['x'])
    expect(d.settings.dailyLimitMin).toBe(12)
  })
})
```

- [ ] **Step 2:** 运行，预期 FAIL。
- [ ] **Step 3: 实现**

```ts
// src/core/storage.ts
import type { StaircaseState } from './staircase'

export const STORAGE_KEY = 'hyperopia.v1'

export interface GameRecord {
  staircase: StaircaseState | null
  history: { date: string; levelEnd: number; trials: number; correct: number }[]
}
export interface DayRecord { glassesOn: boolean; secondsTrained: number; gamesPlayed: string[]; plan: string[] }
export interface AppData {
  version: 1
  profile: { nickname: string; avatar: string }
  settings: { dailyLimitMin: number; viewingDistanceMm: number; recheckDate: string | null; breakEveryMin: number }
  calibration: { pxPerMm: number | null }
  games: Record<string, GameRecord>
  days: Record<string, DayRecord>
  stickers: string[]
}

export function defaultData(): AppData {
  return {
    version: 1,
    profile: { nickname: '宝贝', avatar: '🐻' },
    settings: { dailyLimitMin: 12, viewingDistanceMm: 400, recheckDate: null, breakEveryMin: 5 },
    calibration: { pxPerMm: null },
    games: {},
    days: {},
    stickers: [],
  }
}

type Backend = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>

export function createStorage(backend: Backend | null) {
  let persistent = !!backend
  let memory: string | null = null
  try { backend?.getItem(STORAGE_KEY) } catch { persistent = false }

  const read = () => (persistent ? backend!.getItem(STORAGE_KEY) : memory)
  const write = (v: string) => { if (persistent) backend!.setItem(STORAGE_KEY, v); else memory = v }

  return {
    get persistent() { return persistent },
    load(): AppData {
      const raw = read()
      if (!raw) return defaultData()
      try { return migrate(JSON.parse(raw)) } catch {
        if (persistent) backend!.setItem(`${STORAGE_KEY}.backup.${Date.now()}`, raw)
        return defaultData()
      }
    },
    save(d: AppData) {
      try { write(JSON.stringify(d)) } catch { persistent = false; memory = JSON.stringify(d) }
    },
    clear() { if (persistent) backend!.removeItem(STORAGE_KEY); memory = null },
  }
}

function migrate(raw: any): AppData {
  const base = defaultData()
  return {
    ...base,
    ...raw,
    version: 1,
    profile: { ...base.profile, ...(raw.profile ?? {}) },
    settings: { ...base.settings, ...(raw.settings ?? {}) },
    calibration: { ...base.calibration, ...(raw.calibration ?? {}) },
    games: raw.games ?? {},
    days: raw.days ?? {},
    stickers: raw.stickers ?? [],
  }
}
```

```ts
// src/core/store.ts
import { reactive, watch } from 'vue'
import { createStorage, type DayRecord } from './storage'
import { todayKey } from './date'

const backend = typeof localStorage !== 'undefined' ? localStorage : null
export const storage = createStorage(backend)
export const store = reactive(storage.load())
watch(store, v => storage.save(v), { deep: true })

export function today(): DayRecord {
  const k = todayKey()
  if (!store.days[k]) store.days[k] = { glassesOn: false, secondsTrained: 0, gamesPlayed: [], plan: [] }
  return store.days[k]
}
```

- [ ] **Step 4:** 运行，预期 PASS。
- [ ] **Step 5:** `git commit -am "feat(core): persistent storage with fallback and migration"`

---

### Task 6: 每日计划

**Files:** Create: `src/core/dailyPlan.ts`; Test: `tests/core/dailyPlan.test.ts`

- [ ] **Step 1: 写测试**

```ts
import { describe, it, expect } from 'vitest'
import { pickDailyPlan, type PlanGame } from '../../src/core/dailyPlan'

const games: PlanGame[] = [
  { id: 'a1', category: 'fine' }, { id: 'a2', category: 'fine' }, { id: 'a3', category: 'fine' },
  { id: 'b1', category: 'contrast' }, { id: 'b2', category: 'contrast' },
  { id: 'c1', category: 'eye-move' }, { id: 'c2', category: 'eye-move' }, { id: 'c3', category: 'eye-move' },
  { id: 'd1', category: 'hand-eye' }, { id: 'd2', category: 'hand-eye' },
]

describe('dailyPlan', () => {
  it('4 类各至少 1 个，共 count 个，无重复', () => {
    const p = pickDailyPlan(games, {}, '2026-10-29', 5)
    expect(p).toHaveLength(5)
    expect(new Set(p).size).toBe(5)
    for (const c of ['fine', 'contrast', 'eye-move', 'hand-eye']) expect(p.some(id => games.find(g => g.id === id)!.category === c)).toBe(true)
  })
  it('同一天结果确定', () => {
    expect(pickDailyPlan(games, {}, '2026-10-29', 5)).toEqual(pickDailyPlan(games, {}, '2026-10-29', 5))
  })
  it('不包含昨天玩过的游戏（候选足够时）', () => {
    const yesterday = ['a1', 'b1', 'c1', 'd1']
    const p = pickDailyPlan(games, { '2026-10-28': yesterday }, '2026-10-29', 4)
    expect(p.some(id => yesterday.includes(id))).toBe(false)
  })
  it('优先选最近玩得少的', () => {
    const hist = { '2026-10-27': ['a1', 'a2'], '2026-10-26': ['a1', 'a2'] }
    const p = pickDailyPlan(games, hist, '2026-10-29', 4)
    expect(p).toContain('a3')
  })
})
```

- [ ] **Step 2:** 运行，预期 FAIL。
- [ ] **Step 3: 实现**

```ts
// src/core/dailyPlan.ts
import { createRng, seedFromString, shuffle } from './random'

export type Category = 'fine' | 'contrast' | 'eye-move' | 'hand-eye'
export interface PlanGame { id: string; category: Category }
const CATS: Category[] = ['fine', 'contrast', 'eye-move', 'hand-eye']

/** history: 日期 -> 当天玩过的游戏 id；date: 今天 YYYY-MM-DD */
export function pickDailyPlan(games: PlanGame[], history: Record<string, string[]>, date: string, count = 5): string[] {
  const rng = createRng(seedFromString(date))
  const yesterday = new Set(history[shiftDate(date, -1)] ?? [])
  const recent = new Map<string, number>()
  for (let i = 1; i <= 7; i++) for (const id of history[shiftDate(date, -i)] ?? []) recent.set(id, (recent.get(id) ?? 0) + 1)

  const rank = (list: PlanGame[]) =>
    shuffle(rng, list).sort((a, b) => score(a) - score(b))
  const score = (g: PlanGame) => (yesterday.has(g.id) ? 100 : 0) + (recent.get(g.id) ?? 0)

  const picked: string[] = []
  for (const c of CATS) {
    const best = rank(games.filter(g => g.category === c))[0]
    if (best) picked.push(best.id)
  }
  for (const g of rank(games.filter(g => !picked.includes(g.id)))) {
    if (picked.length >= count) break
    picked.push(g.id)
  }
  return shuffle(rng, picked.slice(0, Math.max(count, CATS.length)))
}

function shiftDate(date: string, days: number): string {
  const [y, m, d] = date.split('-').map(Number)
  const t = new Date(y, m - 1, d + days)
  const p = (n: number) => String(n).padStart(2, '0')
  return `${t.getFullYear()}-${p(t.getMonth() + 1)}-${p(t.getDate())}`
}
```

- [ ] **Step 4:** 运行，预期 PASS。
- [ ] **Step 5:** `git commit -am "feat(core): daily plan picker"`

---

### Task 7: 训练计时

**Files:** Create: `src/core/sessionTimer.ts`; Test: `tests/core/sessionTimer.test.ts`

- [ ] **Step 1: 写测试**

```ts
import { describe, it, expect } from 'vitest'
import { remainingSec, isLocked, needsBreak } from '../../src/core/sessionTimer'

describe('sessionTimer', () => {
  it('剩余秒数', () => {
    expect(remainingSec(300, 12)).toBe(420)
    expect(remainingSec(900, 12)).toBe(0)
  })
  it('用完即锁定', () => {
    expect(isLocked(720, 12)).toBe(true)
    expect(isLocked(719, 12)).toBe(false)
  })
  it('每 breakEveryMin 分钟需要休息', () => {
    expect(needsBreak(299, 5)).toBe(false)
    expect(needsBreak(300, 5)).toBe(true)
  })
})
```

- [ ] **Step 2:** 运行，预期 FAIL。
- [ ] **Step 3: 实现**

```ts
// src/core/sessionTimer.ts
export const remainingSec = (trainedSec: number, limitMin: number) => Math.max(0, limitMin * 60 - trainedSec)
export const isLocked = (trainedSec: number, limitMin: number) => remainingSec(trainedSec, limitMin) === 0
/** sinceBreakSec: 距离上次休息累计的训练秒数 */
export const needsBreak = (sinceBreakSec: number, breakEveryMin: number) => sinceBreakSec >= breakEveryMin * 60
```

- [ ] **Step 4:** 运行，预期 PASS。
- [ ] **Step 5:** `git commit -am "feat(core): session timer rules"`

---

### Task 8: 语音、音效、奖励

**Files:** Create: `src/core/speech.ts`, `src/core/sound.ts`, `src/core/rewards.ts`; Test: `tests/core/rewards.test.ts`

- [ ] **Step 1: 写奖励测试**

```ts
import { describe, it, expect } from 'vitest'
import { STICKERS, nextSticker, glassesStreak } from '../../src/core/rewards'

describe('rewards', () => {
  it('按顺序循环发放贴纸', () => {
    expect(nextSticker([])).toBe(STICKERS[0])
    expect(nextSticker(STICKERS.slice())).toBe(STICKERS[0])
  })
  it('连续戴镜天数', () => {
    const days = { '2026-10-27': { glassesOn: true }, '2026-10-28': { glassesOn: true }, '2026-10-29': { glassesOn: true }, '2026-10-25': { glassesOn: true } } as any
    expect(glassesStreak(days, '2026-10-29')).toBe(3)
  })
})
```

- [ ] **Step 2:** 运行，预期 FAIL。
- [ ] **Step 3: 实现**

```ts
// src/core/rewards.ts
import type { DayRecord } from './storage'
export const STICKERS = ['🌟','🍓','🐳','🌈','🚀','🦄','🍉','🐥','🌻','🎠','🐠','🍭','🦖','🧸','🎈','🐼']
export function nextSticker(owned: string[]): string { return STICKERS[owned.length % STICKERS.length] }
export function glassesStreak(days: Record<string, Pick<DayRecord, 'glassesOn'>>, today: string): number {
  let n = 0
  const d = new Date(today + 'T00:00:00')
  for (;;) {
    const p = (x: number) => String(x).padStart(2, '0')
    const k = `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
    if (!days[k]?.glassesOn) return n
    n++; d.setDate(d.getDate() - 1)
  }
}
```

```ts
// src/core/speech.ts
export const speechAvailable = () => typeof window !== 'undefined' && 'speechSynthesis' in window
export function speak(text: string) {
  if (!speechAvailable()) return
  window.speechSynthesis.cancel()
  const u = new SpeechSynthesisUtterance(text)
  u.lang = 'zh-CN'; u.rate = 0.9; u.pitch = 1.2
  const v = window.speechSynthesis.getVoices().find(v => v.lang.startsWith('zh'))
  if (v) u.voice = v
  window.speechSynthesis.speak(u)
}
```

```ts
// src/core/sound.ts
let ctx: AudioContext | null = null
function tone(freqs: number[], dur = 0.12) {
  try {
    ctx ??= new AudioContext()
    freqs.forEach((f, i) => {
      const o = ctx!.createOscillator(), g = ctx!.createGain()
      o.type = 'sine'; o.frequency.value = f
      const t = ctx!.currentTime + i * dur
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.2, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
      o.connect(g).connect(ctx!.destination); o.start(t); o.stop(t + dur)
    })
  } catch { /* 无音频设备时静默 */ }
}
export const playCorrect = () => tone([660, 880])
export const playWrong = () => tone([300], 0.15)
export const playReward = () => tone([523, 659, 784, 1047])
```

- [ ] **Step 4:** 运行，预期 PASS。
- [ ] **Step 5:** `git commit -am "feat(core): speech, sound, rewards"`

---

### Task 9: 游戏接口、注册表、GameShell、GameRunner

**Files:** Create: `src/games/types.ts`, `src/games/registry.ts`, `src/components/GameShell.vue`, `src/components/StickerBurst.vue`, `src/components/BreakOverlay.vue`, `src/views/GameRunner.vue`, `src/router.ts`

- [ ] **Step 1:** `src/games/types.ts`

```ts
import type { Component } from 'vue'
import type { Category } from '../core/dailyPlan'

export interface GameContext {
  arcminToPx(arcmin: number): number
  pxPerDegree(): number
  speak(text: string): void
  playCorrect(): void
  playWrong(): void
}

export interface GameDefinition {
  id: string
  name: string
  category: Category
  icon: string
  voiceIntro: string
  durationSec: number
  levels: number                 // 最大等级（含）
  primaryMetric: { label: string; unit: string; fromLevel(level: number): number }
  component: Component           // props: { level, ctx }  emits: trial(correct)
}

export const CATEGORY_NAMES: Record<Category, string> = {
  fine: '看得细', contrast: '看得清', 'eye-move': '眼睛灵', 'hand-eye': '手眼巧',
}
```

- [ ] **Step 2:** `src/games/registry.ts` 先导出空数组 `export const GAMES: GameDefinition[] = []` 和 `getGame(id)`。之后每完成一个游戏任务，就在这里追加一个 import。
- [ ] **Step 3:** `GameShell.vue` 的流程：
  - 挂载时：从 `store.games[id].staircase` 取等级；没有就新建。起始等级为 `warmupLevel(level)`。播放 `voiceIntro`，显示 3 秒的“准备”动画。
  - 进行中：顶部用小火车进度条显示剩余时间（`durationSec` 和今日剩余时长取较小值）。用 `<component :is="def.component" :level :ctx @trial>` 渲染游戏。
  - `onTrial(correct)`：调用 `stepStaircase`，写回 store，累计 trials 和 correct，播放音效。
  - 计时：每秒累加 `today().secondsTrained` 和 `sinceBreak`。`needsBreak` 时显示 `BreakOverlay`（暂停 20 秒）；`isLocked` 时结束本轮。`document.visibilitychange` 切到后台时暂停。
  - 结束时：往 `history` 写入 `{date, levelEnd, trials, correct}`，往 `gamesPlayed` 写入 id，发放 `nextSticker` 并播放 `StickerBurst`，然后 emit `done`。
- [ ] **Step 4:** `BreakOverlay.vue`：全屏柔和蓝色背景，画一只眨眼的猫头鹰（CSS 动画，周期 2 秒），语音播报“看看远处的东西，眨眨眼睛”。20 秒倒计时结束后 emit `close`；右下角有一个小字“家长跳过”按钮。
- [ ] **Step 5:** `GameRunner.vue`：读取路由参数 `:id`，挂载 `GameShell`；`done` 时跳回 `/today`。
- [ ] **Step 6:** `router.ts`：使用 hash 模式，路由包括 `/`, `/today`, `/park`, `/play/:id`, `/stickers`, `/done`, `/parent`, `/parent/checkin`, `/parent/progress`, `/parent/settings`, `/parent/calibration`, `/parent/disclaimer`。加一个全局守卫：进入 `/play/*` 前，如果 `isLocked`，跳到 `/done`；如果今天还没确认戴镜，跳到 `/`。
- [ ] **Step 7:** `npm run build`，通过后提交：`git commit -am "feat: game contract, shell and runner"`

---

### Task 10: 孩子端页面

**Files:** Create: `src/views/KidHome.vue`, `TodayPlan.vue`, `GamePark.vue`, `StickerWall.vue`, `DoneToday.vue`, `src/components/BigButton.vue`, `src/styles.css`

- [ ] **Step 1:** `styles.css` 设计令牌：
  - 背景 `#f3efe6`（柔和米色，不用纯白）；
  - 主色 `#4aa3a2`，强调色 `#f2a541`；
  - 圆角 24px，字体 `"PingFang SC","HarmonyOS Sans SC",sans-serif`；
  - 禁用文字选择和双击缩放：`touch-action: manipulation`。
- [ ] **Step 2:** `KidHome`：大头像和昵称，下面是“今天戴好眼镜了吗？”。按钮“家长确认：戴好了 👓”会设置 `today().glassesOn = true`，然后跳到 `/today`。如果已经确认过，直接显示“开始今天的游戏”大按钮。右上角是“家长”小入口和贴纸墙入口。
- [ ] **Step 3:** `TodayPlan`：如果 `today().plan` 为空，就用 `pickDailyPlan(GAMES, 各日 gamesPlayed, todayKey(), 5)` 生成并保存。以卡片列表展示计划里的游戏，已完成的打勾；点击未完成的进入 `/play/:id`。全部完成或锁定时跳到 `/done`。底部显示今日剩余分钟数。
- [ ] **Step 4:** `GamePark`：按 4 类分组展示全部游戏，可以自选。
- [ ] **Step 5:** `StickerWall`：用网格展示 `store.stickers`。
- [ ] **Step 6:** `DoneToday`：“今天练完啦！明天再来玩～”，展示连续戴镜天数和今天得到的贴纸。
- [ ] **Step 7:** `npm run dev`，用浏览器手机模拟器检查布局。提交：`git commit -am "feat: kid-facing views"`

---

### Task 11: 家长区

**Files:** Create: `src/components/ParentGate.vue`, `src/views/parent/*.vue`

- [ ] **Step 1:** `ParentGate`：随机出一道两位数加法题（两个数都在 11–39 之间），答对后设置 `sessionStorage.parentOk = '1'`，10 分钟内有效。所有 `/parent/*` 路由前置这个门。
- [ ] **Step 2:** `ParentHome`：入口菜单，包括打卡、进度、设置、校准、声明。顶部提示：
  - 未校准；
  - `storage.persistent === false`（进度不会保存）；
  - 语音不可用；
  - 复查日期临近（7 天内）。
- [ ] **Step 3:** `Checkin`：当月日历，戴镜的日期打上 👓，并显示 `glassesStreak`。
- [ ] **Step 4:** `Progress`：
  - 近 14 天的训练时长柱状图，用手写 SVG；
  - 每个游戏的 `history` 用 `primaryMetric.fromLevel(levelEnd)` 画折线，标注单位。
- [ ] **Step 5:** `Settings`：
  - 昵称、头像（从 8 个 emoji 里选）；
  - 每日时长（5–20 分钟滑块）；
  - 观看距离（300–500mm）；
  - 休息间隔；
  - 复查日期（日期输入框）；
  - 导出 JSON（Blob 下载）；
  - 清空数据（需要二次确认）。
- [ ] **Step 6:** `Calibration`：显示一个可以拖动调宽的矩形和一个滑块，提示“把银行卡贴在屏幕上，调到和卡片一样宽”。保存时写入 `pxPerMmFromCard(宽度px)`。
- [ ] **Step 7:** `Disclaimer`：放设计文档第 4 节的声明文本，另外说明“对比度最低约 1%，受屏幕限制”。
- [ ] **Step 8:** 构建通过后提交：`git commit -am "feat: parent area"`

---

### Task 12–21: 10 个游戏

每个游戏任务的步骤都一样：
1. 写 `tests/games/<id>.test.ts`；
2. 运行，确认 FAIL；
3. 实现 `logic.ts`，测试 PASS；
4. 实现 `Game.vue` 和 `index.ts`，并在 `registry.ts` 注册；
5. 在 `npm run dev` 里手动玩一轮；
6. 提交 `feat(game): <id>`。

公共要求：
- `Game.vue` 用 `ResizeObserver` 获取可用区域；
- 用 `createRng(Date.now())` 出题；
- 每次判定后 emit `trial`，再根据新的 `level` prop 出下一题；
- 答对时目标位置出现星星粒子，答错时目标轻微摇晃（`transform`，300ms）。

#### Task 12: 🐞 找小瓢虫 `find-bug`（fine）

```ts
// src/games/find-bug/logic.ts
import { type Rng, randInt } from '../../core/random'
export const MAX_LEVEL = 14
export const sizeArcmin = (lv: number) => 60 * Math.pow(0.86, lv)          // 瓢虫整体尺寸
export const itemCount = (lv: number) => Math.min(12, 4 + Math.floor(lv / 2))
export const spacingFactor = (lv: number) => Math.max(1.3, 2.6 - lv * 0.1)  // 中心距/尺寸
export interface Trial { count: number; oddIndex: number; spots: number[] }  // 每只瓢虫的斑点数
export function makeTrial(lv: number, rng: Rng): Trial {
  const count = itemCount(lv)
  const base = randInt(rng, 2, 4)
  const odd = base + (rng() < 0.5 ? -1 : 1)
  const oddIndex = randInt(rng, 0, count - 1)
  const spots = Array.from({ length: count }, (_, i) => (i === oddIndex ? odd : base))
  return { count, oddIndex, spots }
}
export const isCorrect = (t: Trial, tapped: number) => tapped === t.oddIndex
```

测试：`makeTrial` 中只有一个元素的斑点数与其他不同；`oddIndex` 指向它；`itemCount` 和 `sizeArcmin` 随等级单调变化。
渲染：Canvas 网格排列，中心距 = `size*spacingFactor`，整体居中。每只瓢虫是红色圆形，加黑色头部和 `spots[i]` 个黑点。点击时取最近的瓢虫（距离小于 size）判定。
`primaryMetric`：`{label:'瓢虫大小', unit:'角分', fromLevel: sizeArcmin}`；语音：“找一找，哪只小瓢虫和别的不一样？”

#### Task 13: 🃏 双胞胎配对 `twin-cards`（fine）

```ts
// src/games/twin-cards/logic.ts
import { type Rng, randInt } from '../../core/random'
export const MAX_LEVEL = 12
export const cardCount = (lv: number) => Math.min(8, 3 + Math.floor(lv / 2))
export const diffCells = (lv: number) => Math.max(1, 4 - Math.floor(lv / 3))
export const cellArcmin = (lv: number) => 40 * Math.pow(0.9, lv)
export type Pattern = boolean[]                                       // 3x3 格子
export interface Trial { cards: Pattern[]; twins: [number, number] }
export function makeTrial(lv: number, rng: Rng): Trial {
  const n = cardCount(lv), k = diffCells(lv)
  const base: Pattern = Array.from({ length: 9 }, () => rng() < 0.5)
  const key = (p: Pattern) => p.map(Number).join('')
  const seen = new Set([key(base)])
  const cards: Pattern[] = []
  while (cards.length < n - 2) {
    const p = base.slice()
    const idx = new Set<number>(); while (idx.size < k) idx.add(randInt(rng, 0, 8))
    idx.forEach(i => (p[i] = !p[i]))
    if (!seen.has(key(p))) { seen.add(key(p)); cards.push(p) }
  }
  const a = randInt(rng, 0, n - 1)
  let b = randInt(rng, 0, n - 2); if (b >= a) b++
  const out: Pattern[] = []; let j = 0
  for (let i = 0; i < n; i++) out.push(i === a || i === b ? base.slice() : cards[j++])
  return { cards: out, twins: [Math.min(a, b), Math.max(a, b)] }
}
export const isCorrect = (t: Trial, x: number, y: number) => Math.min(x, y) === t.twins[0] && Math.max(x, y) === t.twins[1]
```

测试：恰好有一对卡片完全相同，其余卡片两两不同；`isCorrect` 与点选顺序无关。
渲染：DOM 网格卡片，每张卡片里是 3x3 小圆点，点的直径为 `cellArcmin` 换算出的像素。点第一张高亮，点第二张时判定。
`primaryMetric`：`{label:'图案格子', unit:'角分', fromLevel: cellArcmin}`；语音：“找出两张一模一样的卡片。”

#### Task 14: 🧩 补缺口 `puzzle-gap`（fine）

```ts
// src/games/puzzle-gap/logic.ts
import { type Rng, randInt, shuffle } from '../../core/random'
export const MAX_LEVEL = 12
export const candidateCount = (lv: number) => Math.min(4, 2 + Math.floor(lv / 4))
export const angleDiff = (lv: number) => Math.max(12, 90 - lv * 7)        // 候选间旋转差（度）
export interface Trial { gapAngle: number; candidates: number[]; answer: number }  // 角度=缺口朝向
export function makeTrial(lv: number, rng: Rng): Trial {
  const gapAngle = randInt(rng, 0, 7) * 45
  const n = candidateCount(lv), d = angleDiff(lv)
  const offsets = [0, d, -d, 2 * d].slice(0, n)
  const candidates = shuffle(rng, offsets.map(o => (gapAngle + o + 360) % 360))
  return { gapAngle, candidates, answer: candidates.indexOf(gapAngle) }
}
export const isCorrect = (t: Trial, i: number) => i === t.answer
```

测试：候选里恰好有一个等于 `gapAngle`；候选数随等级增加；`angleDiff` 不小于 12。
渲染：上方是一个大饼干（圆形），缺一个 60° 的扇形，朝向 `gapAngle`；下方是候选扇形块（扇形角 60°，朝向为各自候选角）。选对后，饼干块飞到缺口补上。
`primaryMetric`：`{label:'方向差', unit:'度', fromLevel: angleDiff}`；语音：“哪一块能把饼干补好？”

#### Task 15: 🎈 条纹气球 `stripe-balloon`（contrast）

```ts
// src/games/stripe-balloon/logic.ts
import { type Rng } from '../../core/random'
export const MAX_LEVEL = 20
export const contrast = (lv: number) => Math.max(0.01, 0.8 * Math.pow(10, -lv * 0.1)) // 0.8 → 0.01
export const SF_CYCLE = [2, 4, 6, 8]                                                  // c/deg
export interface Trial { side: 0 | 1; contrast: number; sf: number }
export function makeTrial(lv: number, rng: Rng, trialIndex: number): Trial {
  return { side: rng() < 0.5 ? 0 : 1, contrast: contrast(lv), sf: SF_CYCLE[trialIndex % SF_CYCLE.length] }
}
/** Gabor 像素亮度 0-255；x,y 为相对中心的像素坐标 */
export function gaborValue(x: number, y: number, c: number, sfPxCycle: number, sigmaPx: number): number {
  const env = Math.exp(-(x * x + y * y) / (2 * sigmaPx * sigmaPx))
  return Math.round(128 + 127 * c * env * Math.cos((2 * Math.PI * x) / sfPxCycle))
}
export const isCorrect = (t: Trial, tapped: 0 | 1) => tapped === t.side
```

测试：`contrast(0)=0.8`，`contrast(20)=0.01`，且单调递减；`gaborValue` 在中心等于 `128+127c`，远处趋近 128；`SF_CYCLE` 轮换。
渲染：两个气球外形（4° 直径的圆，底部画线绳），内部背景灰 128。有条纹的那个用 `ImageData` 逐像素填充 Gabor：`sfPxCycle = ctx.pxPerDegree()/sf`，`sigmaPx = 0.6°` 对应的像素。Canvas 按 `devicePixelRatio` 缩放。
`primaryMetric`：`{label:'条纹对比度', unit:'%', fromLevel: lv => +(contrast(lv)*100).toFixed(1)}`；语音：“哪个气球上有条纹？点一点它。”

#### Task 16: ⭐ 雾里找星星 `fog-star`（contrast）

```ts
// src/games/fog-star/logic.ts
import { type Rng } from '../../core/random'
export const MAX_LEVEL = 16
export const starContrast = (lv: number) => Math.max(0.01, 0.6 * Math.pow(10, -lv * 0.1))
export const starArcmin = (lv: number) => 120 * Math.pow(0.95, lv)
export const TIMEOUT_MS = 8000
export interface Trial { x: number; y: number }            // 0.1–0.9 的归一化位置
export const makeTrial = (rng: Rng): Trial => ({ x: 0.1 + rng() * 0.8, y: 0.15 + rng() * 0.7 })
export function isHit(t: Trial, px: number, py: number, w: number, h: number, sizePx: number) {
  return Math.hypot(px - t.x * w, py - t.y * h) <= sizePx * 0.75
}
```

测试：位置在范围内；命中半径判定正确；对比度单调递减，下限为 0.01。
渲染：背景灰 `#808080`，叠加缓慢漂移的雾（低对比度的大块径向渐变，透明度 0.03，周期大于 6 秒）。星星是五角星，亮度 = `128*(1+starContrast)`。8 秒内没点中算错，然后换下一题。
`primaryMetric`：`{label:'星星对比度', unit:'%', fromLevel: lv => +(starContrast(lv)*100).toFixed(1)}`；语音：“雾里藏着一颗星星，找到它！”

#### Task 17: 🦋 追蝴蝶 `chase-butterfly`（eye-move）

```ts
// src/games/chase-butterfly/logic.ts
import { type Rng } from '../../core/random'
export const MAX_LEVEL = 14
export const eccentricity = (lv: number) => Math.min(1, 0.3 + lv * 0.05)    // 相对最大半径
export const dwellMs = (lv: number) => Math.max(900, 3000 - lv * 150)
export const sizeArcmin = (lv: number) => 150 * Math.pow(0.93, lv)
export interface Trial { angle: number; radius: number }                    // radius 归一化
export function makeTrial(lv: number, rng: Rng): Trial {
  const e = eccentricity(lv)
  return { angle: rng() * Math.PI * 2, radius: e * (0.6 + 0.4 * rng()) }
}
export function position(t: Trial, w: number, h: number) {
  const R = Math.min(w, h) / 2 * 0.85
  return { x: w / 2 + Math.cos(t.angle) * t.radius * R, y: h / 2 + Math.sin(t.angle) * t.radius * R }
}
```

测试：`position` 在画布范围内；`dwellMs` 不小于 900；等级越高，`eccentricity` 越大。
渲染：屏幕中央有一朵花（注视点）。蝴蝶在 `position` 出现，翅膀缓慢扇动（周期 1 秒）。`dwellMs` 内点中算对，超时算错；两次之间间隔 600–1200ms。
`primaryMetric`：`{label:'反应时间', unit:'毫秒', fromLevel: dwellMs}`；语音：“蝴蝶飞来啦，看到就点它！”

#### Task 18: 🚂 小火车 `little-train`（eye-move）

```ts
// src/games/little-train/logic.ts
import { type Rng } from '../../core/random'
export const MAX_LEVEL = 12
export const speed = (lv: number) => 0.05 + lv * 0.012                 // 轨道周长/秒
export const complexity = (lv: number) => (lv >= 8 ? 3 : lv >= 4 ? 2 : 1)
export const starWindowMs = (lv: number) => Math.max(1000, 2200 - lv * 90)
/** 闭合轨道：t∈[0,1)，返回归一化坐标 0-1 */
export function trackPoint(t: number, cx: number): { x: number; y: number } {
  const a = 2 * Math.PI * t
  return { x: 0.5 + 0.4 * Math.sin(a), y: 0.5 + 0.35 * Math.sin(cx * a + (cx > 1 ? Math.PI / 4 : Math.PI / 2)) }
}
export const nextStarDelayMs = (rng: Rng) => 2000 + rng() * 2000
```

测试：`trackPoint(0)` 与 `trackPoint(1)` 重合（轨道闭合）；坐标都在 0–1 之间；`starWindowMs` 不小于 1000。
渲染：Canvas 画轨道（浅色粗线）和小火车（车头加 2 节车厢）沿轨道行驶。每隔 `nextStarDelayMs`，随机一节车厢变成发光的星星，持续 `starWindowMs`：这段时间内点中星星算对，没点到算错。点火车其他位置不判定。
`primaryMetric`：`{label:'火车速度', unit:'圈/分', fromLevel: lv => +(speed(lv)*60).toFixed(1)}`；语音：“小火车上出现星星时，赶快点它！”

#### Task 19: 🐹 打地鼠 `whack-mole`（eye-move）

```ts
// src/games/whack-mole/logic.ts
import { type Rng, randInt } from '../../core/random'
export const MAX_LEVEL = 14
export const holeCount = (lv: number) => Math.min(8, 3 + Math.floor(lv / 3))
export const upMs = (lv: number) => Math.max(900, 2500 - lv * 120)
export const hatArcmin = (lv: number) => 40 * Math.pow(0.92, lv)
export interface Pop { hole: number; hasHat: boolean }
export const makePop = (lv: number, rng: Rng): Pop => ({ hole: randInt(rng, 0, holeCount(lv) - 1), hasHat: rng() < 0.6 })
/** 返回 null 表示不计入判定 */
export function judge(p: Pop, action: 'tap' | 'timeout'): boolean | null {
  if (action === 'tap') return p.hasHat
  return p.hasHat ? false : null
}
```

测试：`judge` 有四种组合：点有帽 = 对，点无帽 = 错，有帽超时 = 错，无帽超时 = null；`hole` 在范围内。
渲染：草地上排列 `holeCount` 个洞（2 排）。地鼠冒头 `upMs` 毫秒；有帽子的地鼠，帽子高度用 `hatArcmin` 换算。点地鼠时有锤子落下的动画。
`primaryMetric`：`{label:'小帽子大小', unit:'角分', fromLevel: hatArcmin}`；语音：“只打戴帽子的小地鼠哦！”

#### Task 20: ✏️ 送小兔回家 `maze-path`（hand-eye）

```ts
// src/games/maze-path/logic.ts
import { type Rng } from '../../core/random'
export const MAX_LEVEL = 10
export const widthArcmin = (lv: number) => 300 * Math.pow(0.85, lv)
export const bends = (lv: number) => 1 + Math.floor(lv / 2)
export type Pt = { x: number; y: number }
/** 归一化折线，从左(0.08)到右(0.92) */
export function makePath(lv: number, rng: Rng): Pt[] {
  const n = bends(lv) + 1
  const pts: Pt[] = [{ x: 0.08, y: 0.5 }]
  for (let i = 1; i < n; i++) pts.push({ x: 0.08 + (0.84 * i) / n, y: 0.2 + rng() * 0.6 })
  pts.push({ x: 0.92, y: 0.5 })
  return pts
}
export function distToPolyline(p: Pt, pts: Pt[]): number {
  let best = Infinity
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i], b = pts[i + 1]
    const dx = b.x - a.x, dy = b.y - a.y
    const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / (dx * dx + dy * dy)))
    best = Math.min(best, Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy)))
  }
  return best
}
```

测试：路径的首尾点固定；`distToPolyline` 对线段上的点为 0，对已知点能算出正确距离；`bends` 随等级增加。
渲染：用像素坐标调用 `distToPolyline`，即把归一化坐标乘以宽高。左端是小兔，右端是房子。拖动时，如果小兔离路中线超过半个路宽，就弹回最近的已通过路点，本次计 1 次错误（每次出界只计一次）；到达房子计对，然后换新路径。
`primaryMetric`：`{label:'小路宽度', unit:'角分', fromLevel: widthArcmin}`；语音：“沿着小路，把小兔送回家。”

#### Task 21: ✨ 点亮小灯 `light-dots`（hand-eye）

```ts
// src/games/light-dots/logic.ts
import { type Rng, randInt } from '../../core/random'
export const MAX_LEVEL = 10
export const seqLength = (lv: number) => Math.min(7, 2 + Math.floor(lv / 2))
export const dotCount = (lv: number) => Math.min(9, seqLength(lv) + 2)
export function makeSequence(lv: number, rng: Rng): number[] {
  const n = dotCount(lv), seq: number[] = []
  while (seq.length < seqLength(lv)) { const d = randInt(rng, 0, n - 1); if (d !== seq[seq.length - 1]) seq.push(d) }
  return seq
}
/** 返回 'continue' | 'done' | 'wrong' */
export function checkInput(seq: number[], input: number[]): 'continue' | 'done' | 'wrong' {
  for (let i = 0; i < input.length; i++) if (input[i] !== seq[i]) return 'wrong'
  return input.length === seq.length ? 'done' : 'continue'
}
```

测试：序列长度正确，没有相邻重复；`checkInput` 三种结果都覆盖到。
渲染：小灯按 3x3 网格排列，用前 `dotCount` 个位置。演示时每盏灯渐亮 600ms 再渐暗 400ms（平滑过渡，不闪烁）。演示结束后孩子依次点击：`done` 算对，`wrong` 算错，然后出下一题。
`primaryMetric`：`{label:'记住的灯数', unit:'个', fromLevel: seqLength}`；语音：“看小灯亮的顺序，然后照着点一遍。”

---

### Task 22: PWA 图标、构建与真机验证

**Files:** Create: `public/icons/icon-192.png`, `public/icons/icon-512.png`（用 Node 脚本生成纯色圆角图标加 👓 字样，或者用 SVG 转 PNG）

- [ ] **Step 1:** `npm test`，预期全部 PASS。
- [ ] **Step 2:** `npm run build`，预期没有类型错误，生成 `dist/`。
- [ ] **Step 3:** `npx vite preview --host`，在同一局域网的平板或手机上打开 `http://<电脑IP>:4173`，逐项检查：
  - 戴镜确认流程；
  - 每日计划显示 5 个游戏；
  - 10 个游戏各玩一轮；
  - 休息提醒；
  - 时长锁定；
  - 家长门、校准、进度图。
- [ ] **Step 4:** 局域网 http 下不能注册 Service Worker，PWA 安装需要 HTTPS 或 localhost。如果需要“添加到主屏幕”，把 `dist/` 部署到任意 HTTPS 静态托管上。
- [ ] **Step 5:** `git commit -am "chore: pwa icons and release build"`
