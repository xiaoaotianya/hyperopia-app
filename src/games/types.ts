import type { Component } from 'vue'
import type { Category } from '../core/dailyPlan'

export interface GameContext {
  arcminToPx(arcmin: number): number
  pxPerDegree(): number
  speak(text: string): void
  playCorrect(): void
  playWrong(): void
}

export interface GameDefinition {
  id: string
  name: string
  category: Category
  icon: string
  voiceIntro: string
  durationSec: number
  levels: number                 // 最大等级（含）
  primaryMetric: { label: string; unit: string; fromLevel(level: number): number }
  component: Component           // props: { level, ctx }  emits: trial(correct)
}

export const CATEGORY_NAMES: Record<Category, string> = {
  fine: '看得细', contrast: '看得清', 'eye-move': '眼睛灵', 'hand-eye': '手眼巧',
}

export const CATEGORY_ICONS: Record<Category, string> = {
  fine: '🔍', contrast: '🌫️', 'eye-move': '👀', 'hand-eye': '✋',
}
