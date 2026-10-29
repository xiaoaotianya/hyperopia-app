import { createApp } from 'vue'
import './styles.css'
import App from './App.vue'
import { router } from './router'
import { store } from './core/store'
import { requestPersist } from './core/backup'

createApp(App).use(router).mount('#app')

// 申请持久化存储（spec §7），结果记录到 meta.persisted
requestPersist().then(r => { store.meta.persisted = r })
