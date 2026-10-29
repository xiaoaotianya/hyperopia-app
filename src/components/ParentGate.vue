<script setup lang="ts">
import { ref } from 'vue'
import { createRng, randInt } from '../core/random'
import { markParentOk } from '../core/parentAuth'

const emit = defineEmits<{ pass: [] }>()
const rng = createRng(Date.now())
const a = ref(0)
const b = ref(0)
const answer = ref('')
const wrong = ref(false)

function newQuestion() {
  a.value = randInt(rng, 11, 39)
  b.value = randInt(rng, 11, 39)
  answer.value = ''
}
newQuestion()

function submit() {
  if (Number(answer.value) === a.value + b.value) {
    markParentOk()
    emit('pass')
  } else {
    wrong.value = true
    newQuestion()
  }
}
</script>

<template>
  <form class="gate" @submit.prevent="submit">
    <h2>家长验证</h2>
    <p class="hint">请回答下面的问题以进入家长区</p>
    <p class="question">{{ a }} + {{ b }} = ?</p>
    <input v-model="answer" class="answer" type="text" inputmode="numeric" pattern="[0-9]*" maxlength="3" aria-label="答案" autocomplete="off" />
    <p v-if="wrong" class="wrong">答案不对，换一道题再试试</p>
    <button type="submit" class="ok">确定</button>
  </form>
</template>

<style scoped>
.gate {
  max-width: 420px; margin: 32px auto; padding: 24px; border-radius: var(--radius);
  background: var(--surface); display: flex; flex-direction: column; align-items: center; gap: 12px;
}
h2 { margin: 0; }
.hint { margin: 0; color: var(--muted); }
.question { font-size: 40px; font-weight: 700; margin: 8px 0; }
.answer {
  width: 160px; height: 64px; font-size: 32px; text-align: center; border: 2px solid var(--line);
  border-radius: 16px; background: var(--bg); color: var(--text);
}
.wrong { color: #b0603a; margin: 0; }
.ok {
  min-width: 160px; min-height: 56px; border: none; border-radius: 16px; background: var(--primary);
  color: var(--on-primary); font: inherit; font-size: 22px; font-weight: 700; cursor: pointer;
}
</style>
