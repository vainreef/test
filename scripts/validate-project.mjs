import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(root, '..');
const required = [
  'package.json',
  'main.cjs',
  'preload.cjs',
  'src/index.html',
  'src/renderer.js',
  'src/styles.css',
  'src/transform.mjs',
  'shared/license.cjs',
  'Package.appxmanifest',
  'Assets/StoreLogo.png',
];

const missing = required.filter((file) => !fs.existsSync(path.join(projectRoot, file)));
if (missing.length) {
  console.error(`Missing project files:\n${missing.join('\n')}`);
  process.exit(1);
}

const manifest = fs.readFileSync(path.join(projectRoot, 'Package.appxmanifest'), 'utf8');
if (!manifest.includes('Windows.FullTrustApplication')) {
  console.error('Package manifest is missing the full-trust Electron entry point.');
  process.exit(1);
}

console.log(`Project validation passed (${required.length} required files).`);
