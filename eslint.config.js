import js from '@eslint/js';
import { defineConfig, globalIgnores } from 'eslint/config';
import prettier from 'eslint-config-prettier';
import tseslint from 'typescript-eslint';

const pureCoreMessage =
  'src/core must stay pure and deterministic: no DOM, Web Audio, timers, or clock. See .kiro/steering/tech.md.';

export default defineConfig(
  globalIgnores(['dist/', 'coverage/', '.kiro/']),
  js.configs.recommended,
  tseslint.configs.recommended,
  {
    // Enforces the architecture rules in .kiro/steering/tech.md for the pure core.
    files: ['src/core/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        { patterns: [{ group: ['three', 'three/*'], message: pureCoreMessage }] },
      ],
      'no-restricted-globals': [
        'error',
        ...[
          'window',
          'document',
          'navigator',
          'AudioContext',
          'OfflineAudioContext',
          'requestAnimationFrame',
          'setTimeout',
          'setInterval',
          'performance',
          'crypto',
          'Date',
        ].map((name) => ({ name, message: pureCoreMessage })),
      ],
      'no-restricted-properties': [
        'error',
        {
          object: 'Math',
          property: 'random',
          message: 'Use a seeded generator whose seed is part of the state.',
        },
      ],
    },
  },
  prettier,
);
