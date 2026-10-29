import type { GameDefinition } from '../types'
import Game from './Game.vue'
import { MAX_LEVEL, sizeArcmin } from './logic'

export const game: GameDefinition = {
  id: 'fish-direction',
  name: '小鱼游哪边',
  category: 'fine',
  icon: '🐟',
  voiceIntro: '中间的小鱼往哪边游？点一点那个箭头。',
  durationSec: 150,
  levels: MAX_LEVEL,
  primaryMetric: { label: '小鱼大小', unit: '角分', fromLevel: lv => +sizeArcmin(lv).toFixed(1) },
  component: Game,
}
