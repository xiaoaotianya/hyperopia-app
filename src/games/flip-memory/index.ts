import type { GameDefinition } from '../types'
import Game from './Game.vue'
import { MAX_LEVEL, pairCount } from './logic'

export const game: GameDefinition = {
  id: 'flip-memory',
  name: '翻翻乐',
  category: 'hand-eye',
  icon: '🧠',
  voiceIntro: '先记住卡片在哪里，再翻开两张一样的。',
  durationSec: 150,
  levels: MAX_LEVEL,
  primaryMetric: { label: '配对数', unit: '对', fromLevel: lv => pairCount(lv) },
  component: Game,
}
