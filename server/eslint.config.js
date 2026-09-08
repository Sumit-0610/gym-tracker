'use strict';

const js = require('@eslint/js');
const globals = require('globals');
const prettier = require('eslint-config-prettier');

module.exports = [
  { ignores: ['node_modules/', 'data/', 'coverage/'] },
  js.configs.recommended,
  {
    files: ['**/*.js'],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: 'commonjs',
      globals: { ...globals.node },
    },
    rules: {
      // `next` is required in an Express error handler even when unused.
      'no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_|^next$', varsIgnorePattern: '^_' },
      ],
      eqeqeq: ['error', 'smart'],
      'no-var': 'error',
      'prefer-const': 'error',
    },
  },
  {
    files: ['test/**/*.js'],
    languageOptions: { globals: { ...globals.node } },
  },
  prettier, // turn off rules that conflict with Prettier — Prettier owns style
];
