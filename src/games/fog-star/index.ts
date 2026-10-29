import type { GameDefinition } from '../types'
import Game from './Game.vue'
import { MAX_LEVEL, starContrast } from './logic'

export const game: GameDefinition = {
  id: 'fog-star',
  name: '雾里找星星',
  category: 'contrast',
  icon: '⭐',
  voiceIntro: '雾里藏着一颗星星，找到它！',
  durationSec: 150,
  levels: MAX_LEVEL,
  primaryMetric: { label: '星星对比度', unit: '%', fromLevel: lv => +(starContrast(lv) * 100).toFixed(1) },
  component: Game,
}
