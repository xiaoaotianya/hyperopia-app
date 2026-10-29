# 远视儿童视觉小游戏乐园 · 设计文档

日期：2026-10-29
状态：待用户审阅

## 1. 背景与目标

- 目标用户：3–5 岁、双眼高度远视（约 +7.00D）的儿童，已散瞳验光并佩戴足矫眼镜，无弱视、无斜视。
- 产品定位：**戴镜状态下**的近距离视觉功能训练与戴镜习惯养成工具。
  - 不宣称降低远视度数、不替代戴镜和医院复查。
- 形态：纯前端网页（PWA），在手机/平板浏览器打开，可“添加到主屏幕”全屏使用。
- 不需要任何道具（无反转拍、无红蓝眼镜）。
- 本期不做：调节训练（推进法/反转拍）、融像/双眼分视训练、账号与云同步、医生端。

成功标准：
1. 3–5 岁孩子在家长开启后，能在无文字阅读的情况下独立完成每日训练。
2. 每个游戏难度随表现自动调整，孩子成功率保持在约 75–80%。
3. 家长能看到戴镜打卡、每日训练时长、各游戏水平曲线。
4. 每日训练总时长受控（默认 12 分钟，可设 5–20 分钟）。

## 2. 训练内容：10 个小游戏，4 大类

所有游戏都在戴镜、距离屏幕约 40cm 的条件下进行。刺激尺寸用视角（角分）定义，经屏幕校准后换算成像素。

### A. 精细视觉（近距离细节分辨）
| ID | 名称 | 玩法 | 自适应参数 |
|---|---|---|---|
| `find-bug` | 🐞 找小瓢虫 | 一群相似图案中点出唯一不同的那只 | 图案尺寸 ↓、间距 ↓（拥挤度 ↑）、差异程度 ↓、干扰数 ↑ |
| `twin-cards` | 🃏 双胞胎配对 | 3–6 张卡片中找出两张完全一样的 | 卡片数 ↑、细节差异 ↓、图案尺寸 ↓ |
| `puzzle-gap` | 🧩 补缺口 | 图形缺一块，从 2–4 个候选中选出能补上的 | 候选数 ↑、候选间形状差异 ↓ |

### B. 对比敏感度（知觉学习）
| ID | 名称 | 玩法 | 自适应参数 |
|---|---|---|---|
| `stripe-balloon` | 🎈 条纹气球 | 两个气球中点出有条纹（Gabor 光栅）的那个 | 对比度 ↓（对数步长）；空间频率在 2–8 c/deg 中按轮次轮换 |
| `fog-star` | ⭐ 雾里找星星 | 灰色雾背景中淡淡出现一个星星，点中它 | 目标对比度 ↓、目标尺寸 ↓ |

### C. 眼球运动（追随与跳视）
| ID | 名称 | 玩法 | 自适应参数 |
|---|---|---|---|
| `chase-butterfly` | 🦋 追蝴蝶 | 蝴蝶在随机位置出现，看到就点 | 出现位置离中心更远、停留时长 ↓、尺寸 ↓ |
| `little-train` | 🚂 小火车 | 小火车沿曲线轨道慢慢开，车厢变成星星时点它 | 速度 ↑、轨道复杂度 ↑ |
| `whack-mole` | 🐹 打地鼠 | 多个洞中地鼠冒头，点中戴帽子的那只，不点没帽子的 | 冒头时长 ↓、洞数 ↑、帽子与无帽差异 ↓ |

### D. 手眼协调 / 视觉记忆
| ID | 名称 | 玩法 | 自适应参数 |
|---|---|---|---|
| `maze-path` | ✏️ 送小兔回家 | 手指沿小路把小兔拖回家，出界要退回 | 路宽 ↓、弯道数 ↑ |
| `light-dots` | ✨ 点亮小灯 | 小灯按顺序闪亮（无闪烁，柔和亮起），按同样顺序点 | 灯数 ↑、序列长度 ↑ |

### 每日训练计划
- 每天从 10 个游戏中自动挑 4–5 个，每个约 2–3 分钟，总时长不超过设置的上限。
- 挑选规则：4 大类各至少 1 个；优先选最近玩得少的；同一游戏不连续两天出现，除非可选游戏不够。
- 孩子也可以在“游戏乐园”里自选，但仍计入每日总时长。

