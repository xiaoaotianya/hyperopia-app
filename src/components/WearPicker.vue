<script setup lang="ts">
import { computed } from 'vue'
import { store } from '../core/store'
import type { WearLevel } from '../core/storage'
import { WEAR_LABELS } from '../core/wear'

const props = defineProps<{ date: string }>()
const emit = defineEmits<{ change: [level: WearLevel] }>()

const OPTIONS: { level: WearLevel; icon: string }[] = [
  { level: 'full', icon: '👓' },
  { level: 'most', icon: '🙂' },
  { level: 'less', icon: '😐' },
  { level: 'none', icon: '🚫' },
]
const current = computed(() => store.days[props.date]?.wear)

function pick(level: WearLevel) {
  if (!store.days[props.date]) store.days[props.date] = { glassesOn: false, secondsTrained: 0, gamesPlayed: [], plan: [] }
  store.days[props.date].wear = level
  emit('change', level)
}
</script>

<template>
  <div class="wear-picker" role="radiogroup" aria-label="戴镜情况">
    <button
      v-for="o in OPTIONS"
      :key="o.level"
      type="button"
      role="radio"
      class="opt"
      :class="[o.level, { sel: current === o.level }]"
      :aria-checked="current === o.level"
      :data-level="o.level"
      @click="pick(o.level)"
    >
      <span class="icon" aria-hidden="true">{{ o.icon }}</span>
      <span class="label">{{ WEAR_LABELS[o.level] }}</span>
    </button>
  </div>
</template>

<style scoped>
.wear-picker { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 8px; }
.opt {
  min-height: 84px; min-width: 0; display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: 4px; padding: 8px 4px; border: 3px solid transparent; border-radius: 16px; background: var(--bg);
  color: var(--text); font: inherit; font-size: 16px; cursor: pointer;
  transition: background-color 0.15s ease, border-color 0.15s ease;
}
.icon { font-size: 30px; line-height: 1; }
.label { white-space: nowrap; }
.opt.sel { font-weight: 700; }
.opt.full.sel { border-color: var(--wear-full); background: var(--wear-full-bg); }
.opt.most.sel { border-color: var(--wear-most); background: var(--wear-most-bg); }
.opt.less.sel { border-color: var(--wear-less); background: var(--wear-less-bg); }
.opt.none.sel { border-color: var(--wear-none); background: var(--wear-none-bg); }
.opt:focus-visible { outline: 3px solid var(--accent); outline-offset: 2px; }
</style>
