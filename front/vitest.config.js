import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  test: {
    environment: 'node',
    include: ['src/tests/**/*.test.js'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json-summary'],
      include: ['src/composables/useGraph*.js', 'src/graph/**/*.js'],
      // Worker 只传递浏览器消息；同一几何核心由下列布局回归直接覆盖。
      exclude: ['src/graph/layout.worker.js'],
      thresholds: {
        lines: 85,
        functions: 85,
        branches: 75,
        statements: 85
      }
    }
  }
})
