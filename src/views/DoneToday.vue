<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import BigButton from '../components/BigButton.vue'
import { store, today } from '../core/store'
import { todayKey } from '../core/date'
import { glassesStreak } from '../core/rewards'
import { isLocked } from '../core/sessionTimer'
import { speak } from '../core/speech'
import { GAMES } from '../games/registry'

const router = useRouter()
const day = today()
const streak = computed(() => glassesStreak(store.days, todayKey()))
// 每完成一个游戏，GameShell 往 gamesPlayed 写一次并发一张贴纸，所以最后 n 张就是今天得到的
const todayStickers = computed(() => {
  const n = day.gamesPlayed.length
  return n > 0 ? store.stickers.slice(-n) : []
})
const canPlayMore = computed(() => GAMES.length > 0 && !isLocked(day.secondsTrained, store.settings.dailyLimitMin))

onMounted(() => speak('今天练完啦！明天再来玩'))
</script>

<template>
  <div class="page done">
    <div class="sun">🌈</div>
    <h1>今天练完啦！明天再来玩～</h1>
    <p class="streak">👓 已经连续戴镜 <b>{{ streak }}</b> 天</p>
    <div v-if="todayStickers.length" class="stickers">
      <span v-for="(s, i) in todayStickers" :key="i">{{ s }}</span>
    </div>
    <BigButton size="md" @click="router.push('/')">🏠 回到首页</BigButton>
    <BigButton v-if="canPlayMore" variant="soft" size="md" @click="router.push('/park')">🎡 还想再玩一个</BigButton>
  </div>
</template>

<style scoped>
.done {
  min-height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: 16px; text-align: center;
}
.sun { font-size: 120px; }
h1 { margin: 0; font-size: clamp(26px, 6vw, 40px); }
.streak { font-size: 24px; margin: 0; }
.streak b { color: var(--primary-dark); font-size: 32px; }
.stickers { display: flex; flex-wrap: wrap; justify-content: center; gap: 12px; font-size: 56px; }
</style>
