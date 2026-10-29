import type { GameDefinition } from '../types'
import Game from './Game.vue'
import { MAX_LEVEL, itemArcmin } from './logic'

export const game: GameDefinition = {
  id: 'torch-search',
  name: '小手电找东西',
  category: 'fine',
  icon: '🔦',
  voiceIntro: '看看上面要找什么，在下面找到它，点一点！',
  durationSec: 150,
  levels: MAX_LEVEL,
  primaryMetric: { label: '物件大小', unit: '角分', fromLevel: lv => +itemArcmin(lv).toFixed(1) },
  component: Game,
}
