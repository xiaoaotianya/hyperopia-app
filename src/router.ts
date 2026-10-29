import { createRouter, createWebHashHistory } from 'vue-router'
import { store, today } from './core/store'
import { isLocked } from './core/sessionTimer'
import { isParentOk } from './core/parentAuth'
import { getGame } from './games/registry'
import KidHome from './views/KidHome.vue'
import TodayPlan from './views/TodayPlan.vue'
import GamePark from './views/GamePark.vue'
import GameRunner from './views/GameRunner.vue'
import StickerWall from './views/StickerWall.vue'
import DoneToday from './views/DoneToday.vue'

export const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: '/', component: KidHome },
    { path: '/today', component: TodayPlan },
    { path: '/park', component: GamePark },
    { path: '/play/:id', name: 'play', component: GameRunner },
    { path: '/stickers', component: StickerWall },
    { path: '/done', component: DoneToday },
    // /parent 本身渲染家长门，通过后显示菜单
    { path: '/parent', component: () => import('./views/parent/ParentHome.vue') },
    { path: '/parent/checkin', component: () => import('./views/parent/Checkin.vue'), meta: { parent: true } },
    { path: '/parent/progress', component: () => import('./views/parent/Progress.vue'), meta: { parent: true } },
    { path: '/parent/settings', component: () => import('./views/parent/Settings.vue'), meta: { parent: true } },
    { path: '/parent/calibration', component: () => import('./views/parent/Calibration.vue'), meta: { parent: true } },
    { path: '/parent/disclaimer', component: () => import('./views/parent/Disclaimer.vue'), meta: { parent: true } },
    { path: '/parent/acuity', component: () => import('./views/parent/Acuity.vue'), meta: { parent: true } },
    { path: '/parent/acuity/test', component: () => import('./views/parent/AcuityTest.vue'), meta: { parent: true } },
    { path: '/parent/observe', component: () => import('./views/parent/Observe.vue'), meta: { parent: true } },
    { path: '/parent/visits', component: () => import('./views/parent/Visits.vue'), meta: { parent: true } },
    { path: '/parent/report', component: () => import('./views/parent/Report.vue'), meta: { parent: true } },
    { path: '/:pathMatch(.*)*', redirect: '/' },
  ],
})

router.beforeEach(to => {
  if (to.name === 'play') {
    const day = today()
    if (isLocked(day.secondsTrained, store.settings.dailyLimitMin)) return '/done'
    if (!day.glassesOn) return '/'
    if (!getGame(String(to.params.id))) return '/today'
  }
  if (to.meta.parent && !isParentOk()) return { path: '/parent', query: { next: to.fullPath } }
})
