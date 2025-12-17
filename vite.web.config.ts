import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { resolve } from 'path';

export default defineConfig({
  plugins: [vue()],
  root: 'src/web/client',
  build: {
    outDir: resolve(__dirname, 'dist/web'),
    emptyDirOnBuild: true,
  },
  server: {
    proxy: {
      '/api': 'http://localhost:3000',
    },
  },
});
