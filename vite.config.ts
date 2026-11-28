/// <reference types="vitest/config" />
import { defineConfig } from 'vite';

// `base` stays at the default ('/') until hosting is decided.
// GitHub Pages would need base: '/TombsPad/'.
export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
  },
});
