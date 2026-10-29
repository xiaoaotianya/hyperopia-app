# P0 家庭视觉管理 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在现有 PWA 上增加戴镜依从性、左右眼近视力自测、异常信号观察、复查与处方档案、提醒中心和数据安全功能，全部纯前端实现。

**Architecture:** 新逻辑全部写成 `src/core/` 下的纯函数，用 Vitest 做 TDD。界面放在家长区的新页面里，孩子端只改首页。数据结构升级为 v2，存储键 `hyperopia.v1` 保持不变。

**Tech Stack:** 与现有项目相同：Vue 3.5、TypeScript、Vite 5、Vitest、Canvas 2D。

**Spec:** `docs/superpowers/specs/2026-10-29-p0-vision-care-design.md`（下文用"§章节号"引用其中的章节）

**约定：**
- 日期统一用 `YYYY-MM-DD` 字符串。"今天"一律作为参数传入纯函数，便于测试。
- 新增的 id 用 `Date.now().toString(36) + Math.random().toString(36).slice(2, 6)` 生成。
- 每个批次完成后，必须同时满足 `npm test` 全部通过、`npm run build` 成功。
- 子代理不执行任何 git 命令，由控制者统一提交。

---

## Batch 1：核心模块（纯函数 + 测试）

### Task 1.1 数据模型 v2 与迁移 — `src/core/storage.ts`
- 按 spec §8 加入类型：`WearLevel`、`AcuityTrial`、`EyeResult`、`AcuityTest`、`Freq`、`Checklist`、`Observation`、`EyeRx`、`Visit`。`DayRecord` 增加 `wear?`，`profile` 增加 `birthMonth`，新增 `meta`。
- `AppData.version` 改为 `2`；`defaultData()` 补齐新字段，新数组为空，`meta: { lastBackupAt: null, persisted: null }`。
- `migrate(raw)`：v0、v1 和缺字段的数据，都补齐为 v2，并保留原有数据。导出 `migrate`，供导入备份使用。
- 测试 `tests/core/storage.test.ts`：
  - 改写原有用例，使之适配 v2；
  - 新增"v1 数据迁移后保留 days、games、stickers，新字段为默认值"；
  - 新增"`profile.birthMonth` 缺失时为 null"。
- `src/core/store.ts` 里的 `today()`：创建当天记录时不写 `wear`。

### Task 1.2 戴镜统计 — `src/core/wear.ts`
```ts
export const WEAR_LABELS: Record<WearLevel, string>   // 全天 / 大半天 / 少于一半 / 没戴
export const isGoodDay = (w?: WearLevel) => w === 'full' || w === 'most'
export function goodStreak(days: Record<string, DayRecord>, today: string): number   // 今天未记录则从昨天数起
export function lastNDays(days: Record<string, DayRecord>, today: string, n: number): { date: string; wear?: WearLevel }[]
export function weekGoodCount(days: Record<string, DayRecord>, today: string): number  // 近 7 天（含今天）
export function treeState(days: Record<string, DayRecord>): { leaves: number; flowers: number; fruits: number }
  // leaves = 达标天总数；flowers = floor(leaves/7)；fruits = floor(leaves/30)
export const STREAK_BADGES = [3, 7, 14, 30] as const
export function newBadges(prevStreak: number, streak: number): number[]  // 本次刚跨过的里程碑
```
- 测试 `tests/core/wear.test.ts`，覆盖：
  - 连续天数：今天未记录、中间有断档、`less` 不算达标；
  - 近 7 天的边界；
  - 小树数量；
  - 里程碑跨越。

### Task 1.3 月龄与参考线 — `src/core/ageNorms.ts`
```ts
export function ageMonths(birthMonth: string | null, today: string): number | null  // 按月计算，不满 1 个月不计
export function ageThresholdLogmar(months: number | null): number | null
  // <36 → null；36–47 → 0.4；48–59 → 0.3；>=60 → 0.2
export const logmarToDecimal = (l: number) => +Math.pow(10, -l).toFixed(2)
```
- 测试：月龄计算，以及 35、36、47、48、59、60 个月这些边界值。

