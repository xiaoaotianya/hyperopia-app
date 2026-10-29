import type { GameDefinition } from '../types'
import Game from './Game.vue'
import { MAX_LEVEL, contrast } from './logic'

export const game: GameDefinition = {
  id: 'bubble-stripes',
  name: '泡泡条纹',
  category: 'contrast',
  icon: '🫧',
  voiceIntro: '泡泡里的条纹是什么方向？点一样的那个按钮。',
  durationSec: 150,
  levels: MAX_LEVEL,
  primaryMetric: { label: '条纹对比度', unit: '%', fromLevel: lv => +(contrast(lv) * 100).toFixed(1) },
  component: Game,
}
