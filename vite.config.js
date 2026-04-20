import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const taskServerPort = env.TASK_SERVER_PORT || '6005'
  const taskServerTarget = `http://127.0.0.1:${taskServerPort}`

  return {
    plugins: [vue()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, 'src')
      }
    },
    server: {
      port: 5173,
      proxy: {
        '/api': {
          target: taskServerTarget,
          changeOrigin: true
        }
      }
    },
    build: {
      outDir: path.resolve(__dirname, 'dist'),
      emptyOutDir: true
    }
  }
})
