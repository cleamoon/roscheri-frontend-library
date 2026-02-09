import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  resolve: {
    alias: {
      'roscheri-frontend-library': resolve(__dirname, 'src/index.ts'),
    },
  },
});
