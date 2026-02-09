import globals from 'globals';
import tseslint from 'typescript-eslint';
import stylistic from '@stylistic/eslint-plugin';

export default tseslint.config(
  ...tseslint.configs.recommended,
  {
    files: ['src/**/*.{js,mjs,cjs,ts,mts,cts}'],
    plugins: {
      '@stylistic': stylistic,
    },
    languageOptions: { globals: globals.browser },
    rules: {
      '@stylistic/indent': ['error', 2],
      '@stylistic/semi': ['error', 'never'],
      '@stylistic/quotes': ['error', 'single'],
    },
  },
);
