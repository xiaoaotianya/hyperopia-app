import type { GameDefinition } from '../types'
import Game from './Game.vue'
import { MAX_LEVEL, sizeArcmin } from './logic'

export const game: GameDefinition = {
  id: 'find-bug',
  name: '找小瓢虫',
  category: 'fine',
  icon: '🐞',
  voiceIntro: '找一找，哪只小瓢虫和别的不一样？',
  durationSec: 150,
  levels: MAX_LEVEL,
  primaryMetric: { label: '瓢虫大小', unit: '角分', fromLevel: lv => +sizeArcmin(lv).toFixed(1) },
  component: Game,
}
