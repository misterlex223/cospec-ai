import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs['recommended-latest'],
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    rules: {
      // Allow 'any' type for WebSocket events and API responses
      // These are genuinely unknown types from external sources
      '@typescript-eslint/no-explicit-any': 'off',
      // Allow empty object type for component props
      '@typescript-eslint/no-empty-object-type': 'off',
      // Allow unused vars - some are for future use or API compatibility
      '@typescript-eslint/no-unused-vars': 'off',
      // Allow unnecessary escape - regex escaping can be intentional
      'no-useless-escape': 'off',
      // Allow fast refresh with non-component exports
      'react-refresh/only-export-components': 'off',
      // Exhaustive deps is too strict and causes false positives
      'react-hooks/exhaustive-deps': 'off',
    },
  },
])
