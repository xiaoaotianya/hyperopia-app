import type { GameDefinition } from '../types'
import Game from './Game.vue'
import { MAX_LEVEL, speed } from './logic'

export const game: GameDefinition = {
  id: 'little-train',
  name: '小火车',
  category: 'eye-move',
  icon: '🚂',
  voiceIntro: '小火车上出现星星时，赶快点它！',
  durationSec: 150,
  levels: MAX_LEVEL,
  primaryMetric: { label: '火车速度', unit: '圈/分', fromLevel: lv => +(speed(lv) * 60).toFixed(1) },
  component: Game,
}
