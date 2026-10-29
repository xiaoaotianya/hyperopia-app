/// <reference types="vitest" />
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  base: './',
  plugins: [
    vue(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: '视觉小游戏乐园',
        short_name: '视觉乐园',
        lang: 'zh-CN',
        display: 'fullscreen',
        orientation: 'any',
        background_color: '#f3efe6',
        theme_color: '#f3efe6',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
        ],
      },
    }),
  ],
  server: { host: true },
  test: { environment: 'jsdom', include: ['tests/**/*.test.ts'] },
})
