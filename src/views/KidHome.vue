<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import BigButton from '../components/BigButton.vue'
import { store, today } from '../core/store'
import { speak } from '../core/speech'

const router = useRouter()
const day = today()
const glassesOn = computed(() => day.glassesOn)

onMounted(() => {
  const name = store.profile.nickname
  speak(glassesOn.value ? `${name}，我们开始玩游戏吧！` : `${name}，你好！今天戴好眼镜了吗？`)
})

function confirmGlasses() {
  day.glassesOn = true
  router.push('/today')
}
</script>

<template>
  <div class="page home">
    <nav class="corner">
      <button type="button" class="chip" aria-label="贴纸墙" @click="router.push('/stickers')">🌟</button>
      <button type="button" class="chip small" aria-label="家长" @click="router.push('/parent')">家长 🔒</button>
    </nav>

    <div class="hero">
      <div class="avatar">{{ store.profile.avatar }}</div>
      <div class="name">{{ store.profile.nickname }}</div>
    </div>

    <template v-if="!glassesOn">
      <p class="ask">👓 今天戴好眼镜了吗？</p>
      <BigButton variant="accent" @click="confirmGlasses">家长确认：戴好了 👓</BigButton>
    </template>
    <template v-else>
      <BigButton @click="router.push('/today')">▶ 开始今天的游戏</BigButton>
      <BigButton variant="soft" size="md" @click="router.push('/park')">🎡 游戏乐园</BigButton>
    </template>
  </div>
</template>

<style scoped>
.home {
  min-height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: 20px; position: relative; padding-top: 96px;
}
.corner { position: absolute; top: 16px; right: 16px; display: flex; gap: 12px; }
.chip {
  min-width: 64px; min-height: 64px; padding: 0 14px; border: none; border-radius: var(--radius);
  background: var(--surface); color: var(--text); font-size: 30px; cursor: pointer;
}
.chip.small { font-size: 16px; color: var(--muted); }
.hero { display: flex; flex-direction: column; align-items: center; }
.avatar {
  width: 160px; height: 160px; border-radius: 50%; background: var(--surface); display: flex;
  align-items: center; justify-content: center; font-size: 104px; box-shadow: 0 6px 0 var(--surface-2);
}
.name { margin-top: 12px; font-size: 32px; font-weight: 700; }
.ask { margin: 8px 0 0; font-size: clamp(26px, 6vw, 36px); font-weight: 700; text-align: center; }
</style>
