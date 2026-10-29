<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import GameShell from '../components/GameShell.vue'
import { getGame } from '../games/registry'

const route = useRoute()
const router = useRouter()
const def = computed(() => getGame(String(route.params.id)))
if (!def.value) router.replace('/today')
</script>

<template>
  <GameShell v-if="def" :key="def.id" :def="def" @done="router.replace('/today')" />
</template>
