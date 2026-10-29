import type { GameDefinition } from '../types'
import Game from './Game.vue'
import { MAX_LEVEL, seqLength } from './logic'

export const game: GameDefinition = {
  id: 'light-dots',
  name: '点亮小灯',
  category: 'hand-eye',
  icon: '✨',
  voiceIntro: '看小灯亮的顺序，然后照着点一遍。',
  durationSec: 150,
  levels: MAX_LEVEL,
  primaryMetric: { label: '记住的灯数', unit: '个', fromLevel: seqLength },
  component: Game,
}
