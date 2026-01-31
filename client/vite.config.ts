import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import wasm from 'vite-plugin-wasm'

export default defineConfig({
  plugins: [wasm(), react()],
  build: {
    target: 'esnext',
  },
  optimizeDeps: {
    exclude: ['@automerge/automerge-wasm'],
  },
  worker: {
    format: 'es',
    plugins: () => [wasm()],
  },
  server: {
    proxy: {
      '/ws': {
        target: 'ws://localhost:3000',
        ws: true,
      },
    },
  },
})
