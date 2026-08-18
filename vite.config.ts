import { readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { defineConfig } from 'vite';
import { recordingsPlugin } from './scripts/recordings-plugin.mjs';

const scenesDir = resolve(import.meta.dirname, 'src/scenes');
const sceneInputs = Object.fromEntries(
  readdirSync(scenesDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => [entry.name, resolve(scenesDir, entry.name, 'index.html')]),
);

export default defineConfig({
  root: 'src',
  publicDir: false,
  server: { host: 'localhost' },
  plugins: [recordingsPlugin(import.meta.dirname)],
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
