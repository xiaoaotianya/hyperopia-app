import type { GameDefinition } from '../types'
import Game from './Game.vue'
import { DETAIL_LEVEL, MAX_LEVEL, rotationDeg } from './logic'

export const game: GameDefinition = {
  id: 'shadow-match',
  name: '影子配对',
  category: 'hand-eye',
  icon: '🧩',
  voiceIntro: '把小动物拖到和它一模一样的影子里。',
  durationSec: 150,
  levels: MAX_LEVEL,
  // 第 10 级起差异变成镜像或缺少小部件，不再是旋转角度，记为 0°
  primaryMetric: { label: '影子差异', unit: '度', fromLevel: lv => (lv < DETAIL_LEVEL ? rotationDeg(lv) : 0) },
  component: Game,
}
