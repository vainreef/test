const fs = require('node:fs');
const path = require('node:path');
const {
  createLicenseKey,
  ensureKeyPair,
} = require('../shared/license.cjs');

const root = path.resolve(__dirname, '..');
const privateKeyPath = path.join(root, 'secrets', 'license-private-key.pem');
const publicKeyPath = path.join(root, 'shared', 'license-public-key.pem');
const [command, ...args] = process.argv.slice(2);

function option(name, fallback = undefined) {
  const index = args.indexOf(`--${name}`);
  return index >= 0 ? args[index + 1] || fallback : fallback;
}

if (command === 'keys') {
  const result = ensureKeyPair({ privateKeyPath, publicKeyPath });
  console.log(result.created ? 'Created a new Ed25519 license key pair.' : 'License key pair already exists.');
  console.log(`Public key:  ${publicKeyPath}`);
  console.log(`Private key: ${privateKeyPath}`);
  console.log('Keep the private key offline. Only the public key ships with the app.');
  process.exit(0);
}

if (command === 'generate') {
  if (!fs.existsSync(privateKeyPath)) {
    console.error('Private key missing. Run: npm run license:keys');
    process.exit(1);
  }

  const days = Number(option('days', '365'));
  const licenseId = option('id');
  const privateKey = fs.readFileSync(privateKeyPath, 'utf8');
  const token = createLicenseKey({ privateKey, days, licenseId });
  console.log(token);
  console.log(`Plan: Pro | Expires: ${days > 0 ? `${days} days` : 'never'}`);
  process.exit(0);
}

console.log('Usage:');
console.log('  npm run license:keys');
console.log('  npm run license:generate -- --days 365');
