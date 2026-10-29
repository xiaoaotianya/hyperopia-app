<script setup lang="ts">
import { useRouter } from 'vue-router'
const props = withDefaults(defineProps<{ title: string; back?: string; backLabel?: string }>(), {
  back: '/',
  backLabel: '🏠',
})
const router = useRouter()
</script>

<template>
  <header class="page-header">
    <button type="button" class="back" :aria-label="'返回'" @click="router.push(props.back)">{{ props.backLabel }}</button>
    <h1>{{ props.title }}</h1>
    <span class="spacer"><slot /></span>
  </header>
</template>

<style scoped>
.page-header { display: flex; align-items: center; gap: 12px; margin-bottom: 16px; }
.back {
  min-width: 64px; min-height: 64px; padding: 0 12px; border: none; border-radius: var(--radius);
  background: var(--surface); font: inherit; font-size: 26px; color: var(--text); cursor: pointer;
}
h1 { flex: 1; margin: 0; font-size: clamp(22px, 5vw, 30px); text-align: center; }
.spacer { min-width: 64px; display: flex; justify-content: flex-end; }
</style>
