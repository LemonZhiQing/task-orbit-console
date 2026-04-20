import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src')
    }
  },
  server: {
    port: 5173,
    proxy: {
      '/admin_api': {
        target: 'http://localhost:6005',
        changeOrigin: true
      },
      '/api': {
        target: 'http://127.0.0.1:6005',
        changeOrigin: true
      }
    }
  },
  build: {
    outDir: path.resolve(__dirname, '/dist'),
    emptyOutDir: true
  }
})