### Task 1.4 视力自测逻辑 — `src/core/acuity.ts`
```ts
export const LEVELS = [1.0, 0.9, 0.8, 0.7, 0.6, 0.5, 0.4, 0.3, 0.2, 0.1, 0.0]
export const SYMBOLS = ['apple', 'house', 'circle', 'square'] as const
export const TRIALS_PER_LEVEL = 3, PASS_COUNT = 2, MIN_DEVICE_PX = 10
export const optotypeArcmin = (logmar: number) => 5 * Math.pow(10, logmar)
export function optotypeCssPx(logmar: number, distanceMm: number, pxPerMm: number): number
export function bestMeasurable(distanceMm: number, pxPerMm: number, dpr: number): number
  // 满足 optotypeCssPx*dpr >= MIN_DEVICE_PX 的最小 logMAR；连 1.0 都不满足时返回 1.0
export function startLevel(prev: number | null | undefined, best: number): number
  // 上次结果为 null 或 undefined → 0.7；否则为 min(1.0, prev + 0.2)；结果不能小于 best；按 0.1 网格取整

// 单眼阶梯流程状态机（纯函数）
export interface EyeRun {
  level: number; best: number
  trialsAtLevel: { symbol: string; correct: boolean }[]
  passed: number[]; failed: number[]           // 已判定通过 / 不通过的档位
  allTrials: AcuityTrial[]; done: boolean; result: number | null
}
export function startEye(start: number, best: number): EyeRun
export function nextSymbol(run: EyeRun, rng: () => number): string  // 随机，且不与本档上一题相同
export function answerEye(run: EyeRun, symbol: string, answer: string | 'unseen'): EyeRun
```
`answerEye` 的规则：
- 每档 3 题，判定后：
  - **通过**：如果已经是 `best` 档，或者更小一档已判定不通过，就结束，结果取本档；否则进入更小一档。
  - **不通过**：
    - 已经在 1.0 档：结束，`result = null`；
    - 更大一档已判定通过：结束，结果取更大一档；
    - 否则进入更大一档。
- 同一档不重复测，避免死循环。

```ts
export function flagsFor(od: number | null, os: number | null, prev: { od: number | null; os: number | null } | null, ageMonths: number | null): AcuityTest['flags']
  // null 视为 1.1，参与比较
  // below-age：任一眼差于年龄参考线（即 logMAR 更大）
  // interocular：两眼 logMAR 差 >= 0.2（用 Math.round(x*10) 比较，避免浮点误差）
  // decline：任一眼比上次差 >= 0.2
export function needsRecheck(tests: AcuityTest[], today: string): 'none' | 'retest' | 'see-doctor'
  // 最近一次无 flags → none
  // 有 flags，且 14 天内的前一次也有 flags → see-doctor
  // 否则 → retest
```
- 测试 `tests/core/acuity.test.ts`，覆盖：
  - 尺寸：logMAR 0 在 400mm 处视标约 0.58mm；
  - `bestMeasurable` 在 pxPerMm=4、dpr=1 和 pxPerMm=6.4、dpr=3 两种情况下的结果；
  - `startLevel`：首次测、有上次结果、不小于 best；
  - 状态机：一路通过到 best；在 0.3 不通过后回到 0.4 通过，结果为 0.4；1.0 不通过时结果为 null；同一档不重复测；"看不清"算错；
  - `nextSymbol` 不连续重复；
  - `flagsFor` 三种 flag 的触发边界；
  - `needsRecheck` 三种返回值。

### Task 1.5 提醒中心 — `src/core/alerts.ts`
```ts
export type AlertLevel = 'red' | 'yellow' | 'gray'
export interface Alert { id: string; level: AlertLevel; text: string; to: string }
export function computeAlerts(d: AppData, today: string, env: { persistent: boolean; speech: boolean }): Alert[]
```
- 提醒条目按 spec §6，结果按 red、yellow、gray 的顺序排序。
- 下次复查日期的取法：最近一条 `visits` 记录的 `nextDate`，没有记录时退回 `settings.recheckDate`。
- 文案用中文，不写诊断性措辞。各条提醒跳转的页面：复查相关 → `/parent/visits`；自测 → `/parent/acuity`；观察 → `/parent/observe`；戴镜 → `/parent/checkin`；备份 → `/parent/settings`；校准 → `/parent/calibration`。
- 观察清单的"重点信号"：取最近一份 checklist，其中 `eso-off`、`eso-on`、`one-eye` 三项任一为 `sometimes` 或 `often`，并且这份清单在 30 天内。
- 测试：覆盖每一种提醒的触发和不触发，以及 14、28、30 天的边界。

