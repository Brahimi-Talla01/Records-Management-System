import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

/**
 * Règle locale « no-raw-colors » — garde-fou du design system.
 *
 * Interdit dans le code :
 *  - les classes de palette Tailwind brutes (`bg-blue-500`, `text-red-600`…)
 *  - les couleurs arbitraires (`bg-[#fff]`)
 *  - la prop JSX `color` (la couleur vient de `currentColor`, via une classe token)
 *
 * Les couleurs autorisées sont les tokens définis dans `src/styles/index.css`
 * (`bg-primary`, `text-error`, `border-border`…).
 */
const PALETTE =
  /(?:bg|text|border|ring|from|to|via|fill|stroke|divide|placeholder|outline|shadow|accent|caret|decoration)-(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-\d{2,3}/
const ARBITRARY_HEX = /\[#[0-9a-fA-F]{3,8}\]/

const noRawColors = {
  meta: {
    type: 'problem',
    docs: { description: 'Interdit les couleurs codées en dur (design system)' },
    schema: [],
    messages: {
      palette:
        "Classe de couleur brute « {{value}} ». Utilisez un token (ex. bg-primary, text-error, border-border).",
      hex: "Couleur codée en dur « {{value}} ». Utilisez un token du design system.",
      colorProp:
        "La prop « color » est interdite : colorez l'icône via une classe token (ex. className=\"text-primary-foreground\").",
    },
  },
  create(context) {
    const check = (node, value) => {
      if (typeof value !== 'string') return
      if (PALETTE.test(value)) {
        context.report({ node, messageId: 'palette', data: { value } })
      } else if (ARBITRARY_HEX.test(value)) {
        context.report({ node, messageId: 'hex', data: { value } })
      }
    }
    return {
      Literal(node) {
        check(node, node.value)
      },
      TemplateElement(node) {
        check(node, node.value?.raw)
      },
      JSXAttribute(node) {
        if (node.name?.name === 'color') {
          context.report({ node, messageId: 'colorProp' })
        }
      },
    }
  },
}

export default defineConfig([
  globalIgnores(['dist', 'src/lib/schema']),
  {
    files: ['**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs['recommended-latest'],
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
      parserOptions: {
        ecmaVersion: 'latest',
        ecmaFeatures: { jsx: true },
        sourceType: 'module',
      },
    },
    plugins: {
      local: { rules: { 'no-raw-colors': noRawColors } },
    },
    rules: {
      'no-unused-vars': ['error', { varsIgnorePattern: '^[A-Z_]', argsIgnorePattern: '^[A-Z_]' }],
      'local/no-raw-colors': 'error',
    },
  },
  {
    // E2E Playwright + config : environnement Node (process, Buffer, __dirname…).
    files: ['e2e/**/*.{js,jsx}', 'playwright.config.js'],
    languageOptions: {
      globals: { ...globals.node },
    },
  },
])