## 3. 交互设计（3–5 岁）

- 全程中文语音引导，用 Web Speech API 的 `zh-CN` 朗读。语音不可用时，用大图标加动画提示。
- 不依赖识字：说明用“示范动画 + 语音”。
- 点击目标的触控区域至少 64px；推荐平板横屏，手机竖屏也可用。
- 反馈：答对时出现星星动画和清脆音效；答错只轻轻晃一下，不扣分、不出现负面提示。
- 奖励：每完成一个游戏得 1 枚贴纸，贴纸墙可以浏览。连续戴镜打卡解锁新的角色皮肤。
- 每 5 分钟弹出“看看远处、眨眨眼”的休息动画（20 秒），可以由家长跳过。
- 每日时长用完后显示“今天练完啦”页面，游戏入口锁定到第二天。
- 视觉安全：无闪烁刺激；所有动画频率都低于 3Hz；页面背景使用中灰或柔和色，不用纯白。

## 4. 家长区

- 入口设有“家长门”：一道 3–5 岁孩子做不出来的两位数加法题（例如 23 + 18）。
- **训练前确认**：每天第一次开始时问“宝宝戴好眼镜了吗？”。家长点“戴好了”才能开始，同时计入戴镜打卡。
- **戴镜打卡日历**：显示当月每天是否打卡，以及连续天数。
- **进度**：
  - 每天的训练时长（柱状图）；
  - 每个游戏的水平曲线（折线图）：纵轴是游戏的主参数，例如能分辨的最小尺寸（角分）或最低对比度（%）。
- **设置**：
  - 每日时长上限；
  - 孩子昵称和头像；
  - 复查提醒日期（默认每 3 个月）；
  - 屏幕校准；
  - 导出或清空数据（导出为 JSON 文件）。
- **声明页**：说明本工具不能降低远视度数，不能代替戴镜和医院复查；有不适要停止使用并就医。

## 5. 屏幕校准

- 首次使用时，家长把一张银行卡（ISO/IEC 7810 ID-1 标准，宽 85.60mm）贴在屏幕上，拖动滑块让屏幕上的矩形与卡片等宽，得到 `pxPerMm`。
- 观看距离默认 400mm，可在设置里改。界面提示“大约一只小手臂的距离”。
- 换算公式：`尺寸(mm) = 2 × 距离(mm) × tan(视角 / 2)`，再乘以 `pxPerMm` 得到像素。
- 未校准时按 `devicePixelRatio` 估算，并在家长区提示“尚未校准”。

## 6. 自适应难度

- 每个游戏有一个主难度参数，用“3 下 1 上”阶梯法调整：连对 3 次难度升一级，错 1 次降一级。这个规则收敛在约 79% 的正确率，既能维持挑战，也不容易挫败孩子。
- 步长：开始时用大步长，难度方向反转 2 次后改用小步长。对比度类参数在对数尺度上调整。
- 次要参数（例如干扰数、速度）随主参数的等级联动，由各游戏自己定义映射。
- 每个游戏的当前等级都持久保存，下次接着上次的水平开始。为了热身，开始时先回退 2 级。
- 对比度下限受屏幕 8 位色深限制：最低约 1% 对比度，这在文档和界面中都要注明。

## 7. 技术架构

技术栈：Vite + Vue 3 + TypeScript。用 Vue Router 管理页面，Canvas 2D 绘制视觉刺激，vite-plugin-pwa 实现 PWA，Vitest 做单元测试。图表用轻量的手写 SVG，不引入图表库。