### Task 1.6 观察清单定义 — `src/core/checklist.ts`
```ts
export const CHECK_ITEMS: { id: string; text: string; key: boolean }[]
  // 8 项，按 spec §4.1 的顺序，id 依次为：
  // eso-off, eso-on, squint, rub, close, one-eye, refuse, clumsy
  // 第 1、2、6 项（eso-off、eso-on、one-eye）key: true
export function checklistFindings(c: Checklist): { key: string[]; often: string[] }
```
- 测试：重点项和"经常"项的提取。

### Task 1.7 日历文件 — `src/core/ics.ts`
```ts
export function recheckIcs(date: string, title?: string): string
  // VCALENDAR / VEVENT 全天事件（DTSTART;VALUE=DATE、DTEND 为次日）
  // 含 VALARM，TRIGGER:-P1D；行尾用 \r\n；UID 唯一；DTSTAMP 为 UTC
export function downloadText(filename: string, text: string, mime: string): void  // 浏览器下载（Blob）
```
- 测试：包含必需的字段，日期格式为 `YYYYMMDD`，DTEND 为次日，跨月和跨年的日期也正确。

### Task 1.8 备份导入 — `src/core/backup.ts`
```ts
export const backupFilename = (today: string) => `视觉乐园备份-${today}.json`
export function parseBackup(text: string): { ok: true; data: AppData; summary: { days: number; tests: number; visits: number; stickers: number } } | { ok: false; error: string }
  // 先 JSON.parse；必须是对象，并且至少包含 days、games、stickers 之一，否则视为无效；然后走 migrate
export async function requestPersist(): Promise<boolean | null>  // 浏览器不支持时返回 null
```
- 测试：有效的 v1 和 v2 备份、无效的 JSON、不相关的 JSON，以及 summary 的计数。

---

## Batch 2：戴镜依从性与提醒中心界面（依赖 Batch 1）

文件：
- `src/components/WearPicker.vue`
- `src/components/GlassesTree.vue`
- `src/components/AlertList.vue`
- 修改：`src/views/KidHome.vue`、`src/views/parent/ParentHome.vue`、`src/views/parent/Checkin.vue`、`src/views/parent/Settings.vue`、`src/App.vue`（或 `main.ts`）

- **WearPicker**：4 个大按钮，带 emoji 和文字（👓 全天、🙂 大半天、😐 少于一半、🚫 没戴）。props 为 `{ date }`，点击后写入 `store.days[date].wear`，记录不存在时先创建。选中的档位高亮。
- **GlassesTree**：用 SVG 绘制一棵小树，叶子、花、果的数量来自 `treeState`，尺寸适配孩子首页。新长出的叶子有一次性的生长动画。
- **KidHome**：
  - 加入小树；
  - 18:00 以后，如果今天没有 `wear` 记录，显示横幅"家长：记录今天戴镜情况 👓"，点击跳到 `/parent`；
  - 首次进入时，如果当前连续达标天数刚跨过 3、7、14、30 天的里程碑，就发放"眼镜小勇士"贴纸（`👓🏅` 之类，加入 `store.stickers`），并语音祝贺。用 `store.meta` 里新增的 `lastBadgeStreak` 记录，防止重复发放。如果 Task 1.1 没有这个字段，在 Batch 2 里补上，同时补迁移和测试。
- **ParentHome 改为仪表盘**（spec §6），从上到下：
  - 今天戴镜情况（WearPicker）；
  - AlertList（`computeAlerts`）；
  - 概览卡片：连续达标天数、最近一次自测、下次复查、本周训练分钟数；
  - 菜单：加入视力自测、观察记录、复查档案、医生报告的入口，路由由控制者添加。
- **Checkin**：日历按档位上色，图例为 4 色加"未记录"空心。点最近 7 天内的任一天，弹出 WearPicker 补录；显示连续达标天数和本周达标天数。
- **Settings**：
  - 出生年月（`input type=month`）；
  - "从备份恢复"：选择文件 → `parseBackup` → 预览摘要 → 确认后覆盖 store；
  - 导出时记录 `meta.lastBackupAt`，文件名用 `backupFilename`；
  - 显示持久化存储状态；
  - iOS 且不是从主屏幕打开时，显示"添加到主屏幕"引导。
- **App 启动**：调用一次 `requestPersist()`，结果写入 `store.meta.persisted`。
- 测试：WearPicker 写入档位；ParentHome 在空数据下能渲染，并显示提醒；更新 `tests/components/views.test.ts` 中受影响的断言。

