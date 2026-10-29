import type { GameDefinition } from '../types'
import Game from './Game.vue'
import { MAX_LEVEL, widthArcmin } from './logic'

export const game: GameDefinition = {
  id: 'maze-path',
  name: '送小兔回家',
  category: 'hand-eye',
  icon: '✏️',
  voiceIntro: '沿着小路，把小兔送回家。',
  durationSec: 150,
  levels: MAX_LEVEL,
  primaryMetric: { label: '小路宽度', unit: '角分', fromLevel: lv => +widthArcmin(lv).toFixed(1) },
  component: Game,
}
