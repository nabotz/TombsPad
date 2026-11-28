import { defineConfig } from 'vite'
export default defineConfig({
  root: '.',
  build: { target: 'es2020' },
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['tests/**/*.test.ts', 'tests/**/*.test.js']
  }
})
