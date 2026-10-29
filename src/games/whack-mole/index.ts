import type { GameDefinition } from '../types'
import Game from './Game.vue'
import { MAX_LEVEL, hatArcmin } from './logic'

export const game: GameDefinition = {
  id: 'whack-mole',
  name: '打地鼠',
  category: 'eye-move',
  icon: '🐹',
  voiceIntro: '只打戴帽子的小地鼠哦！',
  durationSec: 150,
  levels: MAX_LEVEL,
  primaryMetric: { label: '小帽子大小', unit: '角分', fromLevel: lv => +hatArcmin(lv).toFixed(1) },
  component: Game,
}
