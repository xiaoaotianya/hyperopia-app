import type { GameDefinition } from '../types'
import Game from './Game.vue'
import { MAX_LEVEL, contrast } from './logic'

export const game: GameDefinition = {
  id: 'moon-shapes',
  name: '月光下的形状',
  category: 'contrast',
  icon: '🌙',
  voiceIntro: '月光下藏着一个形状，它是哪一个？',
  durationSec: 150,
  levels: MAX_LEVEL,
  primaryMetric: { label: '形状对比度', unit: '%', fromLevel: lv => +(contrast(lv) * 100).toFixed(1) },
  component: Game,
}
