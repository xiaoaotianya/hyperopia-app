import type { GameDefinition } from '../types'
import Game from './Game.vue'
import { MAX_LEVEL, contrast } from './logic'

export const game: GameDefinition = {
  id: 'stripe-balloon',
  name: '条纹气球',
  category: 'contrast',
  icon: '🎈',
  voiceIntro: '哪个气球上有条纹？点一点它。',
  durationSec: 150,
  levels: MAX_LEVEL,
  primaryMetric: { label: '条纹对比度', unit: '%', fromLevel: lv => +(contrast(lv) * 100).toFixed(1) },
  component: Game,
}
