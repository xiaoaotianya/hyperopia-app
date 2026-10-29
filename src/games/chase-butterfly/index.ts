import type { GameDefinition } from '../types'
import Game from './Game.vue'
import { MAX_LEVEL, dwellMs } from './logic'

export const game: GameDefinition = {
  id: 'chase-butterfly',
  name: '追蝴蝶',
  category: 'eye-move',
  icon: '🦋',
  voiceIntro: '蝴蝶飞来啦，看到就点它！',
  durationSec: 150,
  levels: MAX_LEVEL,
  primaryMetric: { label: '反应时间', unit: '毫秒', fromLevel: dwellMs },
  component: Game,
}
