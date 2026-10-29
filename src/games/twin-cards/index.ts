import type { GameDefinition } from '../types'
import Game from './Game.vue'
import { MAX_LEVEL, cellArcmin } from './logic'

export const game: GameDefinition = {
  id: 'twin-cards',
  name: '双胞胎配对',
  category: 'fine',
  icon: '🃏',
  voiceIntro: '找出两张一模一样的卡片。',
  durationSec: 150,
  levels: MAX_LEVEL,
  primaryMetric: { label: '图案格子', unit: '角分', fromLevel: lv => +cellArcmin(lv).toFixed(1) },
  component: Game,
}
