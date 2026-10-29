<script setup lang="ts">
withDefaults(defineProps<{ variant?: 'primary' | 'accent' | 'soft'; size?: 'lg' | 'md' }>(), {
  variant: 'primary',
  size: 'lg',
})
</script>

<template>
  <button type="button" class="big-btn" :class="[variant, size]"><slot /></button>
</template>

<style scoped>
.big-btn {
  display: inline-flex; align-items: center; justify-content: center; gap: 12px;
  min-height: 64px; min-width: 64px; padding: 12px 28px;
  border: none; border-radius: var(--radius); cursor: pointer;
  font: inherit; font-weight: 700; color: var(--on-primary);
  box-shadow: 0 6px 0 rgba(0, 0, 0, 0.12);
  transition: transform 0.12s ease, box-shadow 0.12s ease;
}
.big-btn:active { transform: translateY(4px); box-shadow: 0 2px 0 rgba(0, 0, 0, 0.12); }
.lg { font-size: clamp(22px, 5vw, 32px); min-height: 88px; padding: 16px 36px; }
.md { font-size: 20px; }
.primary { background: var(--primary); }
.accent { background: var(--accent); color: var(--text); }
.soft { background: var(--surface); color: var(--text); }
</style>
