import type { GameDefinition } from '../types'
import Game from './Game.vue'
import { MAX_LEVEL, angleDiff } from './logic'

export const game: GameDefinition = {
  id: 'puzzle-gap',
  name: '补缺口',
  category: 'fine',
  icon: '🧩',
  voiceIntro: '哪一块能把饼干补好？',
  durationSec: 150,
  levels: MAX_LEVEL,
  primaryMetric: { label: '方向差', unit: '度', fromLevel: angleDiff },
  component: Game,
}
