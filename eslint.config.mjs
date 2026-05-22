// @ts-check
import js from '@eslint/js';
import importX from 'eslint-plugin-import-x';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  // Global ignores
  {
    ignores: [
      'node_modules/**',
      '**/node_modules/**',
      '**/dist/**',
      '.turbo/**',
      '**/.turbo/**',
      'coverage/**',
      'build/**',
      '.next/**',
      'infra/cdk/cdk.out/**',
    ],
  },

  // Base JS recommended rules for all files
  js.configs.recommended,

  // TypeScript strict rules for TS/TSX files (without type-checking)
  ...tseslint.configs.strict.map((config) => ({
    ...config,
    files: ['**/*.ts', '**/*.tsx', '**/*.mts', '**/*.cts'],
  })),

  // Import ordering for all JS/TS files
  {
    files: ['**/*.ts', '**/*.tsx', '**/*.mts', '**/*.cts', '**/*.js', '**/*.mjs', '**/*.cjs'],
    plugins: {
      'import-x': importX,
    },
    rules: {
      'import-x/order': [
        'error',
        {
          groups: ['builtin', 'external', 'internal', 'parent', 'sibling', 'index'],
          'newlines-between': 'always',
          alphabetize: {
            order: 'asc',
            caseInsensitive: true,
          },
        },
      ],
      'import-x/no-duplicates': 'error',
    },
  },

  // TypeScript-specific rule overrides (non-type-aware)
  {
    files: ['**/*.ts', '**/*.tsx', '**/*.mts', '**/*.cts'],
    rules: {
      // Allow underscore-prefixed unused variables (standard convention for required but unused params)
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
      // Prefer explicit types on exported functions (per coding standards)
      '@typescript-eslint/explicit-function-return-type': [
        'warn',
        {
          allowExpressions: true,
          allowTypedFunctionExpressions: true,
        },
      ],
      // Disallow any (per coding standards)
      '@typescript-eslint/no-explicit-any': 'error',
    },
  },

  // Browser globals for web app source files
  {
    files: ['apps/web/src/**/*.js', 'apps/web/src/**/*.ts', 'apps/web/src/**/*.tsx'],
    languageOptions: {
      globals: {
        window: 'readonly',
        document: 'readonly',
        navigator: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly',
        fetch: 'readonly',
        URL: 'readonly',
        console: 'readonly',
        localStorage: 'readonly',
        sessionStorage: 'readonly',
        HTMLElement: 'readonly',
        Event: 'readonly',
        FormData: 'readonly',
        FileReader: 'readonly',
        Blob: 'readonly',
        File: 'readonly',
        alert: 'readonly',
        confirm: 'readonly',
      },
    },
  },

  // CommonJS config files (babel, metro, tailwind, postcss) — Node.js globals are valid
  {
    files: ['**/*.config.js', '**/babel.config.js', '**/metro.config.js', '**/postcss.config.js'],
    languageOptions: {
      globals: {
        module: 'readonly',
        require: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        exports: 'readonly',
      },
    },
  },

  // Relaxed rules for test files — test assertions and mocks often require unsafe patterns
  {
    files: ['**/*.test.ts', '**/*.test.tsx', '**/*.spec.ts', '**/*.spec.tsx', '**/tests/**/*.ts'],
    rules: {
      '@typescript-eslint/no-non-null-assertion': 'off',
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
    },
  },
);
