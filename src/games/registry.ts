import type { GameDefinition } from './types'
import { game as findBug } from './find-bug'
import { game as twinCards } from './twin-cards'
import { game as puzzleGap } from './puzzle-gap'
import { game as fishDirection } from './fish-direction'
import { game as torchSearch } from './torch-search'
import { game as stripeBalloon } from './stripe-balloon'
import { game as fogStar } from './fog-star'
import { game as bubbleStripes } from './bubble-stripes'
import { game as moonShapes } from './moon-shapes'
import { game as chaseButterfly } from './chase-butterfly'
import { game as littleTrain } from './little-train'
import { game as whackMole } from './whack-mole'
import { game as frogLilypads } from './frog-lilypads'
import { game as mazePath } from './maze-path'
import { game as lightDots } from './light-dots'
import { game as flipMemory } from './flip-memory'
import { game as shadowMatch } from './shadow-match'
import { game as copyPattern } from './copy-pattern'

export const GAMES: GameDefinition[] = [
  findBug, twinCards, puzzleGap, fishDirection, torchSearch,
  stripeBalloon, fogStar, bubbleStripes, moonShapes,
  chaseButterfly, littleTrain, whackMole, frogLilypads,
  mazePath, lightDots, flipMemory, shadowMatch, copyPattern,
]

export function getGame(id: string): GameDefinition | undefined {
  return GAMES.find(g => g.id === id)
}
