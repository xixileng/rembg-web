import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueJsx from '@vitejs/plugin-vue-jsx'
import { viteStaticCopy } from 'vite-plugin-static-copy';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue(), vueJsx(), viteStaticCopy({
    targets: [
      {
        src: 'node_modules/onnxruntime-web/dist/*.wasm',
        dest: '.'
      }
    ]
  }),],
  base: '/rembg-web/',
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
})
