<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import BigButton from '../components/BigButton.vue'
import GlassesTree from '../components/GlassesTree.vue'
import StickerBurst from '../components/StickerBurst.vue'
import { store, today } from '../core/store'
import { todayKey } from '../core/date'
import { speak } from '../core/speech'
import { badgeSticker, badgeStreak, badgeUpdate, treeState } from '../core/wear'

const router = useRouter()
const day = today()
const todayStr = todayKey()
const glassesOn = computed(() => day.glassesOn)

// ---- 戴镜小树 ----
const tree = computed(() => treeState(store.days))
const SEEN_KEY = 'hyperopia.treeSeenLeaves'
const growFrom = (() => {
  try { const v = localStorage.getItem(SEEN_KEY); return v === null ? 0 : Number(v) || 0 } catch { return Infinity }
})()
try { localStorage.setItem(SEEN_KEY, String(tree.value.leaves)) } catch { /* 无存储时不播放生长动画 */ }

function talkTree() {
  const { leaves } = tree.value
  speak(leaves ? `小树有 ${leaves} 片叶子啦！每天戴好眼镜，小树就会长新叶子。` : '这是一棵小芽。每天戴好眼镜，它就会长出叶子哦！')
}

// ---- 晚上提醒家长记录戴镜 ----
const showWearBanner = new Date().getHours() >= 18 && !store.days[todayStr]?.wear

// ---- 眼镜小勇士贴纸 ----
const badge = ref<number | null>(null)
function checkBadges(): number[] {
  const r = badgeUpdate(store.meta.lastBadgeStreak ?? 0, badgeStreak(store.days, todayStr))
  for (const b of r.award) store.stickers.push(badgeSticker(b))
  store.meta.lastBadgeStreak = r.next
  return r.award
}

onMounted(() => {
  const name = store.profile.nickname
  const award = checkBadges()
  if (award.length) {
    const top = award[award.length - 1]
    badge.value = top
    speak(`${name}，你已经连续 ${top} 天好好戴眼镜啦！送你一枚眼镜小勇士贴纸！`)
    return
  }
  speak(glassesOn.value ? `${name}，我们开始玩游戏吧！` : `${name}，你好！今天戴好眼镜了吗？`)
})

function confirmGlasses() {
  day.glassesOn = true
  router.push('/today')
}
</script>

<template>
  <div class="page home" :class="{ 'has-banner': showWearBanner }">
    <nav class="corner">
      <button type="button" class="chip" aria-label="贴纸墙" @click="router.push('/stickers')">🌟</button>
      <button type="button" class="chip small" aria-label="家长" @click="router.push('/parent')">家长 🔒</button>
    </nav>

    <button v-if="showWearBanner" type="button" class="wear-banner" @click="router.push('/parent')">
      家长：记录今天戴镜情况 👓
    </button>

    <div class="hero">
      <div class="who">
        <div class="avatar">{{ store.profile.avatar }}</div>
        <div class="name">{{ store.profile.nickname }}</div>
      </div>
      <button type="button" class="tree" aria-label="戴镜小树" @click="talkTree">
        <GlassesTree :leaves="tree.leaves" :flowers="tree.flowers" :fruits="tree.fruits" :grow-from="growFrom" />
        <span class="tree-count" aria-hidden="true">🍃 {{ tree.leaves }}</span>
      </button>
    </div>

    <template v-if="!glassesOn">
      <p class="ask">👓 今天戴好眼镜了吗？</p>
      <BigButton variant="accent" @click="confirmGlasses">家长确认：戴好了 👓</BigButton>
    </template>
    <template v-else>
      <BigButton @click="router.push('/today')">▶ 开始今天的游戏</BigButton>
      <BigButton variant="soft" size="md" @click="router.push('/park')">🎡 游戏乐园</BigButton>
    </template>

    <StickerBurst v-if="badge !== null" sticker="🏅" @close="badge = null" />
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
.wear-banner {
  position: absolute; top: 92px; left: 50%; transform: translateX(-50%); width: calc(100% - 32px); max-width: 480px;
  min-height: 56px; padding: 8px 16px; text-align: center;
  border: none; border-radius: var(--radius); background: #f6e6c4; color: #6b4a14;
  font: inherit; font-size: 18px; font-weight: 700; cursor: pointer;
}
.home.has-banner { padding-top: 164px; }
.hero { display: flex; align-items: center; justify-content: center; flex-wrap: wrap; gap: 8px 24px; }
.who { display: flex; flex-direction: column; align-items: center; }
.avatar {
  width: 140px; height: 140px; border-radius: 50%; background: var(--surface); display: flex;
  align-items: center; justify-content: center; font-size: 92px; box-shadow: 0 6px 0 var(--surface-2);
}
.name { margin-top: 12px; font-size: 32px; font-weight: 700; }
.tree {
  position: relative; width: 190px; padding: 0; border: none; background: none; cursor: pointer;
  -webkit-tap-highlight-color: transparent;
}
.tree-count {
  position: absolute; right: 4px; bottom: 2px; padding: 2px 10px; border-radius: 999px;
  background: var(--surface); font-size: 18px; font-weight: 700; color: var(--primary-dark);
}
.ask { margin: 8px 0 0; font-size: clamp(26px, 6vw, 36px); font-weight: 700; text-align: center; }
@media (max-width: 380px) {
  .avatar { width: 112px; height: 112px; font-size: 72px; }
  .tree { width: 160px; }
}
</style>