```
src/
  core/
    staircase.ts      # 阶梯法：纯函数，输入当前状态和本次结果，输出新状态
    calibration.ts    # 视角与像素互相换算，读写 pxPerMm
    storage.ts        # localStorage 封装，带 schema 版本号；不可用时退回内存存储
    speech.ts         # 语音朗读封装，可检测是否可用
    dailyPlan.ts      # 每日游戏挑选（纯函数，传入日期作为种子）
    sessionTimer.ts   # 每日时长累计、休息提醒、锁定判断
    rewards.ts        # 贴纸和打卡奖励
    sound.ts          # Web Audio 短音效
  games/
    types.ts          # GameDefinition 接口
    registry.ts       # 10 个游戏的注册表
    find-bug/ twin-cards/ puzzle-gap/ stripe-balloon/ fog-star/
    chase-butterfly/ little-train/ whack-mole/ maze-path/ light-dots/
      index.ts        # 导出 GameDefinition
      Game.vue        # 游戏界面
      logic.ts        # 出题和判定的纯函数（可测试）
  components/
    GameShell.vue     # 统一流程：语音说明 → 示范 → 计时进行 → 结束 → 发奖励
    BreakOverlay.vue  ParentGate.vue  StickerBurst.vue  BigButton.vue
  views/
    KidHome.vue  TodayPlan.vue  GamePark.vue  GameRunner.vue  StickerWall.vue  DoneToday.vue
    parent/ ParentHome.vue  Progress.vue  Checkin.vue  Settings.vue  Calibration.vue  Disclaimer.vue
```

### GameDefinition 接口

```ts
interface GameDefinition {
  id: string
  name: string            // 中文名称
  category: 'fine' | 'contrast' | 'eye-move' | 'hand-eye'
  icon: string            // emoji 或 SVG
  voiceIntro: string      // 开场语音文案
  durationSec: number     // 一轮的默认时长（120–180 秒）
  levels: number          // 难度等级数
  primaryMetric: { label: string; unit: string; fromLevel(level: number): number }
  component: Component    // props: level, ctx（换算、音效、语音）; emits: trial(correct), finish
}
```

### 数据模型

数据保存在 localStorage 的 `hyperopia.v1` 键下：

```ts
{
  version: 1,
  profile: { nickname, avatar },
  settings: { dailyLimitMin: 12, viewingDistanceMm: 400, recheckDate, breakEveryMin: 5 },
  calibration: { pxPerMm: number | null },
  games: { [id]: { level, staircase: {...}, history: [{ date, levelEnd, trials, correct }] } },
  days: { 'YYYY-MM-DD': { glassesOn: boolean, secondsTrained, gamesPlayed: string[], plan: string[] } },
  stickers: string[]
}
```

### 数据流

1. 进入 KidHome。如果今天还没确认戴镜，就进入家长确认页。
2. 由 dailyPlan 生成今天的计划，进入 TodayPlan。
3. 选一个游戏，进入 GameRunner，加载 GameShell 和游戏组件。
4. 游戏组件每完成一次判定就发出 `trial` 事件，GameShell 交给 staircase 更新等级，再写入 storage。
5. sessionTimer 累计训练时长，触发休息提醒，时长用完时跳转到 DoneToday。

## 8. 错误处理

- localStorage 不可用（例如无痕模式）：退回内存存储，并在顶部提示“本次进度不会保存”。
- 语音不可用：显示大图标和动画说明，并在家长区提示设备不支持语音。
- 手机竖屏下，某些游戏需要横屏时，显示“请把平板横过来”的动画。
- 页面切到后台时，暂停计时和游戏。
- 存储数据的版本号不匹配时，走迁移函数；迁移失败就备份旧数据再重置，不让页面崩溃。

## 9. 测试

- **单元测试（Vitest）：**
  - staircase：收敛方向、步长切换、等级上下限；
  - calibration：换算公式；
  - dailyPlan：分类覆盖、不连续重复、同一种子结果确定；
  - sessionTimer：累计、锁定、休息提醒；
  - storage：内存退回、版本迁移；
  - 每个游戏的 logic.ts：出题合法，只有一个正确答案。
- **手动测试：**
  - 设备：iPad Safari、安卓平板 Chrome、手机竖屏；
  - 银行卡校准；
  - 断网后 PWA 能否打开；
  - 语音朗读。

## 10. 分期

- **第一期（本文档范围）：** 完整的框架、全部 10 个游戏、家长区、PWA。
- **第二期（以后再做）：**
  - 摄像头检测是否戴镜、测量观看距离；
  - 红蓝眼镜融像和双眼分视模块；
  - 云同步和医生端。
