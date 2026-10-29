import type { GameDefinition } from '../types'
import Game from './Game.vue'
import { MAX_LEVEL, gridSize } from './logic'

export const game: GameDefinition = {
  id: 'copy-pattern',
  name: '照样子摆',
  category: 'hand-eye',
  icon: '🔷',
  voiceIntro: '看上面的样子，在下面点亮一样的格子。',
  durationSec: 150,
  levels: MAX_LEVEL,
  primaryMetric: { label: '网格格数', unit: '格', fromLevel: lv => gridSize(lv) ** 2 },
  component: Game,
}
