import { cpSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const args = process.argv.slice(2).filter((arg) => arg !== '--');
const [nnn, ...slugParts] = args;

if (!nnn || slugParts.length === 0) {
  console.error('Usage: npm run new -- 002 pricing-model');
  process.exit(1);
}

if (!/^\d{3}$/.test(nnn)) {
  console.error('Scene number must be three digits, e.g. 002');
  process.exit(1);
}

const slug = slugParts
  .join('-')
  .toLowerCase()
  .replace(/[^a-z0-9-]+/g, '-');
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const template = resolve(root, 'src/scenes/_template');
const dest = resolve(root, 'src/scenes', `${nnn}-${slug}`);

if (!existsSync(template)) {
  console.error('Missing src/scenes/_template');
  process.exit(1);
}

if (existsSync(dest)) {
  console.error(`Exists: src/scenes/${nnn}-${slug}`);
  process.exit(1);
}

cpSync(template, dest, { recursive: true });
console.log(`created src/scenes/${nnn}-${slug}`);
