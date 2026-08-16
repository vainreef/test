import test from 'node:test';
import assert from 'node:assert/strict';
import { generateKeyPairSync } from 'node:crypto';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { createLicenseKey, verifyLicenseKey } = require('../shared/license.cjs');

test('a signed Pro license verifies with its public key', () => {
  const { privateKey, publicKey } = generateKeyPairSync('ed25519');
  const token = createLicenseKey({ privateKey, days: 30, licenseId: 'QT-TEST-001' });
  const result = verifyLicenseKey(token, publicKey);
  assert.equal(result.valid, true);
  assert.equal(result.payload.id, 'QT-TEST-001');
  assert.equal(result.payload.plan, 'pro');
});

test('tampering with a signed license is detected', () => {
  const { privateKey, publicKey } = generateKeyPairSync('ed25519');
  const token = createLicenseKey({ privateKey, days: 30 });
  const [prefix, payload, signature] = token.split('.');
  const changedSignature = `${signature[0] === 'A' ? 'B' : 'A'}${signature.slice(1)}`;
  const tampered = `${prefix}.${payload}.${changedSignature}`;
  const result = verifyLicenseKey(tampered, publicKey);
  assert.equal(result.valid, false);
  assert.equal(result.reason, 'bad-signature');
});

test('an expired signed license is rejected', () => {
  const { privateKey, publicKey } = generateKeyPairSync('ed25519');
  const token = createLicenseKey({ privateKey, days: 1 });
  const result = verifyLicenseKey(token, publicKey, Date.now() + 3 * 24 * 60 * 60 * 1000);
  assert.equal(result.valid, false);
  assert.equal(result.reason, 'expired');
});
