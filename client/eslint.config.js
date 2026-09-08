import js from '@eslint/js';
import globals from 'globals';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import prettier from 'eslint-config-prettier';

export default [
  { ignores: ['dist/', 'node_modules/', 'coverage/'] },
  js.configs.recommended,
  {
    files: ['src/**/*.{js,jsx}'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      parserOptions: { ecmaFeatures: { jsx: true } },
      globals: { ...globals.browser },
    },
    plugins: { react, 'react-hooks': reactHooks },
    settings: { react: { version: 'detect' } },
    rules: {
      ...reactHooks.configs.recommended.rules,
      // Just enough of eslint-plugin-react to see JSX as variable usage
      // (<Tag/> counts as using `Tag`) and catch the common JSX mistakes.
      'react/jsx-uses-vars': 'error',
      'react/jsx-uses-react': 'off', // new JSX transform — React import not needed
      'react/jsx-key': 'error',
      'react/no-unknown-property': 'error',
      'no-unused-vars': [
        'error',
        { varsIgnorePattern: '^[A-Z_]', argsIgnorePattern: '^_' },
      ],
      eqeqeq: ['error', 'smart'],
      'no-var': 'error',
      'prefer-const': 'error',
    },
  },
  {
    files: ['**/*.test.{js,jsx}'],
    languageOptions: { globals: { ...globals.node } },
  },
  prettier,
];
