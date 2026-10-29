<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { speak } from '../core/speech'

const props = withDefaults(defineProps<{ seconds?: number }>(), { seconds: 20 })
const emit = defineEmits<{ close: [] }>()
const left = ref(props.seconds)
let timer: number | undefined

onMounted(() => {
  speak('看看远处的东西，眨眨眼睛')
  timer = window.setInterval(() => {
    if (document.hidden) return
    left.value--
    if (left.value <= 0) { clearInterval(timer); emit('close') }
  }, 1000)
})
onBeforeUnmount(() => clearInterval(timer))
</script>

<template>
  <div class="break" role="dialog" aria-label="休息一下">
    <div class="owl" aria-hidden="true">
      <div class="ear l" /><div class="ear r" />
      <div class="eye l"><div class="lid" /><div class="pupil" /></div>
      <div class="eye r"><div class="lid" /><div class="pupil" /></div>
      <div class="beak" />
    </div>
    <p class="msg">看看远处，眨眨眼睛～</p>
    <p class="count">{{ left }}</p>
    <button type="button" class="skip" @click="emit('close')">家长跳过</button>
  </div>
</template>

<style scoped>
.break {
  position: fixed; inset: 0; z-index: 40; display: flex; flex-direction: column;
  align-items: center; justify-content: center; gap: 12px; background: #cfe3ef; color: #2f4a5a;
}
.owl { position: relative; width: 200px; height: 220px; border-radius: 100px 100px 90px 90px; background: #a9805c; }
.ear { position: absolute; top: -18px; width: 0; height: 0; border-left: 22px solid transparent; border-right: 22px solid transparent; border-bottom: 40px solid #a9805c; }
.ear.l { left: 22px; } .ear.r { right: 22px; }
.eye { position: absolute; top: 46px; width: 70px; height: 70px; border-radius: 50%; background: #fbf3e0; overflow: hidden; }
.eye.l { left: 24px; } .eye.r { right: 24px; }
.pupil { position: absolute; left: 22px; top: 22px; width: 26px; height: 26px; border-radius: 50%; background: #3b2a1e; }
.lid { position: absolute; inset: 0; z-index: 1; background: #8c6646; transform: translateY(-100%); animation: blink 2s ease-in-out infinite; }
.beak { position: absolute; left: 88px; top: 120px; width: 0; height: 0; border-left: 12px solid transparent; border-right: 12px solid transparent; border-top: 22px solid #f2a541; }
@keyframes blink { 0%, 70%, 100% { transform: translateY(-100%); } 82% { transform: translateY(0); } }
.msg { font-size: clamp(24px, 6vw, 36px); font-weight: 700; margin: 16px 0 0; text-align: center; padding: 0 16px; }
.count { font-size: 48px; font-weight: 700; margin: 0; }
.skip {
  position: absolute; right: 16px; bottom: 16px; min-height: 44px; padding: 8px 14px;
  border: none; border-radius: 12px; background: rgba(255, 255, 255, 0.35); color: #2f4a5a; font: inherit; font-size: 14px;
}
</style>
