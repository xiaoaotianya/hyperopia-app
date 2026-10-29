import type { GameDefinition } from '../types'
import Game from './Game.vue'
import { MAX_LEVEL, padsPerRow } from './logic'

export const game: GameDefinition = {
  id: 'frog-lilypads',
  name: '青蛙跳荷叶',
  category: 'eye-move',
  icon: '🐸',
  voiceIntro: '小青蛙跳到哪片荷叶上，就快点哪一片。',
  durationSec: 150,
  levels: MAX_LEVEL,
  primaryMetric: { label: '每行荷叶数', unit: '片', fromLevel: lv => padsPerRow(lv) },
  component: Game,
}