## Batch 3：视力自测界面（依赖 Batch 1，可与 Batch 2、4 并行）

文件：
- `src/components/LeaSymbol.vue`
- `src/views/parent/Acuity.vue`
- `src/views/parent/AcuityTest.vue`

- **LeaSymbol**：Canvas 绘制苹果、房子、圆、方 4 种视标，高度 = `optotypeCssPx`，按 dpr 缩放。笔画宽度约为视标高的 1/5，四周带拥挤框（间距 0.5 个视标宽、线宽为 1 个笔画宽）。黑色视标、白色背景。这是视力测试，用高对比度是有意的。props 为 `{ symbol, cssPx, crowded }`。同一组件也用来画作答按钮上的大图标（固定 64px，不加拥挤框）。
- **AcuityTest** 流程（spec §3.2）：
  - 未校准时，引导去 `/parent/calibration`；
  - 准备页：戴镜、光线、40cm 示意；
  - 右眼遮挡指引 → 2 题练习（1.0 档）→ 正式测试（状态机）→ 换眼 → 左眼 → 结果页；
  - 作答区：4 个大符号按钮加一个"看不清"按钮；
  - 页面切到后台时暂停，回来后询问"继续"还是"重新开始"；中途退出不保存；
  - 结束时生成 `AcuityTest` 记录，包括 `flagsFor`、`ageMonths`、`bestMeasurableLogmar`，然后跳到结果页；
  - 结果页显示两眼的小数视力和 logMAR、与上次的对比、`needsRecheck` 对应的提示，以及"1 周后重测"的提示文案。
- **Acuity 首页**：
  - "开始自测"按钮；
  - 趋势图：手写 SVG，两条折线（右眼 OD、左眼 OS），纵轴为 logMAR 1.0 到 0.0，刻度标小数视力；如果填了出生年月，画一条年龄参考虚线；
  - 历史列表，可以展开看每档的作答明细；
  - 底部说明：家庭自测仅供参考，参考线来自 AAPOS 远视力筛查标准。
- 测试：用组件测试走完一遍流程（mock rng），确认写入了 `store.acuityTests`。

## Batch 4：观察、复查档案与报告界面（依赖 Batch 1，可与 Batch 2、3 并行）

文件：
- `src/views/parent/Observe.vue`
- `src/views/parent/Visits.vue`
- `src/views/parent/Report.vue`

- **Observe**：
  - 月度清单：8 项，每项 3 个选项，提交后写入 `store.checklists`；如有重点信号，显示建议就医的提示；
  - "我发现了异常"表单：多选清单项加备注，写入 `store.observations`；
  - 眼位小检查的图文指引（spec §4.2），可折叠，用 SVG 示意图画出正常与内斜时的反光点位置；
  - 时间线：清单和随时记录合并，按日期倒序。
- **Visits**：
  - 时间线卡片，顶部是"当前处方"；与上次相比度数变化 ≥ 0.50D 时高亮；
  - 新增和编辑表单：字段按 spec §5.1；度数输入框步长 0.25，带正负号；"下次复查日期"有 3 个月、6 个月快捷按钮；
  - 校验规则按 spec §10；
  - 每条记录都有"加入日历"按钮：`recheckIcs(nextDate)` 加 `downloadText`，文件扩展名 `.ics`，类型 `text/calendar`；
  - 可以删除记录，删除前二次确认。
- **Report**：
  - 可选统计范围 1、3、6 个月，默认 3 个月；内容按 spec §5.4；
  - 训练概况用通俗的话描述：对每个有历史记录的游戏，比较区间内第一条和最后一条的 `primaryMetric`，按 4 类分别汇总进步百分比，只写"进步"或"保持"，不写退步；
  - 打印样式 `@media print`：隐藏头部、按钮和导航，A4 纵向，避免卡片被分页截断；
  - "打印 / 保存为 PDF"按钮调用 `window.print()`。
- 测试：Visits 新增一条记录，确认写入并能显示；Report 在有数据和空数据两种情况下都能渲染。

## Batch 5（控制者）：集成、审查与提交
- 在 `src/router.ts` 注册 5 个新路由，都带 `meta.parent`。
- 运行全部测试和构建，然后派独立代理做代码审查，并在两种尺寸下真机检查：自测全流程、报告打印预览、导入导出、`.ics` 文件。
- 更新 README 的功能说明，然后提交并推送。
