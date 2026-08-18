import { readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { defineConfig } from 'vite';

const scenesDir = resolve(import.meta.dirname, 'src/scenes');
const sceneInputs = Object.fromEntries(
  readdirSync(scenesDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => [entry.name, resolve(scenesDir, entry.name, 'index.html')]),
);

export default defineConfig({
  root: 'src',
  publicDir: false,
  build: {
    outDir: resolve(import.meta.dirname, 'dist'),
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: resolve(import.meta.dirname, 'src/index.html'),
        ...sceneInputs,
      },
    },
  },
});
