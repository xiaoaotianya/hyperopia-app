import type { GameDefinition } from './types'
import { game as findBug } from './find-bug'
import { game as twinCards } from './twin-cards'
import { game as puzzleGap } from './puzzle-gap'
import { game as stripeBalloon } from './stripe-balloon'
import { game as fogStar } from './fog-star'
import { game as chaseButterfly } from './chase-butterfly'
import { game as littleTrain } from './little-train'
import { game as whackMole } from './whack-mole'
import { game as mazePath } from './maze-path'
import { game as lightDots } from './light-dots'

export const GAMES: GameDefinition[] = [
  findBug, twinCards, puzzleGap,
  stripeBalloon, fogStar,
  chaseButterfly, littleTrain, whackMole,
  mazePath, lightDots,
]

export function getGame(id: string): GameDefinition | undefined {
  return GAMES.find(g => g.id === id)
}
